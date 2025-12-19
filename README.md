# dannuhh — Flashcard web app

This repository is a small full-stack demo for a "word → flashcard" web app. It includes:

- Express backend (API + static file server)
- MongoDB models (users and flashcard lists)
- A static frontend in `public/` that implements: word entry, auto-translate, editable list, flashcards with flip/swipe and favorites, and a simple auth modal for login/register.

## Quick start (developer)

1. Copy `.env.example` to `.env` and edit values (MongoDB URI, JWT secret etc.)

2. Install dependencies:

```powershell
npm install
```

3. Start the server (development with nodemon):

```powershell
npm run dev
```

4. Open http://localhost:4000 in your browser.

Notes:
- The server expects a running MongoDB instance (local or Atlas) unless you adapt the code to use a different DB.
- Translation is performed by the service configured in `TRANSLATE_API` in `.env` (default: LibreTranslate). You may change that as needed.

If you'd like, I can now: wire up more advanced frontend UX, add unit tests, or turn the frontend into a separate React app.

## Frontend-first / offline mode

This project now supports full frontend usage without requiring a backend or MongoDB. The static site in `public/` provides:

- Word input with automatic translation (server translation when available, otherwise a local fallback dictionary). 
- Editable list UI and the ability to "generate" flashcards. If the backend is not reachable the list will be stored locally in your browser via localStorage.
- Flashcards UI including click-to-flip, touch swipe handling, favorite toggling and "show favorites only" filtering.
- A small login/register modal: when the server is unavailable you can register/login locally (stored in localStorage) so you can test user-specific lists locally.

This makes it easy to work on frontend features and UX without the backend — we can wire the backend later to persist data and add real auth.
