// lib/ftpUpload.ts
// Uploads ZIPs directly to Bluehost via plain FTP, bypassing Cloudflare entirely.
// Cloudflare only proxies HTTP/HTTPS — FTP on port 21 goes straight to the origin.
import * as ftp from 'basic-ftp'
import { Readable } from 'stream'

const FTP_HOST     = process.env.FTP_HOST!
const FTP_USER     = process.env.FTP_USER!
const FTP_PASSWORD = process.env.FTP_PASSWORD!

// Normalise dir: ensure it starts with '/' so basic-ftp treats it as absolute.
// Bluehost FTP roots at /home/<account>/ so public_html is a top-level dir there.
const rawDir     = process.env.FTP_ZIP_DIR ?? 'public_html/downloads'
const FTP_ZIP_DIR = rawDir.startsWith('/') ? rawDir : `/${rawDir}`

const ZIP_BASE_URL = process.env.ZIP_BASE_URL ?? 'https://designranga.com/downloads'

export async function uploadZipViaFtp(
  zipBase64: string,
  fileName: string
): Promise<string> {
  const client = new ftp.Client(
    30_000 // 30 s timeout on control socket — fail fast rather than hang
  )
  client.ftp.verbose = true

  console.log('=== FTP DEBUG ===')
  console.log('HOST:', FTP_HOST)
  console.log('USER:', FTP_USER)
  console.log('DIR :', FTP_ZIP_DIR)
  console.log('FILE:', fileName)
  console.log('ZIP size (bytes):', Buffer.from(zipBase64, 'base64').length)

  try {
    await client.access({
      host:     FTP_HOST,
      user:     FTP_USER,
      password: FTP_PASSWORD,
      secure:   false,
      port:     21,
    })
    console.log('✅ FTP connected')

    await client.ensureDir(FTP_ZIP_DIR)
    console.log('✅ Directory ensured:', FTP_ZIP_DIR)

    const buffer = Buffer.from(zipBase64, 'base64')
    const stream = Readable.from(buffer)
    await client.uploadFrom(stream, fileName)
    console.log('✅ File uploaded:', fileName)

    const publicUrl = `${ZIP_BASE_URL}/${fileName}`
    console.log('✅ Public URL:', publicUrl)
    return publicUrl

  } catch (err) {
    console.error('❌ FTP ERROR:', err)
    throw err
  } finally {
    client.close()
  }
}
