import https from 'https'
import { Buffer } from 'buffer'

const BLUEHOST_IP = '50.6.43.111'
const DOMAIN      = 'designranga.com'
const WP_USER     = 'tnrajesh80'
const WP_PASS     = 'J3jy MOl9 rgAc T9KS HNhV fO4L'
const auth        = Buffer.from(`${WP_USER}:${WP_PASS}`).toString('base64')

// Use real ZIP magic bytes (PK\x03\x04) so WP doesn't reject on content sniffing
const testBuf = Buffer.from('504b03040000000000000000000000000000000000', 'hex')

const result = await new Promise((resolve, reject) => {
  const req = https.request({
    hostname:            BLUEHOST_IP,
    port:                443,
    path:                '/wp-json/wp/v2/media',
    method:              'POST',
    rejectUnauthorized:  false,
    headers: {
      'Host':                DOMAIN,
      'Authorization':       `Basic ${auth}`,
      'Content-Disposition': 'attachment; filename="test-probe.zip"',
      'Content-Type':        'application/octet-stream',
      'Content-Length':      String(testBuf.length),
    },
  }, (res) => {
    const chunks = []
    res.on('data', c => chunks.push(c))
    res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }))
  })
  req.on('error', reject)
  req.setTimeout(20_000, () => { req.destroy(new Error('timeout')) })
  req.write(testBuf)
  req.end()
})

const ok = result.status >= 200 && result.status < 300
console.log(ok ? '✅ Direct upload OK' : `⚠️  Status ${result.status}`)
if (ok) {
  try {
    const j = JSON.parse(result.body)
    console.log('source_url:', j.source_url)
    console.log('Rewritten: ', j.source_url.replace(`https://${BLUEHOST_IP}`, `https://${DOMAIN}`))
  } catch { console.log(result.body.slice(0, 200)) }
} else {
  console.log(result.body.slice(0, 400))
}
