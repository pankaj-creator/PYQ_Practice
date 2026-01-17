// Netlify Function: sheets-proxy
// Forwards client POSTs to the Google Apps Script webhook server-side to avoid CORS issues.

const SHEETS_ENDPOINT = process.env.SHEETS_ENDPOINT || ''

exports.handler = async function (event, context) {
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: 'ok' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) }
  }

  try {
    const body = event.body || '[]'
    const endpoint = process.env.SHEETS_ENDPOINT || SHEETS_ENDPOINT
    if (!endpoint) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'SHEETS_ENDPOINT not configured' }) }
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    })

    const text = await res.text()
    return { statusCode: res.status >= 200 && res.status < 300 ? 200 : res.status, headers: CORS_HEADERS, body: text }
  } catch (err) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: String(err) }) }
  }
}
