import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

// CAMBIA ESTA LÍNEA: ruta del pijamas.json del motor, relativa a la carpeta api/
const RUTA_PIJAMAS = '../datos/categorias/pijamas.json';

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });
const DATA = join(process.cwd(), 'prisma', 'data');

function sinBom(t: string): string {
  return t.charCodeAt(0) === 0xfeff ? t.slice(1) : t;
}

function leerTexto(nombre: string): string {
  return sinBom(readFileSync(join(DATA, nombre), 'utf8'));
}

function leerRuta(ruta: string): string {
  return sinBom(readFileSync(resolve(process.cwd(), ruta), 'utf8'));
}

function leerCsv(nombre: string): Record<string, string>[] {
  const lineas = leerTexto(nombre)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '');
  const cols = lineas[0].split(',').map((c) => c.trim());
  return lineas.slice(1).map((l) => {
    const v = l.split(',').map((x) => x.trim());
    return Object.fromEntries(cols.map((c, i) => [c, v[i] ?? '']));
  });
}

const mapa = <T extends { codigo: string; id: number }>(filas: T[]) =>
  new Map(filas.map((f) => [f.codigo, f.id] as [string, number]));

// Valida que cada condición (con sus todas / alguna anidadas) apunte a opciones que existen
function validar(c: any, opciones: Map<string, number>, regla: string): void {
  if (c.todas) return c.todas.forEach((x: any) => validar(x, opciones, regla));
  if (c.alguna) return c.alguna.forEach((x: any) => validar(x, opciones, regla));
  for (const v of c.en) {
    if (!opciones.has(c.paso + ':' + v)) {
      throw new Error('Regla ' + regla + ': no existe la opción ' + c.paso + ':' + v);
    }
  }
}

async function cargarCatalogo() {
  const columnas = new Map<string, number>();
  for (const [i, r] of leerCsv('columnas.csv').entries()) {
    const x = await prisma.columnaPrecio.upsert({
      where: { codigo: r.codigo },
      update: { nombre: r.nombre, orden: i },
      create: { codigo: r.codigo, nombre: r.nombre, orden: i },
    });
    columnas.set(r.codigo, x.id);
  }

  const grupos = new Map<string, number>();
  for (const [i, r] of leerCsv('tallas.csv').entries()) {
    if (!grupos.has(r.grupo)) {
      const g = await prisma.grupoTalla.upsert({
        where: { codigo: r.grupo },
        update: { nombre: r.nombreGrupo },
        create: { codigo: r.grupo, nombre: r.nombreGrupo },
      });
      grupos.set(r.grupo, g.id);
    }
    const grupoTallaId = grupos.get(r.grupo)!;
    const columnaPrecioId = columnas.get(r.columna)!;
    await prisma.talla.upsert({
      where: { grupoTallaId_codigo: { grupoTallaId, codigo: r.talla } },
      update: { columnaPrecioId, orden: i },
      create: { grupoTallaId, columnaPrecioId, codigo: r.talla, orden: i },
    });
  }

  const telas = new Map<string, number>();
  for (const [i, r] of leerCsv('telas.csv').entries()) {
    const datos = {
      nombre: r.nombre,
      factorConsumo: r.factorConsumo,
      soloHolgada: r.soloHolgada === 'true',
      orden: i,
    };
    const x = await prisma.tela.upsert({
      where: { codigo: r.codigo },
      update: datos,
      create: { codigo: r.codigo, ...datos },
    });
    telas.set(r.codigo, x.id);
  }

  const piezas = new Map<string, number>();
  for (const r of leerCsv('piezas.csv')) {
    const rolBase = r.rolBase as 'SUPERIOR' | 'INFERIOR' | 'COMPLETA';
    const x = await prisma.tipoPieza.upsert({
      where: { codigo: r.codigo },
      update: { nombre: r.nombre, rolBase },
      create: { codigo: r.codigo, nombre: r.nombre, rolBase },
    });
    piezas.set(r.codigo, x.id);
  }

  const adicionales = new Map<string, number>();
  for (const r of leerCsv('adicionales.csv')) {
    const x = await prisma.adicional.upsert({
      where: { codigo: r.codigo },
      update: { nombre: r.nombre },
      create: { codigo: r.codigo, nombre: r.nombre },
    });
    adicionales.set(r.codigo, x.id);
  }

  for (const r of leerCsv('precios.csv')) {
    for (const [col, columnaPrecioId] of columnas) {
      const bruto = r[col];
      const montoCrc = bruto === undefined || bruto === '' ? null : Number(bruto);
      const estado = montoCrc === null ? ('PENDIENTE' as const) : ('CONFIRMADO' as const);
      const llave = {
        tipoPiezaId: piezas.get(r.pieza)!,
        telaId: telas.get(r.tela)!,
        columnaPrecioId,
      };
      await prisma.precioPieza.upsert({
        where: { tipoPiezaId_telaId_columnaPrecioId: llave },
        update: { montoCrc, estado },
        create: { ...llave, montoCrc, estado },
      });
    }
  }

  for (const r of leerCsv('recargos.csv')) {
    const llave = {
      adicionalId: adicionales.get(r.adicional)!,
      columnaPrecioId: columnas.get(r.columna)!,
    };
    const montoCrc = Number(r.monto);
    await prisma.recargo.upsert({
      where: { adicionalId_columnaPrecioId: llave },
      update: { montoCrc, estado: 'CONFIRMADO' },
      create: { ...llave, montoCrc, estado: 'CONFIRMADO' },
    });
  }
}

