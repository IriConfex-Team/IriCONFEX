import { describe, expect, it } from 'vitest'
import { formatColones } from './formatColones'

describe('formatColones', () => {
  it('pega ₡ y separa miles con espacio, sin decimales', () => {
    expect(formatColones(10000)).toBe('₡10 000')
    expect(formatColones(1234567)).toBe('₡1 234 567')
    expect(formatColones(950)).toBe('₡950')
  })

  it('redondea al colón', () => {
    expect(formatColones(18499.6)).toBe('₡18 500')
  })
})
