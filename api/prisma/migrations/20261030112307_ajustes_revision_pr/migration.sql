/*
  Warnings:

  - Changed the type of `horario` on the `negocio` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "campo_medida" ADD COLUMN     "provisional" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "categoria" ADD COLUMN     "resumen" JSONB;

-- AlterTable
ALTER TABLE "negocio" DROP COLUMN "horario",
ADD COLUMN     "horario" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "opcion" ADD COLUMN     "etiqueta" VARCHAR(80),
ADD COLUMN     "muestraInfoLocal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tallaId" INTEGER;

-- AddForeignKey
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_tallaId_fkey" FOREIGN KEY ("tallaId") REFERENCES "talla"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "opcion" DROP CONSTRAINT "opcion_una_sola_referencia";
ALTER TABLE "opcion" ADD CONSTRAINT "opcion_una_sola_referencia"
  CHECK (num_nonnulls("perfilId", "telaId", "tipoPiezaId", "grupoTallaId", "tallaId", "adicionalId") <= 1);
