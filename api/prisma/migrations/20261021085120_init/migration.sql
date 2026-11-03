-- CreateEnum
CREATE TYPE "TipoRegla" AS ENUM ('VISIBILIDAD', 'FIJACION');

-- CreateEnum
CREATE TYPE "PiezaPaso" AS ENUM ('GENERAL', 'SUPERIOR', 'INFERIOR', 'ADICIONAL');

-- CreateEnum
CREATE TYPE "TipoColor" AS ENUM ('LISO', 'ESTAMPADO');

-- CreateEnum
CREATE TYPE "EstadoPrecio" AS ENUM ('CONFIRMADO', 'ESTIMADO', 'PENDIENTE');

-- CreateEnum
CREATE TYPE "RolBase" AS ENUM ('SUPERIOR', 'INFERIOR', 'COMPLETA');

-- CreateEnum
CREATE TYPE "Seccion" AS ENUM ('SUPERIOR', 'INFERIOR');

-- CreateEnum
CREATE TYPE "ModalidadTalla" AS ENUM ('UNIVERSAL', 'MEDIDA', 'PRESENCIAL');

-- CreateEnum
CREATE TYPE "Entrega" AS ENUM ('RETIRO', 'ENVIO');

-- CreateEnum
CREATE TYPE "RolPieza" AS ENUM ('SUPERIOR', 'INFERIOR');

-- CreateEnum
CREATE TYPE "ColorOrigen" AS ENUM ('CATALOGO', 'PERSONALIZADO', 'SIN_PREFERENCIA');

