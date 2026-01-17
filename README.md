# NTPC PYQ Practice — Frontend (React + Vite)

This is a frontend-only React app (Vite) for practicing NTPC previous year questions (PYQ). It is designed for deployment on Netlify and uses Google Sheets as a simple backend via an Apps Script Web App. The app can call a Gemini-like generative API directly from the browser (API key provided via env var).

Features
- Show one question at a time from a local JSON file
# NTPC PYQ Practice — Frontend (React + Vite)

This repository contains a frontend-only React app (Vite) for practicing NTPC previous year questions (PYQ). It is designed for Netlify deployment, uses Google Sheets as a simple write-only store (via Apps Script), and can call a generative model (Gemini / Generative Language API) directly from the browser for explanations.

Quick overview
- UI: React + Vite (entry: `src/main.jsx`, app root: `src/App.jsx`)
- Questions: `src/data/questions.json` — array of question objects. Supported variants:
  - Canonical: `{ id: string, text: string, options: string[], correctIndex: number }`
  - Alternate (common when converting PDFs/translations): `{ id: number|string, question: string, options: string[], correctAnswer: string }`
  The app normalizes either shape at startup in `src/pages/Practice.jsx` (it maps `question` -> `text` and `correctAnswer` -> `correctIndex` by matching option text).
- Main flow: `src/pages/Practice.jsx` (question paging, answers state, submission, analytics)
- Explanation: `src/components/QuestionCard.jsx` — calls Gemini endpoint using `import.meta.env.VITE_GEMINI_API_KEY`
- Sheets webhook: `docs/google-sheets-apps-script.gs` — deploy as Web App (Anyone, even anonymous) and set `VITE_SHEETS_ENDPOINT` to the URL

Get started (local)
1. Install dependencies

```powershell
npm install
```

2. Copy the example env and set secrets

```powershell
copy .env.example .env
# then edit .env to set VITE_GEMINI_API_KEY and VITE_SHEETS_ENDPOINT
```

3. Run dev server

```powershell
npm run dev
```

Build for production

```powershell
npm run build
```

Netlify settings
- Build command: `npm run build`
- Publish directory: `dist`
- Set environment variables in Netlify site settings (VITE_GEMINI_API_KEY, VITE_SHEETS_ENDPOINT). Do not commit secrets.

Google Sheets (Apps Script) — quick deploy guide
1. Create a Google Spreadsheet.
2. Open Extensions → Apps Script. Create a new project and paste `docs/google-sheets-apps-script.gs`.
3. In the Apps Script editor set the script property `TARGET_SPREADSHEET_ID` (Project Settings → Script Properties) to your spreadsheet ID or call `setSpreadsheetId('YOUR_ID')` from the editor once.
4. Deploy → New deployment → Select type: "Web app".
  - Execute as: Me
  - Who has access: Anyone
5. Copy the Web App URL and set it to `VITE_SHEETS_ENDPOINT`.

Using the Netlify proxy for Gemini (recommended)
------------------------------------------------
Direct browser calls to the Gemini / Generative API often fail because those endpoints do not permit cross-origin browser requests. To avoid CORS and keep your API key secret, deploy the included Netlify Function `gemini-proxy`.

1. In your Netlify site settings -> Environment, set:
  - `GEMINI_API_KEY` = your Gemini API key
  - (optional) `GEMINI_ENDPOINT` = custom endpoint if needed
  - `VITE_USE_GEMINI_PROXY` = `true`

2. Deploy the site to Netlify. The function will be available at `/.netlify/functions/gemini-proxy` and the client will call it when `VITE_USE_GEMINI_PROXY` is true.

Local testing notes
-------------------
- To test functions locally, install and run the Netlify CLI (`npm install -g netlify-cli`) and run `netlify dev`. This will proxy function calls to `/.netlify/functions/*` during local development.
- If you cannot use Netlify CLI, you can still test the app, but the direct browser call to the Gemini endpoint may fail due to CORS.

Notes & project-specific conventions
- Questions schema: the app accepts either canonical (`text` + `correctIndex`) or alternate (`question` + `correctAnswer`) shapes. Ensure `options` is an array and, when using `correctAnswer`, its value matches one option exactly so the loader can derive `correctIndex`.
- Answers state: `Practice.jsx` stores answers as an object mapping `questionId` -> selectedIndex. Answers are locked after submission.
- Sheets payload: the frontend POSTs an array of objects with `{ questionId, userAnswer, correctAnswer, timestamp }` to `VITE_SHEETS_ENDPOINT`.
- Gemini integration: the app reads `import.meta.env.VITE_GEMINI_API_KEY` and sends a POST to `VITE_GEMINI_ENDPOINT` (default points at a Google Generative Language URL). The response shape can vary — `QuestionCard.jsx` attempts common extraction paths (candidates, choices). Adjust if your provider returns a different shape.
- Env var naming: Vite requires `VITE_` prefix for vars that should be embedded in the client build.

Security caveats
- Calling Gemini directly from the browser exposes the API key to users. This repository implements frontend-only calls because the project requirement forbids a backend. For production safety, prefer a server-side proxy or serverless function to keep keys secret.
- Deploying the Apps Script as "Anyone" means anyone can post to the spreadsheet; do not store sensitive user data.

Files of interest
- `src/pages/Practice.jsx` — main test flow and analytics
- `src/components/QuestionCard.jsx` — option UI and Gemini explain flow
- `src/data/questions.json` — sample and canonical question source
- `docs/google-sheets-apps-script.gs` — Apps Script webhook
- `.env.example` — env names to configure

If something doesn't work (CORS, Gemini response shapes, or Sheets posts), paste the browser console/network error and I'll adapt request shapes or add guidance.

---
Small note: this repository purposefully keeps logic simple and local (no Node/Express). If you'd like a small serverless proxy to hide the Gemini key, I can add a Netlify Function with minimal code — this requires relaxing the "no backend" constraint to serverless only.