async function cargarMotor() {
  const cfg = JSON.parse(leerRuta(RUTA_PIJAMAS));
  const enl = JSON.parse(leerTexto('enlaces.json'));

  const cat = await prisma.categoria.upsert({
    where: { codigo: cfg.categoria.id },
    update: {
      nombre: cfg.categoria.nombre,
      versionConfiguracion: String(cfg.version),
      ...(cfg.encabezado ? { encabezado: cfg.encabezado } : {}),
    },
    create: {
      codigo: cfg.categoria.id,
      nombre: cfg.categoria.nombre,
      versionConfiguracion: String(cfg.version),
      ...(cfg.encabezado ? { encabezado: cfg.encabezado } : {}),
    },
  });

  // Perfiles (perfiles.csv) y los grupos de talla que usa cada uno
  const grupos = mapa(await prisma.grupoTalla.findMany());
  const perfiles = new Map<string, number>();
  for (const [i, r] of leerCsv('perfiles.csv').entries()) {
    const datos = { nombre: r.nombre, permiteMedida: r.permiteMedida === 'true', orden: i };
    const p = await prisma.perfil.upsert({
      where: { categoriaId_codigo: { categoriaId: cat.id, codigo: r.codigo } },
      update: datos,
      create: { categoriaId: cat.id, codigo: r.codigo, ...datos },
    });
    perfiles.set(r.codigo, p.id);
    for (const g of r.grupos.split('|')) {
      const grupoTallaId = grupos.get(g)!;
      await prisma.perfilGrupoTalla.upsert({
        where: { perfilId_grupoTallaId: { perfilId: p.id, grupoTallaId } },
        update: {},
        create: { perfilId: p.id, grupoTallaId },
      });
    }
  }

  // Campos de medida (campos-medida.csv)
  for (const [i, r] of leerCsv('campos-medida.csv').entries()) {
    const datos = {
      nombre: r.nombre,
      seccion: r.seccion as 'SUPERIOR' | 'INFERIOR',
      soloConManga: r.soloConManga === 'true',
      valorMin: r.min,
      valorMax: r.max,
      orden: i,
    };
    await prisma.campoMedida.upsert({
      where: { categoriaId_codigo: { categoriaId: cat.id, codigo: r.codigo } },
      update: datos,
      create: { categoriaId: cat.id, codigo: r.codigo, ...datos },
    });
  }

  const catalogos: Record<string, Map<string, number>> = {
    perfil: perfiles,
    grupoTalla: grupos,
    tela: mapa(await prisma.tela.findMany()),
    tipoPieza: mapa(await prisma.tipoPieza.findMany()),
    adicional: mapa(await prisma.adicional.findMany()),
  };

  // Pasos y opciones de pijamas.json
  const pasos = new Map<string, number>();
  const opciones = new Map<string, number>();
  for (const [i, p] of cfg.pasos.entries()) {
    const datosPaso = {
      nombre: p.nombre,
      nota: p.nota ?? null,
      presentacion: p.presentacion ?? 'tarjetas',
      reiniciaAlCambiar: p.reiniciaAlCambiar ?? false,
      orden: i + 1,
    };
    const paso = await prisma.paso.upsert({
      where: { categoriaId_codigo: { categoriaId: cat.id, codigo: p.id } },
      update: datosPaso,
      create: { categoriaId: cat.id, codigo: p.id, ...datosPaso },
    });
    pasos.set(p.id, paso.id);

    const tipoCat: string | undefined = enl.pasos[p.id];
    for (const [j, o] of p.opciones.entries()) {
      let idCat: number | null = null;
      if (tipoCat) {
        const clave = enl.alias?.[tipoCat]?.[o.id] ?? o.id;
        const id = catalogos[tipoCat].get(clave);
        if (id === undefined) {
          throw new Error('Sin catálogo para ' + p.id + ':' + o.id + ' (' + clave + ')');
        }
        idCat = id;
      }
      const adicional = enl.adicionales?.[p.id + ':' + o.id];
      const datos = {
        nombre: o.nombre,
        descripcion: o.descripcion ?? null,
        orden: j,
        perfilId: tipoCat === 'perfil' ? idCat : null,
        telaId: tipoCat === 'tela' ? idCat : null,
        tipoPiezaId: tipoCat === 'tipoPieza' ? idCat : null,
        grupoTallaId: tipoCat === 'grupoTalla' ? idCat : null,
        adicionalId: adicional ? catalogos.adicional.get(adicional)! : null,
      };
      const op = await prisma.opcion.upsert({
        where: { pasoId_codigo: { pasoId: paso.id, codigo: o.id } },
        update: datos,
        create: { pasoId: paso.id, codigo: o.id, ...datos },
      });
      opciones.set(p.id + ':' + o.id, op.id);
    }
  }

  // Reglas: los códigos se repiten, así que se reconstruyen todas en cada corrida
  await prisma.regla.deleteMany({ where: { pasoId: { in: [...pasos.values()] } } });
  for (const [i, r] of cfg.reglas.entries()) {
    const fija = r.tipo === 'fijacion';
    const pasoObjetivo: string = fija ? r.paso : r.objetivo.paso;
    const afectadas: string[] = fija ? [r.opcion] : r.objetivo.opciones ?? [];
    validar(r.cuando, opciones, r.codigo);
    const regla = await prisma.regla.create({
      data: {
        codigo: r.codigo,
        tipo: fija ? 'FIJACION' : 'VISIBILIDAD',
        orden: i,
        pasoId: pasos.get(pasoObjetivo)!,
        mensaje: r.mensaje ?? null,
        condicion: r.cuando,
      },
    });
    if (afectadas.length > 0) {
      await prisma.reglaOpcionAfectada.createMany({
        data: afectadas.map((a) => {
          const opcionId = opciones.get(pasoObjetivo + ':' + a);
          if (opcionId === undefined) {
            throw new Error('Regla ' + r.codigo + ': no existe ' + pasoObjetivo + ':' + a);
          }
          return { reglaId: regla.id, opcionId };
        }),
      });
    }
  }
}

