import { render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IlustracionPrenda } from './IlustracionPrenda'

const capas: Record<string, string> = {
  '/i/cuerpo.svg':
    '<svg viewBox="0 0 400 480"><g data-rol="silueta-suma"><path id="suma" fill="#fff" d="M0 0h10v10z"/></g>' +
    '<g fill="none" stroke="var(--ilus-line)" data-rol="lineas"><path id="linea" d="M0 0h10"/></g></svg>',
  '/i/escote.svg':
    '<svg viewBox="0 0 400 480"><g data-rol="silueta-resta"><path id="resta" d="M2 0h2v2z"/></g>' +
    '<g data-rol="recortado-por-silueta" onclick="alert(1)"><path id="recorte" d="M1 1h1"/><script>alert(1)</script></g></svg>',
}

afterEach(() => vi.unstubAllGlobals())

describe('IlustracionPrenda', () => {
  it('une sumas y restas en la máscara del color y dibuja las líneas encima', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(capas[url] ?? '', { status: capas[url] ? 200 : 404 })),
    )
    const { container } = render(
      <IlustracionPrenda
        ilustracion={{
          ancho: 400,
          alto: 680,
          piezas: [{ id: 'p', ancho: 400, alto: 480, desplazamiento: 200, archivos: ['/i/cuerpo.svg', '/i/escote.svg', '/i/no-existe.svg'] }],
        }}
      />,
    )
    await waitFor(() => expect(container.querySelector('mask')).not.toBeNull())
    const svg = container.querySelector('svg')!
    expect(svg.getAttribute('viewBox')).toBe('0 0 400 680')
    expect(svg.querySelector('g[transform="translate(0 200)"]')).not.toBeNull()
    expect(svg.querySelector('mask #suma')).not.toBeNull()
    expect(svg.querySelector('mask g[fill="#000"] #resta')).not.toBeNull()
    expect(svg.querySelector('rect[mask]')).not.toBeNull()
    // Las líneas van fuera de la máscara; lo recortado, dentro.
    expect(svg.querySelector('mask #linea')).toBeNull()
    expect(svg.querySelector('g[mask] #recorte')).not.toBeNull()
    // Sin scripts ni manejadores.
    expect(svg.querySelector('script')).toBeNull()
    expect(svg.innerHTML).not.toContain('onclick')
  })

  it('sin ilustración no dibuja nada', () => {
    const { container } = render(<IlustracionPrenda ilustracion={null} />)
    expect(container.firstChild).toBeNull()
  })
})
