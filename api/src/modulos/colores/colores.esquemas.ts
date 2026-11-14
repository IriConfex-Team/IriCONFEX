import { z } from 'zod';

export const QueryColoresSchema = z.object({
  tela: z.string().trim().min(1, 'El código de la tela es obligatorio'),
});

export interface ColorItem {
  id: number;
  clave: string;
  tipo: 'LISO' | 'ESTAMPADO';
  variante: string | null;
  codigoCatalogo: string | null;
  nombre: string;
  tonoHex: string | null;
  archivoOrigen: string | null;
  disenos: number | null;
  mostrarImagenes: boolean;
}