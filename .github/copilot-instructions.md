# AI Agent Instructions — NTPC PYQ Practice

Purpose: help AI coding agents be productive in this frontend-only React/Vite project for NTPC previous-year-question practice.

Key architecture (big picture)
- Frontend-only single-page React app built with Vite: entry is `src/main.jsx`, top-level `src/App.jsx`.
- Data layer: `src/data/questions.json` contains all question data (id, text, options, correctIndex, subject).
- Components under `src/components/` handle UI: `QuestionCard.jsx`, `Result.jsx`, `Navbar.jsx`.
- Pages under `src/pages/` implement flows: `Home.jsx`, `Practice.jsx` (main test flow).
- No backend. External integrations:
  - Google Sheets webhook (Apps Script) — POST attempts from the browser to `VITE_SHEETS_ENDPOINT`.
  - Gemini / Google Generative Language API — called directly from the browser using `VITE_GEMINI_API_KEY`.

Important files to inspect for context and patterns
- `src/pages/Practice.jsx` — core state machine (current question index, answers object, submit flow). Use this to understand analytics generation and when Sheets posting happens.
- `src/components/QuestionCard.jsx` — shows options, handles selection, and the "Explain with Gemini" flow. Gemini call uses `import.meta.env.VITE_GEMINI_API_KEY` and `VITE_GEMINI_ENDPOINT`.
- `docs/google-sheets-apps-script.gs` — Apps Script webhook implementation. It expects a script property `TARGET_SPREADSHEET_ID` and appends rows to sheet named `attempts`.
- `src/data/questions.json` — canonical source of questions in this project.

Environment & deployment conventions
- Vite env vars must be prefixed with `VITE_`. The app reads:
  - `VITE_GEMINI_API_KEY` (required for explanation feature)
  - `VITE_GEMINI_ENDPOINT` (optional override)
  - `VITE_SHEETS_ENDPOINT` (Google Apps Script web app URL where attempts are POSTed)
- Netlify build: `npm run build` -> publish `dist`. See `netlify.toml`.
- For secure keys: set env vars via Netlify UI (do NOT commit secret keys to repo). The example file is `.env.example`.

Project-specific patterns & gotchas (do not change without care)
- Questions shape: supported variants are:
  - Canonical: `{ id: string, text: string, options: string[], correctIndex: number }` (preferred)
  - Alternate: `{ id: number|string, question: string, options: string[], correctAnswer: string }` (common for translated/converted data)
  The app normalizes either shape at startup in `src/pages/Practice.jsx` (it finds `question` or `text`, and maps `correctAnswer` to `correctIndex` by matching option text). Keep options as an array and ensure `correctAnswer` matches an option if you use the alternate shape.
- Answers state shape: `answers` is an object mapping question id -> optionIndex. The app prevents changing answers after submission.
- Submission side-effect: `Practice.jsx` sends an array of rows to the Sheets webhook. If `VITE_SHEETS_ENDPOINT` is missing, it skips the network call (see console.warn).
- Gemini responses: the code tries multiple JSON shapes (`candidates`, `choices`) to extract text but is tolerant — adapt extractors if the API returns a different shape.
- No authentication on the Apps Script webhook: it is intentionally deployed to "Anyone, even anonymous". The Apps Script stores the target spreadsheet via script properties.

Testing & verification tips
- Local dev: run `npm install` then `npm run dev` to run Vite. Inspect the console for warnings about missing env vars.
- To test Google Sheets integration locally: deploy the Apps Script and set `VITE_SHEETS_ENDPOINT` to the provided URL before building.
- To test Gemini: set `VITE_GEMINI_API_KEY` in `.env` (for local dev) or Netlify env and click "Explain with Gemini"; watch network tab for the request shape.

When modifying components
- Preserve these responsibilities:
  - `Practice.jsx` calculates analytics and performs the POST to Sheets. Keep that behavior consolidated.
  - `QuestionCard.jsx` is responsible for calling Gemini and rendering the explanation. Don’t move Gemini calls into global code unless centralizing is intentional.

Style & UX conventions
- Minimal, exam-focused UI with muted colors. See `src/styles.css` for variables and classes.
- After submission: correct options get `correct` class (green), wrong selections get `wrong` class (red).

If you need to add features
- Add new pages under `src/pages/` and route via top-level `App.jsx` (currently switches by internal `route` state).
- If adding offline persistence, use localStorage only and keep it optional; current design intentionally avoids any backend storage besides Google Sheets.

Questions an agent should ask if unclear
- "Do you want Gemini calls proxied via a server (safer) or remain client-side (as implemented)?"
- "Should the Apps Script require authentication?" (current setup accepts anonymous POSTs)

This file is intentionally concise — for code-level details, open the files referenced above.
