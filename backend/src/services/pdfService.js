const puppeteer = require('puppeteer');

let browserPromise;

function toBuffer(data) {
  if (!data) return Buffer.alloc(0);
  if (Buffer.isBuffer(data)) return data;
  return Buffer.from(data);
}

function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return browserPromise;
}

async function htmlToPdfBuffer(html) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, {
      waitUntil: 'load',
      timeout: 30000,
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '24px', right: '24px', bottom: '24px', left: '24px' },
    });

    const buffer = toBuffer(pdf);
    if (!buffer.length || buffer.slice(0, 4).toString() !== '%PDF') {
      throw new Error('PDF generation returned invalid data');
    }

    return buffer;
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

module.exports = { htmlToPdfBuffer, closeBrowser, toBuffer };
