/** Une clases condicionales sin dependencias extra. */
export function cx(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(' ')
}
