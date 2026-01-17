import React, { useState } from 'react'

export default function QuestionCard({ question, selectedIndex, onSelect, showAnswers }) {
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(false)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  const geminiEndpoint = import.meta.env.VITE_GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1/models/text-bison-001:generate'
  // When running on Netlify, set VITE_USE_GEMINI_PROXY=true and configure GEMINI_API_KEY in Netlify env.
  // The proxy endpoint will be available at /.netlify/functions/gemini-proxy
  const useProxy = import.meta.env.VITE_USE_GEMINI_PROXY === 'true'

  async function explain() {
    // If using a server-side proxy, the client does not need the API key.
    if (!useProxy && !apiKey) {
      setExplanation('Gemini API key not configured (VITE_GEMINI_API_KEY).')
      return
    }
    setLoading(true)
    setExplanation(null)
    try {
      const prompt = `Explain the following multiple choice question step-by-step:\n\n${question.text}\n\nOptions:\n${question.options.map((o, i) => `${i+1}. ${o}`).join('\n')}`

      // Call Gemini / Generative Language API
      const body = { prompt: { text: prompt }, temperature: 0.2, maxOutputTokens: 512 }

      let res
      if (useProxy) {
        // Call the Netlify function which holds the API key server-side
        res = await fetch('/.netlify/functions/gemini-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: prompt }),
        })
      } else {
        // Direct browser call (may fail due to CORS)
        res = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        })
      }

      if (!res.ok) {
        const txt = await res.text()
        throw new Error(`Gemini API error: ${res.status} ${txt}`)
      }

      const j = await res.json()
      // The exact shape may vary; try to extract plausible text fields
      let text = null
      if (j?.candidates && j.candidates[0]?.content) text = j.candidates[0].content
      if (!text && j?.choices && j.choices[0]?.message?.content) text = j.choices[0].message.content
      if (!text) text = JSON.stringify(j)

      setExplanation(text)
    } catch (err) {
      console.error('Gemini explain error:', err)
      // Provide a helpful hint for common browser failures (CORS / preflight)
      let hint = ''
      const msg = err && err.message ? err.message : String(err)
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkrequest failed')) {
        hint = '\n\nHint: the browser failed to call the Gemini endpoint. This is commonly caused by CORS/preflight issues or an incorrect endpoint URL. Browsers require the remote API to allow cross-origin requests (OPTIONS preflight).\n' +
          'If you are calling Google Generative API (text-bison) directly from the browser, that endpoint often blocks browser requests. The recommended fix is to proxy requests through a server-side endpoint (for example a Netlify Function) that holds the API key and calls Gemini server-side.\n'
      }
      setExplanation('Failed to get explanation: ' + msg + hint)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card question-card">
      <div className="q-text">{question.text}</div>
      <div className="options">
        {question.options.map((opt, i) => {
          const isSelected = selectedIndex === i
          const isCorrect = question.correctIndex === i
          const showCorrectness = showAnswers
          let cls = 'option'
          if (isSelected) cls += ' selected'
          if (showCorrectness && isCorrect) cls += ' correct'
          if (showCorrectness && isSelected && !isCorrect) cls += ' wrong'

          return (
            <button key={i} className={cls} onClick={() => onSelect(i)} disabled={showAnswers}>
              <span className="opt-label">{String.fromCharCode(65 + i)}.</span>
              <span className="opt-text">{opt}</span>
            </button>
          )
        })}
      </div>

      <div className="explain">
        <button className="btn" onClick={explain} disabled={loading}>{loading ? 'Thinking...' : 'Explain with Gemini'}</button>
        {explanation && (
          <div className="explanation">
            <pre>{explanation}</pre>
          </div>
        )}
      </div>
    </div>
  )
}
