import { describe, expect, it } from 'vitest'
import { cargarConfiguracion, ErrorConfiguracion } from './esquema'
import { elegir, ErrorMotor, evaluarFlujo, iniciarSeleccion, textoEncabezado, validarSeleccion } from './motor'

// Configuración abstracta: el motor no sabe nada de prendas.
const configuracion = cargarConfiguracion({
  version: 1,
  categoria: { id: 'cat', nombre: 'Categoría' },
  encabezado: { paso: 'a', plantilla: 'Para {opcion}' },
  pasos: [
    {
      id: 'a',
      nombre: 'Paso A',
      presentacion: 'tarjetas',
      reiniciaAlCambiar: true,
      opciones: [
        { id: 'a1', nombre: 'A uno' },
        { id: 'a2', nombre: 'A dos' },
        { id: 'a3', nombre: 'A tres' },
      ],
    },
    {
      id: 'b',
      nombre: 'Paso B',
      presentacion: 'tarjetas',
      opciones: [
        { id: 'b1', nombre: 'B uno' },
        { id: 'b2', nombre: 'B dos' },
        { id: 'b3', nombre: 'B tres' },
      ],
    },
    {
      id: 'c',
      nombre: 'Paso C',
      presentacion: 'si-no',
      opciones: [
        { id: 'si', nombre: 'Sí' },
        { id: 'no', nombre: 'No' },
      ],
    },
    {
      id: 'd',
      nombre: 'Paso D',
      presentacion: 'tarjetas',
      opciones: [
        { id: 'd1', nombre: 'D uno' },
        { id: 'd2', nombre: 'D dos' },
      ],
    },
  ],
  reglas: [
    // b3 solo con a2 o a3
    {
      tipo: 'visibilidad',
      codigo: 'V1',
      objetivo: { paso: 'b', opciones: ['b3'] },
      cuando: { paso: 'a', en: ['a2', 'a3'] },
    },
    // c solo con b1 o b2
    { tipo: 'visibilidad', codigo: 'V2', objetivo: { paso: 'c' }, cuando: { paso: 'b', en: ['b1', 'b2'] } },
    // a3 fija b en b2
    { tipo: 'fijacion', codigo: 'F1', paso: 'b', opcion: 'b2', cuando: { paso: 'a', en: ['a3'] }, mensaje: 'Fijo' },
    // regla hacia atrás: b1 solo si d es d1 (d viene después)
    {
      tipo: 'visibilidad',
      codigo: 'V3',
      objetivo: { paso: 'b', opciones: ['b1'] },
      cuando: { paso: 'd', en: ['d1'] },
      mensaje: 'B uno no va con D dos',
    },
  ],
})

const ids = (configuracionEstado: ReturnType<typeof evaluarFlujo>, paso: string) =>
  configuracionEstado.pasos.find((e) => e.paso.id === paso)?.opciones.map((o) => o.id)

describe('cargarConfiguracion', () => {
  it('rechaza referencias a pasos u opciones que no existen', () => {
    expect(() =>
      cargarConfiguracion({
        version: 1,
        categoria: { id: 'x', nombre: 'X' },
        pasos: [{ id: 'p', nombre: 'P', presentacion: 'tarjetas', opciones: [{ id: 'o', nombre: 'O' }] }],
        reglas: [{ tipo: 'visibilidad', codigo: 'R', objetivo: { paso: 'p' }, cuando: { paso: 'q', en: ['z'] } }],
      }),
    ).toThrow(ErrorConfiguracion)
  })

  it('exige opciones «si» y «no» en pasos sí / no', () => {
    expect(() =>
      cargarConfiguracion({
        version: 1,
        categoria: { id: 'x', nombre: 'X' },
        pasos: [{ id: 'p', nombre: 'P', presentacion: 'si-no', opciones: [{ id: 'o', nombre: 'O' }] }],
        reglas: [],
      }),
    ).toThrow(/sí \/ no/)
  })

  it('rechaza un tipo de regla no aprobado', () => {
    expect(() =>
      cargarConfiguracion({
        version: 1,
        categoria: { id: 'x', nombre: 'X' },
        pasos: [{ id: 'p', nombre: 'P', presentacion: 'tarjetas', opciones: [{ id: 'o', nombre: 'O' }] }],
        reglas: [{ tipo: 'precio', codigo: 'R', paso: 'p' }],
      }),
    ).toThrow(ErrorConfiguracion)
  })
})