-- CreateTable
CREATE TABLE "categoria" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "imagenUrl" VARCHAR(255),
    "versionConfiguracion" VARCHAR(20) NOT NULL,
    "encabezado" JSONB,
    "ilustracion" JSONB,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil" (
    "id" SERIAL NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "permiteMedida" BOOLEAN NOT NULL DEFAULT false,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paso" (
    "id" SERIAL NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "nota" VARCHAR(255),
    "presentacion" VARCHAR(20) NOT NULL DEFAULT 'tarjetas',
    "pieza" "PiezaPaso" NOT NULL DEFAULT 'GENERAL',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "obligatorio" BOOLEAN NOT NULL DEFAULT true,
    "reiniciaAlCambiar" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "paso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opcion" (
    "id" SERIAL NOT NULL,
    "pasoId" INTEGER NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" VARCHAR(255),
    "imagenUrl" VARCHAR(255),
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "perfilId" INTEGER,
    "telaId" INTEGER,
    "tipoPiezaId" INTEGER,
    "grupoTallaId" INTEGER,
    "adicionalId" INTEGER,

    CONSTRAINT "opcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regla" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(10) NOT NULL,
    "tipo" "TipoRegla" NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "pasoId" INTEGER NOT NULL,
    "descripcion" VARCHAR(255),
    "mensaje" VARCHAR(160),
    "condicion" JSONB NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "regla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regla_opcion_afectada" (
    "reglaId" INTEGER NOT NULL,
    "opcionId" INTEGER NOT NULL,

    CONSTRAINT "regla_opcion_afectada_pkey" PRIMARY KEY ("reglaId","opcionId")
);

-- CreateTable
CREATE TABLE "tela" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "descripcion" VARCHAR(160),
    "imagenUrl" VARCHAR(255),
    "factorConsumo" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "soloHolgada" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tela_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color" (
    "id" SERIAL NOT NULL,
    "telaId" INTEGER NOT NULL,
    "tipo" "TipoColor" NOT NULL,
    "codigoCatalogo" VARCHAR(20),
    "nombre" VARCHAR(60) NOT NULL,
    "familia" VARCHAR(30),
    "tonoHex" CHAR(7),
    "miniaturaUrl" VARCHAR(255),
    "ofrecer" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipo_pieza" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "rolBase" "RolBase" NOT NULL,

    CONSTRAINT "tipo_pieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adicional" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,

    CONSTRAINT "adicional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "columna_precio" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "columna_precio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precio_pieza" (
    "id" SERIAL NOT NULL,
    "tipoPiezaId" INTEGER NOT NULL,
    "telaId" INTEGER NOT NULL,
    "columnaPrecioId" INTEGER NOT NULL,
    "montoCrc" INTEGER,
    "estado" "EstadoPrecio" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "precio_pieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recargo" (
    "id" SERIAL NOT NULL,
    "adicionalId" INTEGER NOT NULL,
    "columnaPrecioId" INTEGER NOT NULL,
    "montoCrc" INTEGER,
    "estado" "EstadoPrecio" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "recargo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupo_talla" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,

    CONSTRAINT "grupo_talla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talla" (
    "id" SERIAL NOT NULL,
    "grupoTallaId" INTEGER NOT NULL,
    "columnaPrecioId" INTEGER NOT NULL,
    "codigo" VARCHAR(12) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "talla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_grupo_talla" (
    "perfilId" INTEGER NOT NULL,
    "grupoTallaId" INTEGER NOT NULL,

    CONSTRAINT "perfil_grupo_talla_pkey" PRIMARY KEY ("perfilId","grupoTallaId")
);

-- CreateTable
CREATE TABLE "campo_medida" (
    "id" SERIAL NOT NULL,
    "categoriaId" INTEGER NOT NULL,
    "codigo" VARCHAR(40) NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "seccion" "Seccion" NOT NULL,
    "soloConManga" BOOLEAN NOT NULL DEFAULT false,
    "instruccion" VARCHAR(255) NOT NULL DEFAULT '',
    "rutaIlustracion" VARCHAR(255),
    "unidad" VARCHAR(5) NOT NULL DEFAULT 'cm',
    "valorMin" DECIMAL(5,1) NOT NULL,
    "valorMax" DECIMAL(5,1) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "campo_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talla_medida_ref" (
    "tallaId" INTEGER NOT NULL,
    "campoMedidaId" INTEGER NOT NULL,
    "valorCm" DECIMAL(5,1) NOT NULL,

    CONSTRAINT "talla_medida_ref_pkey" PRIMARY KEY ("tallaId","campoMedidaId")
);

-- CreateTable
CREATE TABLE "negocio" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "direccion" VARCHAR(200) NOT NULL,
    "senas" VARCHAR(200),
    "horario" VARCHAR(200) NOT NULL,
    "whatsapp" VARCHAR(8) NOT NULL,
    "urlMapa" VARCHAR(255),

    CONSTRAINT "negocio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "galeria_foto" (
    "id" SERIAL NOT NULL,
    "perfilId" INTEGER NOT NULL,
    "estiloEtiqueta" VARCHAR(60) NOT NULL,
    "imagenUrl" VARCHAR(255) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "galeria_foto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aviso_privacidad" (
    "id" SERIAL NOT NULL,
    "version" VARCHAR(10) NOT NULL,
    "texto" TEXT NOT NULL,
    "urlPolitica" VARCHAR(255) NOT NULL,
    "vigenteDesde" DATE NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "aviso_privacidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_eliminacion" (
    "id" SERIAL NOT NULL,
    "fechaEjecucion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cantidadEliminada" INTEGER NOT NULL,

    CONSTRAINT "registro_eliminacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provincia" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,

    CONSTRAINT "provincia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canton" (
    "id" SERIAL NOT NULL,
    "provinciaId" INTEGER NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,

    CONSTRAINT "canton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distrito" (
    "id" SERIAL NOT NULL,
    "cantonId" INTEGER NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,

    CONSTRAINT "distrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud" (
    "id" UUID NOT NULL,
    "referencia" VARCHAR(16) NOT NULL,
    "perfilId" INTEGER NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nombreCliente" VARCHAR(60) NOT NULL,
    "telefono" CHAR(8) NOT NULL,
    "selecciones" JSONB NOT NULL,
    "modalidadTalla" "ModalidadTalla" NOT NULL,
    "columnaPrecioId" INTEGER,
    "entrega" "Entrega" NOT NULL,
    "precioEstimadoCrc" INTEGER,
    "avisoId" INTEGER NOT NULL,
    "avisoAceptadoEn" TIMESTAMP(3) NOT NULL,
    "versionConfiguracion" VARCHAR(20) NOT NULL,
    "mensajeWhatsapp" TEXT NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_pieza" (
    "id" SERIAL NOT NULL,
    "solicitudId" UUID NOT NULL,
    "rol" "RolPieza" NOT NULL,
    "tipoPiezaId" INTEGER NOT NULL,
    "telaId" INTEGER NOT NULL,
    "tallaId" INTEGER,
    "colorId" INTEGER,
    "colorOrigen" "ColorOrigen" NOT NULL DEFAULT 'SIN_PREFERENCIA',
    "colorTexto" VARCHAR(60),
    "tonoHex" CHAR(7),
    "montoCrc" INTEGER,

    CONSTRAINT "solicitud_pieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_adicional" (
    "solicitudId" UUID NOT NULL,
    "adicionalId" INTEGER NOT NULL,
    "montoCrc" INTEGER,

    CONSTRAINT "solicitud_adicional_pkey" PRIMARY KEY ("solicitudId","adicionalId")
);

-- CreateTable
CREATE TABLE "solicitud_medida" (
    "id" SERIAL NOT NULL,
    "solicitudId" UUID NOT NULL,
    "campoMedidaId" INTEGER NOT NULL,
    "valorCm" DECIMAL(5,1) NOT NULL,

    CONSTRAINT "solicitud_medida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitud_envio" (
    "solicitudId" UUID NOT NULL,
    "distritoId" INTEGER NOT NULL,
    "senas" VARCHAR(200) NOT NULL,

    CONSTRAINT "solicitud_envio_pkey" PRIMARY KEY ("solicitudId")
);

-- CreateIndex
CREATE UNIQUE INDEX "categoria_codigo_key" ON "categoria"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "perfil_categoriaId_codigo_key" ON "perfil"("categoriaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "paso_categoriaId_codigo_key" ON "paso"("categoriaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "opcion_pasoId_codigo_key" ON "opcion"("pasoId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tela_codigo_key" ON "tela"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "color_telaId_tipo_nombre_key" ON "color"("telaId", "tipo", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_pieza_codigo_key" ON "tipo_pieza"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "adicional_codigo_key" ON "adicional"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "columna_precio_codigo_key" ON "columna_precio"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "precio_pieza_tipoPiezaId_telaId_columnaPrecioId_key" ON "precio_pieza"("tipoPiezaId", "telaId", "columnaPrecioId");

-- CreateIndex
CREATE UNIQUE INDEX "recargo_adicionalId_columnaPrecioId_key" ON "recargo"("adicionalId", "columnaPrecioId");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_talla_codigo_key" ON "grupo_talla"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "talla_grupoTallaId_codigo_key" ON "talla"("grupoTallaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "campo_medida_categoriaId_codigo_key" ON "campo_medida"("categoriaId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "aviso_privacidad_version_key" ON "aviso_privacidad"("version");

-- CreateIndex
CREATE UNIQUE INDEX "provincia_nombre_key" ON "provincia"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "canton_provinciaId_nombre_key" ON "canton"("provinciaId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "distrito_cantonId_nombre_key" ON "distrito"("cantonId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_referencia_key" ON "solicitud"("referencia");

-- CreateIndex
CREATE INDEX "solicitud_fechaVencimiento_idx" ON "solicitud"("fechaVencimiento");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_pieza_solicitudId_rol_key" ON "solicitud_pieza"("solicitudId", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_medida_solicitudId_campoMedidaId_key" ON "solicitud_medida"("solicitudId", "campoMedidaId");

-- AddForeignKey
ALTER TABLE "perfil" ADD CONSTRAINT "perfil_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paso" ADD CONSTRAINT "paso_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_pasoId_fkey" FOREIGN KEY ("pasoId") REFERENCES "paso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfil"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_telaId_fkey" FOREIGN KEY ("telaId") REFERENCES "tela"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_tipoPiezaId_fkey" FOREIGN KEY ("tipoPiezaId") REFERENCES "tipo_pieza"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_grupoTallaId_fkey" FOREIGN KEY ("grupoTallaId") REFERENCES "grupo_talla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_adicionalId_fkey" FOREIGN KEY ("adicionalId") REFERENCES "adicional"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regla" ADD CONSTRAINT "regla_pasoId_fkey" FOREIGN KEY ("pasoId") REFERENCES "paso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regla_opcion_afectada" ADD CONSTRAINT "regla_opcion_afectada_reglaId_fkey" FOREIGN KEY ("reglaId") REFERENCES "regla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regla_opcion_afectada" ADD CONSTRAINT "regla_opcion_afectada_opcionId_fkey" FOREIGN KEY ("opcionId") REFERENCES "opcion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color" ADD CONSTRAINT "color_telaId_fkey" FOREIGN KEY ("telaId") REFERENCES "tela"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precio_pieza" ADD CONSTRAINT "precio_pieza_tipoPiezaId_fkey" FOREIGN KEY ("tipoPiezaId") REFERENCES "tipo_pieza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precio_pieza" ADD CONSTRAINT "precio_pieza_telaId_fkey" FOREIGN KEY ("telaId") REFERENCES "tela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "precio_pieza" ADD CONSTRAINT "precio_pieza_columnaPrecioId_fkey" FOREIGN KEY ("columnaPrecioId") REFERENCES "columna_precio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recargo" ADD CONSTRAINT "recargo_adicionalId_fkey" FOREIGN KEY ("adicionalId") REFERENCES "adicional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recargo" ADD CONSTRAINT "recargo_columnaPrecioId_fkey" FOREIGN KEY ("columnaPrecioId") REFERENCES "columna_precio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talla" ADD CONSTRAINT "talla_grupoTallaId_fkey" FOREIGN KEY ("grupoTallaId") REFERENCES "grupo_talla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talla" ADD CONSTRAINT "talla_columnaPrecioId_fkey" FOREIGN KEY ("columnaPrecioId") REFERENCES "columna_precio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_grupo_talla" ADD CONSTRAINT "perfil_grupo_talla_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfil_grupo_talla" ADD CONSTRAINT "perfil_grupo_talla_grupoTallaId_fkey" FOREIGN KEY ("grupoTallaId") REFERENCES "grupo_talla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campo_medida" ADD CONSTRAINT "campo_medida_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talla_medida_ref" ADD CONSTRAINT "talla_medida_ref_tallaId_fkey" FOREIGN KEY ("tallaId") REFERENCES "talla"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talla_medida_ref" ADD CONSTRAINT "talla_medida_ref_campoMedidaId_fkey" FOREIGN KEY ("campoMedidaId") REFERENCES "campo_medida"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galeria_foto" ADD CONSTRAINT "galeria_foto_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canton" ADD CONSTRAINT "canton_provinciaId_fkey" FOREIGN KEY ("provinciaId") REFERENCES "provincia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distrito" ADD CONSTRAINT "distrito_cantonId_fkey" FOREIGN KEY ("cantonId") REFERENCES "canton"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_columnaPrecioId_fkey" FOREIGN KEY ("columnaPrecioId") REFERENCES "columna_precio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_avisoId_fkey" FOREIGN KEY ("avisoId") REFERENCES "aviso_privacidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_pieza" ADD CONSTRAINT "solicitud_pieza_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_pieza" ADD CONSTRAINT "solicitud_pieza_tipoPiezaId_fkey" FOREIGN KEY ("tipoPiezaId") REFERENCES "tipo_pieza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_pieza" ADD CONSTRAINT "solicitud_pieza_telaId_fkey" FOREIGN KEY ("telaId") REFERENCES "tela"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_pieza" ADD CONSTRAINT "solicitud_pieza_tallaId_fkey" FOREIGN KEY ("tallaId") REFERENCES "talla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_pieza" ADD CONSTRAINT "solicitud_pieza_colorId_fkey" FOREIGN KEY ("colorId") REFERENCES "color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_adicional" ADD CONSTRAINT "solicitud_adicional_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_adicional" ADD CONSTRAINT "solicitud_adicional_adicionalId_fkey" FOREIGN KEY ("adicionalId") REFERENCES "adicional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_medida" ADD CONSTRAINT "solicitud_medida_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_medida" ADD CONSTRAINT "solicitud_medida_campoMedidaId_fkey" FOREIGN KEY ("campoMedidaId") REFERENCES "campo_medida"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_envio" ADD CONSTRAINT "solicitud_envio_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitud"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitud_envio" ADD CONSTRAINT "solicitud_envio_distritoId_fkey" FOREIGN KEY ("distritoId") REFERENCES "distrito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Restricciones que Prisma no expresa
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_una_sola_referencia"
  CHECK (num_nonnulls("perfilId", "telaId", "tipoPiezaId", "grupoTallaId", "adicionalId") <= 1);
ALTER TABLE "campo_medida" ADD CONSTRAINT "campo_medida_rango" CHECK ("valorMin" < "valorMax");
ALTER TABLE "precio_pieza" ADD CONSTRAINT "precio_pieza_monto" CHECK ("montoCrc" IS NULL OR "montoCrc" >= 0);
ALTER TABLE "recargo" ADD CONSTRAINT "recargo_monto" CHECK ("montoCrc" IS NULL OR "montoCrc" >= 0);
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_telefono_cr" CHECK ("telefono" ~ '^[0-9]{8}$');
ALTER TABLE "solicitud" ADD CONSTRAINT "solicitud_vencimiento" CHECK ("fechaVencimiento" > "fechaHora");
ALTER TABLE "color" ADD CONSTRAINT "color_tono_hex" CHECK ("tonoHex" IS NULL OR "tonoHex" ~ '^#[0-9A-Fa-f]{6}$');

-- Seguridad por filas (RNF-05): sin políticas, la API REST de Supabase no puede leer ni escribir
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables
           WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;