Work Summary (2025-09-12)

What I did

- Reviewed UI + backend contracts and aligned on constraints from `errorlogs.txt`.
- Implemented a clean “Level 1/2/3 + Type input (create-on-submit)” flow in `src/components/QuestionUploadForm.tsx`:
  - On Upload: fetch difficulties → create if missing → fetch questions to resolve numeric id → upload with numeric `difficultyId`.
  - Removed separate “Add” button (was freezing UI); creation happens inside submit with a single loading state.
  - Kept UI responsive; only the Upload button shows loading.
- Fixed TypeScript by adding `difficulty_id` and `difficulty_type` to `QuestionRow` in `src/types/index.ts`.
- Committed current state before finalizing: “chore: save current UI state …”.

Known limitation (frontend-only)

- Backend requires a numeric `difficultyId` for uploads, but `/getdifficulties` and `/createdifficulty` don’t return it. Numeric ids are only discoverable from `/getquestions` and only for difficulties that already have at least one question.
- Result: uploading to a brand-new difficulty may be blocked until `/getquestions` contains a row for that level/type (or at least that level for fallback). The UI shows a clear toast in this case.

Current UX

- Level select: simple Level 1/2/3 dropdown.
- Type input: free text; created on submit if missing.
- Upload: proceeds only if a numeric id is resolvable via `/getquestions`; otherwise shows a precise error message (no freeze).

Todos for tomorrow

1) Polish messages and guidance
   - Add a small inline note near the type field explaining why brand-new difficulties can’t be uploaded immediately.
   - Make the toast actionable (e.g., “Try an existing difficulty” / “Try later”).

2) Robustness
   - Normalize type matching to lower-case consistently on the client.
   - Handle duplicates gracefully (multiple identical level+type entries).
   - Better fallback if `/getquestions` is empty: suggest using an existing difficulty.

3) Optional UX mode (if you prefer)
   - Switch to “Select from existing difficulties only” (populate from `/getdifficulties`) and remove the type input to guarantee uploads work every time.

4) Testing
   - Verify: existing Level 3 works; new type at Level 3 likely blocked until a question exists.
   - Verify: network error paths for create and upload.

Notes for future (backend-only improvements if allowed later)

- Easiest unblock: include numeric id in `/getdifficulties` or return it from `/createdifficulty`.
- Alternative: accept hashed `difficultyId` on `/uploadquestion` and decode server-side.

