# Capas de ilustración · IriConfex (mujer, hombre, niño/niña y bebé)

Lienzo común: `viewBox="0 0 400 480"`. Todas las capas comparten anclajes, así que se superponen sin moverlas.

## Maniquí
`guia/maniqui.svg`: silueta de mujer de referencia (escala 1,55, centro x 200). Cuello, hombros, sisas, busto (y 146), bajo busto (y 196), cintura (y 244) y cadera (y 340) salen de ella. Solo es guía; no se exporta a la app.

## Armado (abajo → arriba)
1. **silueta** (máscara): `silueta-suma` de cuerpo + manga + escote + acabados, menos `silueta-resta` de manga y escote.
2. **color**: rectángulo con `fill: var(--ilus-color)` bajo la máscara.
3. **textura**: patrón de la tela sobre el color (multiplicar en claros; invertido en modo trama en oscuros).
4. cuerpo · 5. manga · 6. escote · 7. botones · 8. aberturas (solo bata) · 9. acabado-ruedo · 10. acabado-manga / acabado-escote: grupos `lineas`, `tapa`, `recortado-por-silueta` y `acabado` en ese orden.

## Ajuste
- `--ajustado`: brush, satín alicrado, resorte, rib acanalado, modal (y sin tela elegida).
- `--holgado`: satín puro (R9).
Cuerpo, manga y acabados de ruedo y manga tienen ambas variantes; escote y botones son comunes.

## Reglas de selección
- Escote con manga de tirantes: usar `escote/redondo--tirantes` o `escote/v--tirantes`; `escote/bralette` siempre va con tirantes.
- Botones a medio pecho: `botones/medio-pecho--redondo` o `--v`, según el escote.
- Acabado ≠ simple: `acabado-ruedo/{acabado}-{largo}`, más `acabado-manga/{acabado}-{manga}` si existe, más `acabado-escote/{acabado}-{escote}` si la manga es de tirantes.

## Variables CSS
- `--ilus-color`: `#hex`, `url(#estampado)` o `#E2DED8` (sin color).
- `--ilus-line`: `#3A3430`, o `#F6F2EC` si la luminancia del color es menor que 0,16.

## Bata (1 pieza) · `mujer/bata/…` · lienzo 400 × 620
Mismos anclajes que la blusa. Capas propias: `cuerpo/{corta|media-pierna|rodilla}--{ajuste}`, `aberturas/{laterales|frente}-{largo}--{ajuste}`, `acabado-ruedo/{acabado}-{largo}--{ajuste}`. Escote, manga, botones y acabados de manga/escote se toman de `mujer/sup/…`.

## Parte inferior · `mujer/inf/…` · lienzo 400 × 600
Cintura en y 40 (= y 240 del lienzo superior; en el conjunto se desplaza 200 hacia abajo y la parte superior se dibuja encima). Capas: `pretina/elastico` (fruncido, sin cordón), `tipo/{pantalon-largo|capri|short}` (bota recta, sin bolsillos), `abertura/lateral-{capri|short}`, `acabado-ruedo/{encaje|repulgo|vuelitos}-short`.

## Bata de salida · `mujer/salida/…` · lienzo 400 × 620
`cuerpo/sobre-rodilla`, `manga/{tres-cuartos|larga}`, `cinta/anudada`, `acabado/encaje-ruedo`, `acabado/encaje-{manga}`, `acabado/vivo-frente`, `acabado/vivo-{manga}`. Usa el mismo `--ilus-color` que la pijama y se muestra al lado del conjunto.

---

# Otros perfiles · hombre, niño/niña y bebé

Mismos lienzos que mujer (superior 400 × 480, inferior 400 × 600 con cintura en y 40) y mismos roles de grupo. Cada perfil tiene su maniquí en `{perfil}/guia/maniqui-sup.svg` y `maniqui-inf.svg`: el hombre está calcado de la silueta de referencia (escala 1,5); el niño (~6 años) se construye con 6 cabezas de alto y el bebé (~6 meses) con 4.

La parte superior tiene largo fijo a la cadera: una sola capa `sup/cuerpo/cadera`. Hay un solo ajuste, así que los nombres no llevan `--ajustado` ni `--holgado`.

## Desfase del conjunto (cuánto baja la parte inferior)
- hombre: 260 (cintura en y 300 del superior)
- nino: 186 (cintura en y 226)
- bebe: 140 (cintura en y 180)

## Hombre · `hombre/…`
- `sup/cuerpo/cadera`, `sup/manga/{sin-manga|corta|larga}`, `sup/escote/{redondo|v|cuello-camisero}` (el cuello camisero trae botonadura completa hasta el ruedo). Sin acabados decorativos.
- `inf/pretina/elastico` (sin cordón), `inf/tipo/{pantalon-largo|capri|short}` (bota recta), `inf/abertura/lateral-{capri|short}`.

## Niño / niña · `nino/…` · Bebé · `bebe/…` (mismas capas)
- `sup/cuerpo/cadera`, `sup/manga/{sin-manga|corta|larga}`, `sup/escote/{redondo|cuello-camisero}`.
- Solo niña: `sup/acabado-ruedo/vuelitos`, `sup/acabado-manga/vuelitos-{sin-manga|corta}` (la manga larga no lleva vuelitos).
- `inf/pretina/elastico`, `inf/tipo/{pantalon-largo|short}`; el pantalón largo siempre lleva `inf/borde/jogger`.
- Solo niña: `inf/acabado-ruedo/vuelitos-short`.

## Guía de medidas · `medidas/{mujer|hombre}/{campo}.svg`
Silueta completa (coordenadas de la imagen de referencia), medida en #6B5B95 de 3 px con puntos en los extremos. En los contornos, la mitad de adelante es continua y la de atrás punteada. Las líneas grises punteadas marcan desde dónde se mide.
Campos: ancho-espalda, contorno-busto, separacion-busto, altura-busto, largo-talle, largo-total, largo-manga, ancho-manga, contorno-cintura, contorno-cadera, altura-cadera, largo-tiro, largo-short.

---

## Optimización y peso
- Todos los SVG pasan por SVGO (multipass, precisión 0,1) conservando `data-capa`, `data-rol`, `viewBox` y las variables `var(--ilus-color)` / `var(--ilus-line)`.
- `vector-effect="non-scaling-stroke"` va en cada `path` con trazo (no se hereda desde el grupo).
- 195 archivos · el más pesado pesa 2,8 KB · total 253 KB. Límite: 200 KB por imagen.
