/*
  Warnings:

  - A unique constraint covering the columns `[telaId,clave]` on the table `color` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clave` to the `color` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "color_telaId_tipo_nombre_key";

-- AlterTable
ALTER TABLE "color" ADD COLUMN     "archivoOrigen" VARCHAR(120),
ADD COLUMN     "clave" VARCHAR(80) NOT NULL,
ADD COLUMN     "disenos" INTEGER,
ADD COLUMN     "mostrarImagenes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "variante" VARCHAR(20);

-- CreateIndex
CREATE UNIQUE INDEX "color_telaId_clave_key" ON "color"("telaId", "clave");
