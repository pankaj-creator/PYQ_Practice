import React, { useEffect, useState, useRef } from 'react'
import QuestionCard from '../components/QuestionCard'
import Result from '../components/Result'
import questionsData from '../data/questions.json'

export default function Practice({ onDone }) {
  // Normalize incoming question shapes to a consistent internal format:
  // { id: string, text: string, options: string[], correctIndex: number|null, subject?: string }
  function normalizeQuestion(q) {
    const id = q.id != null ? String(q.id) : (q._id || Math.random().toString(36).slice(2))
    const text = q.text || q.question || q.title || ''
    const options = Array.isArray(q.options) ? q.options : []
    // Determine correct index: prefer numeric correctIndex, otherwise find by matching correctAnswer string
    let correctIndex = null
    if (typeof q.correctIndex === 'number') {
      correctIndex = q.correctIndex
    } else if (typeof q.correctAnswer === 'number') {
      correctIndex = q.correctAnswer
    } else if (typeof q.correctAnswer === 'string' && options.length) {
      const idx = options.findIndex((o) => String(o).trim() === String(q.correctAnswer).trim())
      correctIndex = idx >= 0 ? idx : null
    }
    const subject = q.subject || q.Subject || q.topic || q.Topic || ''
    return { id, text, options, correctIndex, subject }
  }

  const [questions] = useState(() => {
    const base = Array.isArray(questionsData) ? questionsData.map(normalizeQuestion) : []
    try {
      const raw = localStorage.getItem('pyq_state')
      if (raw) {
        const parsed = JSON.parse(raw)
        // If a saved questionOrder exists, restore that specific order
        if (parsed.questionOrder && Array.isArray(parsed.questionOrder)) {
          const map = new Map(base.map((q) => [q.id, q]))
          const ordered = parsed.questionOrder.map((id) => map.get(String(id))).filter(Boolean)
          // append any missing questions
          base.forEach((q) => { if (!ordered.find((o) => o.id === q.id)) ordered.push(q) })
          return ordered
        }
        // If there is a saved session with answers (user progressed), preserve base order (no shuffle)
        if (parsed.answers && Object.keys(parsed.answers).length > 0) {
          return base
        }
        // Otherwise treat as a fresh session (no answers) and fallthrough to shuffle
      }
    } catch (e) { /* ignore */ }
    // Shuffle for a fresh session (Fisher-Yates)
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = base[i]
      base[i] = base[j]
      base[j] = tmp
    }
    // persist the generated question order so reloads keep same order for this session
    try {
      const qo = base.map((q) => q.id)
      const raw = localStorage.getItem('pyq_state')
      const parsed = raw ? JSON.parse(raw) : {}
      parsed.questionOrder = qo
      parsed.current = 0
      parsed.answers = parsed.answers || {}
  parsed.secondsLeft = parsed.secondsLeft || 45 * 60
      localStorage.setItem('pyq_state', JSON.stringify(parsed))
    } catch (e) { /* ignore */ }
    return base
  })
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState(() => {
    try {
      const raw = localStorage.getItem('pyq_state')
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed.answers || {}
      }
    } catch (e) { /* ignore */ }
    return {}
  }) // { [id]: selectedIndex }
  const [submitted, setSubmitted] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [sheetsStatus, setSheetsStatus] = useState(null)
  const sheetsEndpoint = import.meta.env.VITE_SHEETS_ENDPOINT || ''
  // Timer: 45 minutes in seconds
  const TOTAL_SECONDS = 45 * 60
  const [secondsLeft, setSecondsLeft] = useState(() => {
    try {
      const raw = localStorage.getItem('pyq_state')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed.secondsLeft === 'number') return parsed.secondsLeft
      }
    } catch (e) { /* ignore */ }
    return TOTAL_SECONDS
  })
  const timerRef = useRef(null)

  // Start timer on mount
  useEffect(() => {
    if (timerRef.current) return
    // if user had saved current question position in localStorage, restore
    try {
      const raw = localStorage.getItem('pyq_state')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (typeof parsed.current === 'number') setCurrent(parsed.current)
        if (parsed.answers) setAnswers(parsed.answers)
      }
    } catch (e) { /* ignore */ }
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current)
          timerRef.current = null
          // Auto-submit when timer ends
          submitTest()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Persist state to localStorage (secondsLeft, answers, current)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pyq_state')
      const parsed = raw ? JSON.parse(raw) : {}
      // preserve questionOrder if present
      const toSave = { ...parsed, secondsLeft, answers, current }
      localStorage.setItem('pyq_state', JSON.stringify(toSave))
    } catch (e) { /* ignore */ }
  }, [secondsLeft, answers, current])

  useEffect(() => {
    // minimal validation
    if (!Array.isArray(questions) || questions.length === 0) {
      console.warn('No questions found in src/data/questions.json')
    }
  }, [questions])

  function selectOption(qid, optionIndex) {
    if (submitted) return // prevent changes after submission
    setAnswers((s) => ({ ...s, [qid]: optionIndex }))
  }

  function goNext() {
    setCurrent((c) => Math.min(c + 1, questions.length - 1))
  }
  function goPrev() {
    setCurrent((c) => Math.max(c - 1, 0))
  }

  function saveAndNext() {
    // save is implicit (answers state already holds selection)
    if (current < questions.length - 1) setCurrent((c) => c + 1)
  }

  function resetCurrentAnswers() {
    // reset only current question's answer
    const qid = questions[current].id
    setAnswers((s) => {
      const n = { ...s }
      delete n[qid]
      return n
    })
  }

  // Pagination helper: produce an array of items to render (numbers and ellipses)
  function paginationItems(total, currentIndex) {
    const totalPages = total
    const currentPage = currentIndex + 1
    const pages = []
    if (totalPages <= 9) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
      return pages
    }
    pages.push(1)
    // left ellipsis
    if (currentPage > 4) pages.push('...')

    const start = Math.max(2, currentPage - 2)
    const end = Math.min(totalPages - 1, currentPage + 2)
    for (let i = start; i <= end; i++) pages.push(i)

    // right ellipsis
    if (currentPage < totalPages - 3) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  async function submitTest() {
    // compute analytics
    const total = questions.length
    let correct = 0
    let wrong = 0
    let unattempted = 0
    let score = 0
    const details = questions.map((q) => {
      const userIdx = answers[q.id]
      const isUnattempted = userIdx == null
      const isCorrect = !isUnattempted && userIdx === q.correctIndex
      const isWrong = !isUnattempted && !isCorrect
      if (isCorrect) { correct++; score += 1 }
      else if (isWrong) { wrong++; score -= 0.33 }
      else { unattempted++ }
      return {
        id: q.id,
        question: q.text,
        userIndex: userIdx,
        correctIndex: q.correctIndex,
        options: q.options,
        isCorrect,
        isWrong,
        isUnattempted,
        marks: isCorrect ? 1 : (isWrong ? -0.33 : 0),
      }
    })

    // Round score to 2 decimals
    score = Math.round(score * 100) / 100
    const percentage = Math.round((score / total) * 10000) / 100 // 2 decimals

    const result = { total, correct, wrong, unattempted, score, percentage, details }
    setAnalytics(result)
    setAnalytics(result)
    setSubmitted(true)
    // stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    // clear persisted state
    try { localStorage.removeItem('pyq_state') } catch(e) {}

    // Send attempt lines to Google Sheets webhook (no auth assumed)
      try {
        const useSheetsProxy = import.meta.env.VITE_USE_SHEETS_PROXY === 'true'
        if (useSheetsProxy) {
          // Send to Netlify function (server-side) which will forward to Apps Script
          const rows = details.map((d) => ({
            questionId: d.id,
            userAnswer: d.userIndex ?? -1,
            userAnswerText: (d.userIndex != null && d.options && d.options[d.userIndex]) ? d.options[d.userIndex] : '',
            correctAnswer: d.correctIndex,
            correctAnswerText: (d.correctIndex != null && d.options && d.options[d.correctIndex]) ? d.options[d.correctIndex] : '',
            timestamp: new Date().toISOString(),
          }))
          const res = await fetch('/.netlify/functions/sheets-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rows),
          })
          let text = ''
          try { text = await res.text() } catch (e) { text = String(e) }
          console.log('Sheets-proxy response:', res.status, text)
          if (!res.ok) setSheetsStatus({ ok: false, status: res.status, body: text })
          else setSheetsStatus({ ok: true, status: res.status, body: text })
        } else if (sheetsEndpoint) {
        const rows = details.map((d) => ({
          questionId: d.id,
          userAnswer: d.userIndex ?? -1,
          userAnswerText: (d.userIndex != null && d.options && d.options[d.userIndex]) ? d.options[d.userIndex] : '',
          correctAnswer: d.correctIndex,
          correctAnswerText: (d.correctIndex != null && d.options && d.options[d.correctIndex]) ? d.options[d.correctIndex] : '',
          timestamp: new Date().toISOString(),
        }))
        const res = await fetch(sheetsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rows),
        })
        let text = ''
        try { text = await res.text() } catch (e) { text = String(e) }
        console.log('Sheets POST response:', res.status, text)
        if (!res.ok) {
          setSheetsStatus({ ok: false, status: res.status, body: text })
        } else {
          setSheetsStatus({ ok: true, status: res.status, body: text })
        }
      } else {
        console.warn('VITE_SHEETS_ENDPOINT not configured; skipping POST to Google Sheets')
      }
    } catch (err) {
      console.error('Failed to send attempts to Sheets endpoint', err)
      setSheetsStatus({ ok: false, error: String(err) })
    }
  }

  function confirmAndSubmit() {
    // ask user to confirm before submitting
    const ok = window.confirm('Are you sure you want to submit the test? Your answers will be final.')
    if (ok) submitTest()
  }

  if (submitted && analytics) {
    return <Result analytics={analytics} onClose={onDone} />
  }

  const q = questions[current]
  if (!q) return <div>Loading questions...</div>

  return (
    <div className="practice">
      <div className="practice-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div className="question-count">Question {current + 1} / {questions.length}</div>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
          <div className="timer" style={{fontWeight: '600'}}>{`${String(Math.floor(secondsLeft/60)).padStart(2,'0')}:${String(secondsLeft%60).padStart(2,'0')}`}</div>
          <button className="btn" onClick={() => { try { localStorage.removeItem('pyq_state') } catch(e){}; location.reload() }}>Re-start Test</button>
          <button className="btn danger" onClick={confirmAndSubmit}>Submit</button>
        </div>
      </div>

      {/* Pagination row with arrows and numbered items */}
      <div className="pagination" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0'}}>
        <button className="btn" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>&lt;</button>
        {paginationItems(questions.length, current).map((it, idx) => (
          it === '...'
            ? <span key={"e"+idx} style={{padding: '0 6px'}}>…</span>
            : <button key={it} className={`btn ${it-1 === current ? 'primary' : ''}`} onClick={() => setCurrent(it-1)}>{it}</button>
        ))}
        <button className="btn" onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))} disabled={current === questions.length - 1}>&gt;</button>
      </div>

      <QuestionCard
        question={q}
        selectedIndex={answers[q.id]}
        onSelect={(idx) => selectOption(q.id, idx)}
        showAnswers={submitted}
      />

      <div className="question-actions" style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem'}}>
        <div>
          <button className="btn" onClick={goPrev} disabled={current === 0}>Previous</button>
        </div>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <button className="btn secondary" onClick={resetCurrentAnswers}>Reset</button>
          <button className="btn primary" onClick={saveAndNext}>Save and Next</button>
        </div>
      </div>

    </div>
  )
}