describe('motor de selección', () => {
  it('filtra opciones por valores permitidos de pasos anteriores', () => {
    let s = elegir(configuracion, iniciarSeleccion(configuracion), 'a', 'a1').seleccion
    expect(ids(evaluarFlujo(configuracion, s), 'b')).toEqual(['b1', 'b2'])
    s = elegir(configuracion, {}, 'a', 'a2').seleccion
    expect(ids(evaluarFlujo(configuracion, s), 'b')).toContain('b3')
  })

  it('oculta un paso cuya condición no se cumple', () => {
    const pasos = (s: Record<string, string>) => evaluarFlujo(configuracion, s).pasos.map((e) => e.paso.id)
    expect(pasos({ a: 'a2', b: 'b1' })).toEqual(['a', 'b', 'c', 'd'])
    expect(pasos({ a: 'a2', b: 'b3' })).toEqual(['a', 'b', 'd'])
  })

  it('aplica la fijación con su mensaje', () => {
    const { seleccion } = elegir(configuracion, {}, 'a', 'a3')
    expect(seleccion.b).toBe('b2')
    const b = evaluarFlujo(configuracion, seleccion).pasos.find((e) => e.paso.id === 'b')
    expect(b?.fijada).toEqual({ opcion: 'b2', codigo: 'F1', mensaje: 'Fijo' })
    expect(() => elegir(configuracion, seleccion, 'b', 'b1')).toThrow(ErrorMotor)
  })

  it('al cambiar un paso con reinicio borra todo lo posterior', () => {
    let s = elegir(configuracion, {}, 'a', 'a1').seleccion
    s = elegir(configuracion, s, 'b', 'b1').seleccion
    s = elegir(configuracion, s, 'c', 'si').seleccion
    const r = elegir(configuracion, s, 'a', 'a3')
    expect(r.reiniciado).toBe(true)
    expect(r.seleccion).toEqual({ a: 'a3', b: 'b2' })
  })

  it('limpia elecciones posteriores que dejan de aplicar y lo informa', () => {
    let s = elegir(configuracion, {}, 'a', 'a2').seleccion
    s = elegir(configuracion, s, 'b', 'b1').seleccion
    s = elegir(configuracion, s, 'c', 'si').seleccion
    s = elegir(configuracion, s, 'd', 'd1').seleccion
    // b3 oculta c: se borra su respuesta y se informa; d sigue válida.
    const r = elegir(configuracion, s, 'b', 'b3')
    expect(r.reiniciado).toBe(false)
    expect(r.limpiados).toEqual(['c'])
    expect(r.seleccion).toEqual({ a: 'a2', b: 'b3', d: 'd1' })
  })

  it('una regla hacia atrás no restringe mientras el paso posterior no tiene valor', () => {
    const s = elegir(configuracion, {}, 'a', 'a1').seleccion
    expect(ids(evaluarFlujo(configuracion, s), 'b')).toContain('b1')
  })

  it('una elección posterior que contradice una anterior queda como conflicto, sin borrarla', () => {
    let s = elegir(configuracion, {}, 'a', 'a1').seleccion
    s = elegir(configuracion, s, 'b', 'b1').seleccion
    s = elegir(configuracion, s, 'c', 'no').seleccion
    s = elegir(configuracion, s, 'd', 'd2').seleccion
    const estado = evaluarFlujo(configuracion, s)
    expect(s.b).toBe('b1')
    expect(estado.conflictos).toEqual([{ paso: 'b', codigo: 'V3', mensaje: 'B uno no va con D dos' }])
    expect(estado.completo).toBe(false)
    // Al volver a B, b1 ya no se ofrece.
    expect(ids(estado, 'b')).toEqual(['b2'])
  })

  it('no fija por «única opción» un paso que depende de otro aún sin responder', () => {
    // Sin «a», b3 queda en duda (depende de a); no se puede concluir que b sea b1 o b2.
    expect(iniciarSeleccion(configuracion)).toEqual({})
    const b = evaluarFlujo(configuracion, {}).pasos.find((e) => e.paso.id === 'b')
    expect(b?.fijada).toBeNull()
  })

  it('no deja elegir una opción no disponible', () => {
    expect(() => elegir(configuracion, { a: 'a1' }, 'b', 'b3')).toThrow(ErrorMotor)
    expect(() => elegir(configuracion, {}, 'x', 'y')).toThrow(ErrorMotor)
  })

  it('arma el texto del encabezado desde la configuración', () => {
    expect(textoEncabezado(configuracion, {})).toBe('Categoría')
    expect(textoEncabezado(configuracion, { a: 'a2' })).toBe('Para A dos')
  })
})

describe('validarSeleccion (revalidación en el servidor)', () => {
  it('acepta una selección completa y válida', () => {
    expect(validarSeleccion(configuracion, { a: 'a1', b: 'b1', c: 'si', d: 'd1' })).toEqual({ valida: true, errores: [] })
  })

  it('rechaza lo que el navegador no debería haber enviado', () => {
    const { valida, errores } = validarSeleccion(configuracion, { a: 'a1', b: 'b3', c: 'si', d: 'd1', z: 'z' })
    expect(valida).toBe(false)
    expect(errores.map((e) => e.tipo).sort()).toEqual(['paso-desconocido', 'paso-no-aplica', 'regla-incumplida'])
  })

  it('rechaza una fijación cambiada, una regla hacia atrás incumplida y pasos faltantes', () => {
    expect(validarSeleccion(configuracion, { a: 'a3', b: 'b1', c: 'si', d: 'd1' }).errores[0].tipo).toBe('opcion-fijada')
    expect(validarSeleccion(configuracion, { a: 'a1', b: 'b1', c: 'si', d: 'd2' }).errores[0].codigo).toBe('V3')
    expect(validarSeleccion(configuracion, { a: 'a1' }).errores.map((e) => e.tipo)).toEqual(['falta-eleccion', 'falta-eleccion'])
  })
})
