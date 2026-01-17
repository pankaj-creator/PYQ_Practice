import React from 'react'

export default function Home({ onStart }) {
  return (
    <div className="home">
      <h1>NTPC PYQ Practice</h1>
      <p className="lead">Practice previous year questions, one at a time. No backend — frontend-only.</p>
      <button className="btn primary" onClick={onStart}>Start Practice</button>
      <section className="info">
        <h3>How it works</h3>
        <ul>
          <li>Questions are loaded from <code>src/data/questions.json</code>.</li>
          <li>Your attempt is saved to Google Sheets via a webhook (Apps Script).</li>
          <li>Use <strong>Explain with Gemini</strong> to get model explanations (API key in env).</li>
        </ul>
      </section>
    </div>
  )
}