async function cargarAviso() {
  const a = JSON.parse(leerTexto('aviso.json'));
  const datos = {
    texto: a.texto,
    urlPolitica: a.urlPolitica,
    vigenteDesde: new Date(a.vigenteDesde),
  };
  await prisma.avisoPrivacidad.upsert({
    where: { version: a.version },
    update: datos,
    create: { version: a.version, ...datos },
  });
}

// Opcional: provincias, cantones y distritos desde data/geo-cr.json
async function cargarGeo() {
  if (!existsSync(join(DATA, 'geo-cr.json'))) {
    console.log('geo-cr.json no existe: se omite la carga geográfica');
    return;
  }
  const g = JSON.parse(leerTexto('geo-cr.json'));
  for (const p of g.provincias) {
    const prov = await prisma.provincia.upsert({
      where: { nombre: p.nombre },
      update: {},
      create: { nombre: p.nombre },
    });
    for (const c of p.cantones) {
      const can = await prisma.canton.upsert({
        where: { provinciaId_nombre: { provinciaId: prov.id, nombre: c.nombre } },
        update: {},
        create: { provinciaId: prov.id, nombre: c.nombre },
      });
      for (const d of c.distritos) {
        await prisma.distrito.upsert({
          where: { cantonId_nombre: { cantonId: can.id, nombre: d } },
          update: {},
          create: { cantonId: can.id, nombre: d },
        });
      }
    }
  }
}

async function main() {
  await cargarCatalogo();
  await cargarMotor();
  await cargarAviso();
  await cargarGeo();
  console.log('Seed completo');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });