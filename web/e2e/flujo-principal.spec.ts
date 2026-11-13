import { expect, test, type Page } from '@playwright/test'

const siguiente = (p: Page) => p.getByRole('button', { name: /^(Siguiente|Revisar)$/ })

const elegir = async (p: Page, nombre: string) => {
  await p.getByRole('radio', { name: nombre, exact: true }).click()
  await siguiente(p).click()
}

const entrarAPijamas = async (page: Page) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Diseñar mi pijama' }).click()
  await expect(page.getByRole('heading', { name: '¿Qué quieres diseñar?' })).toBeVisible()
  await page.getByRole('button', { name: /Pijama/i }).click()
}

const simularEnvioExitoso = async (page: Page) => {
  await page.route('**/api/solicitudes', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        referencia: 'IC-E2E12345',
        mensaje: 'Solicitud de cotización IC-E2E12345',
        enlaceWhatsapp: 'https://wa.me/50683413594?text=Hola',
      }),
    })
  })
}

const completarContactoYEnviar = async (page: Page, nombre: string, telefono: string) => {
  await expect(page.getByText('Tus datos')).toBeVisible()
  await page.getByLabel('Nombre').fill(nombre)
  await page.getByLabel('Teléfono').fill(telefono)
  await siguiente(page).click()

  await expect(page.getByText('Revisa tu solicitud')).toBeVisible()
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Solicitar cotización' }).click()

  await expect(page.getByRole('heading', { name: '¡Tu solicitud está lista!' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir WhatsApp' })).toBeVisible()
}

const verificarSinDesbordeHorizontal = async (page: Page) => {
  const sinDesborde = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  )
  expect(sinDesborde).toBe(true)
}

test('bebé: del inicio hasta solicitar la cotización', async ({ page }) => {
  await simularEnvioExitoso(page)
  await entrarAPijamas(page)

  await elegir(page, 'Bebé')
  await siguiente(page).click() // base fijada
  await elegir(page, 'Redondo')
  await elegir(page, 'Manga corta')
  await elegir(page, 'No') // ¿Es para niña?
  await siguiente(page).click() // acabado único
  await elegir(page, 'Short corto')
  await siguiente(page).click() // acabado inferior único
  await elegir(page, 'Brush')
  await elegir(page, 'Modal')
  await elegir(page, 'Talla estándar')
  await siguiente(page).click() // grupo fijado
  await elegir(page, '3-6 meses')
  await elegir(page, '6-9 meses')
  await siguiente(page).click() // entrega fijada

  await completarContactoYEnviar(page, 'Ana Mora', '8888 7777')
  await verificarSinDesbordeHorizontal(page)
})

test('mujer: flujo completo con bata de salida (HU-11) hasta cotización', async ({ page }) => {
  await simularEnvioExitoso(page)
  await entrarAPijamas(page)

  await elegir(page, 'Mujer')
  await elegir(page, '2 piezas')
  await elegir(page, 'En V')
  await elegir(page, 'Tirantes')
  await elegir(page, 'A la cintura')
  await elegir(page, 'Simple')
  await elegir(page, 'Short corto')
  await elegir(page, 'No') // ¿Abertura lateral pequeña?
  await elegir(page, 'Simple')
  await elegir(page, 'Satín')
  await elegir(page, 'Satín')
  await elegir(page, 'Talla estándar')
  await elegir(page, 'Adulto (S a XL)')
  await elegir(page, 'M')
  await elegir(page, 'M')
  await elegir(page, 'Sí') // ¿Agregar bata de salida?
  await elegir(page, 'Manga larga')
  await elegir(page, 'Encaje')
  await siguiente(page).click() // entrega fijada

  await completarContactoYEnviar(page, 'Laura Vega', '8888 2222')
  await verificarSinDesbordeHorizontal(page)
})

test('hombre: flujo completo hasta solicitar la cotización', async ({ page }) => {
  await simularEnvioExitoso(page)
  await entrarAPijamas(page)

  await elegir(page, 'Hombre')
  await siguiente(page).click() // base fijada
  await elegir(page, 'Redondo')
  await elegir(page, 'Manga corta')
  await siguiente(page).click() // acabado superior único
  await elegir(page, 'Short corto')
  await siguiente(page).click() // acabado inferior único
  await elegir(page, 'Brush')
  await elegir(page, 'Brush')
  await elegir(page, 'Talla estándar')
  await elegir(page, 'Adulto (S a XL)')
  await elegir(page, 'M')
  await elegir(page, 'M')
  await siguiente(page).click() // entrega fijada

  await completarContactoYEnviar(page, 'Carlos Solís', '8888 1111')
  await verificarSinDesbordeHorizontal(page)
})

test('niño o niña: flujo completo hasta solicitar la cotización', async ({ page }) => {
  await simularEnvioExitoso(page)
  await entrarAPijamas(page)

  await elegir(page, 'Niño o niña')
  await siguiente(page).click() // base fijada
  await elegir(page, 'Redondo')
  await elegir(page, 'Manga corta')
  await elegir(page, 'No') // ¿Es para niña?
  await siguiente(page).click() // acabado superior único
  await elegir(page, 'Short corto')
  await siguiente(page).click() // acabado inferior único
  await elegir(page, 'Brush')
  await elegir(page, 'Brush')
  await elegir(page, 'Talla estándar')
  await siguiente(page).click() // grupo fijado
  await elegir(page, '6')
  await elegir(page, '8')
  await siguiente(page).click() // entrega fijada

  await completarContactoYEnviar(page, 'Sofía Rojas', '8888 3333')
  await verificarSinDesbordeHorizontal(page)
})