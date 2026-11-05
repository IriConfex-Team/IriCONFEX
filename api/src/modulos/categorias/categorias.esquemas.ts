import { z } from '../../comun/zod.js';

export const CategoriaSchema = z
  .object({
    codigo: z.string().openapi({ example: 'pijamas' }),
    nombre: z.string().openapi({ example: 'Arma tu pijama' }),
    imagenUrl: z.string().nullable().openapi({ example: null }),
  })
  .openapi('Categoria');

export const ListaCategoriasSchema = z
  .object({ categorias: z.array(CategoriaSchema) })
  .openapi('ListaCategorias');

export const ParamsCategoriaSchema = z.object({
  codigo: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/, 'Solo minúsculas, números y guiones (máximo 40 caracteres)')
    .openapi({ example: 'pijamas' }),
});

export type Categoria = z.infer<typeof CategoriaSchema>;
export type ParamsCategoria = z.infer<typeof ParamsCategoriaSchema>;