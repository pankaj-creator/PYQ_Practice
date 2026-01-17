import React from 'react'

export default function Result({ analytics, onClose }) {
  return (
    <div className="result">
      <h2>Result</h2>
      <div className="summary">
        <div>Total Questions: {analytics.total}</div>
        <div>Correct: {analytics.correct}</div>
        <div>Wrong: {analytics.wrong}</div>
        <div>Unattempted: {analytics.unattempted || 0}</div>
        <div>Score: {analytics.score}</div>
        <div>Percentage: {analytics.percentage}%</div>
      </div>

      <h3>Details</h3>
      <ol className="details">
        {analytics.details.map((d) => (
          <li key={d.id} className={d.isUnattempted ? '' : (d.isCorrect ? 'correct' : 'wrong')}>
            <div className="q">{d.question}</div>
            <div className="a">Your answer: {d.userIndex != null && d.options[d.userIndex] ? <strong>{d.options[d.userIndex]}</strong> : <em>Not answered</em>}</div>
            <div className="c">Correct answer: <strong>{d.options[d.correctIndex]}</strong></div>
            <div className="indicator">
              {d.isUnattempted ? 'Unattempted' : (d.isCorrect ? 'Correct' : `Incorrect (${d.marks})`)}
            </div>
          </li>
        ))}
      </ol>

      <div className="actions">
        <button className="btn" onClick={onClose}>Back to Home</button>
      </div>
    </div>
  )
}
