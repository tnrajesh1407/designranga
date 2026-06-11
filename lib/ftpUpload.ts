// lib/ftpUpload.ts
// Uploads files directly to Bluehost via FTP, bypassing Cloudflare entirely.
// Cloudflare only proxies HTTP — FTP goes straight to the origin server.
import * as ftp from 'basic-ftp'
import { Readable } from 'stream'

const FTP_HOST     = process.env.FTP_HOST!
const FTP_USER     = process.env.FTP_USER!
const FTP_PASSWORD = process.env.FTP_PASSWORD!
// Remote path inside public_html where download ZIPs will be served from
const FTP_ZIP_DIR  = process.env.FTP_ZIP_DIR ?? '/public_html/downloads'
// Public URL base matching that directory
const ZIP_BASE_URL = process.env.ZIP_BASE_URL ?? 'https://designranga.com/downloads'

export async function uploadZipViaFtp(
  zipBase64: string,
  fileName: string
): Promise<string> {
  const client = new ftp.Client()
  client.ftp.verbose = false

  try {
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASSWORD,
      secure: false,
    })

    // FTP_ZIP_DIR can be absolute or relative to the FTP user's home.
    // ensureDir handles both — it creates the path if it doesn't exist.
    await client.ensureDir(FTP_ZIP_DIR)
    await client.clearWorkingDir  // no-op, just ensures we're in the right place

    // Convert base64 → Buffer → Readable stream
    const buffer = Buffer.from(zipBase64, 'base64')
    const stream = Readable.from(buffer)

    await client.uploadFrom(stream, fileName)

    return `${ZIP_BASE_URL}/${fileName}`
  } finally {
    client.close()
  }
}
