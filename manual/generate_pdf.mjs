import puppeteer from 'puppeteer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const htmlPath = join(__dirname, 'mukcombo_manual.html')
const pdfPath = join(__dirname, 'mukcombo_manual.pdf')

const browser = await puppeteer.launch({ headless: true })
const page = await browser.newPage()

await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0', timeout: 30000 })

// 폰트 로딩 대기
await new Promise(r => setTimeout(r, 1500))

await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '15mm', right: '0', bottom: '10mm', left: '0' },
})

await browser.close()
console.log('PDF 생성 완료:', pdfPath)
