// Netlify Function: gemini-proxy
// Proxy requests from the browser to the Gemini / Generative Language API
// This keeps the API key server-side and avoids CORS/preflight issues.

const DEFAULT_ENDPOINT = process.env.GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1/models/text-bison-001:generate'

exports.handler = async function (event, context) {
  // Handle preflight
  const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: 'ok',
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    }
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const prompt = body.prompt || body.text || ''

    if (!prompt) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing prompt in request body' }) }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: 'GEMINI_API_KEY not configured on the server' }) }
    }

    const endpoint = process.env.GEMINI_ENDPOINT || DEFAULT_ENDPOINT

    const fetchRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt: { text: prompt }, temperature: 0.2, maxOutputTokens: 512 }),
    })

    const text = await fetchRes.text()

    return {
      statusCode: fetchRes.status >= 200 && fetchRes.status < 300 ? 200 : fetchRes.status,
      headers: CORS_HEADERS,
      body: text,
    }
  } catch (err) {
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: String(err) }) }
  }
}
