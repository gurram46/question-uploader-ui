Work Summary (2025-09-12)

What I did

- Reviewed UI repo structure and current form flow (`src/components/QuestionUploadForm.tsx`).
- Read `errorlogs.txt` and confirmed backend contract for difficulties and uploads.
- Reviewed backend routes (`/uploadquestion`, `/getquestions`, `/getdifficulties`, `/createdifficulty`) and verified:
  - `/uploadquestion` requires numeric `difficultyId`.
  - `/getdifficulties` returns hashed `difficulty_id` + `difficulty_level` + `difficulty_type`.
  - `/getquestions` returns numeric `difficulty_id` with `difficulty_level` and `difficulty_type`.
- Designed UI change: populate difficulty dropdown from `/getdifficulties` as “Level X - type”, map numeric `difficultyId` by level+type using `/getquestions`, and block submit when unresolved.
- Identified and planned fixes for ESLint warnings (add missing deps to `useCallback`).

What happened

- While patching `QuestionUploadForm.tsx`, the machine ran out of disk space (ENOSPC), which corrupted the file and triggered TypeScript “not a module” errors.
- To prevent further partial writes, the file was removed to be cleanly restored next session with the finalized implementation.

Why Level 1/2 show warning but Level 3 doesn’t

- Numeric ids are derived from `/getquestions`. If the DB has no questions for Level 1/2, their ids can’t be resolved; Level 3 works because existing rows expose its numeric id.

Plan for next session

1) Recreate `src/components/QuestionUploadForm.tsx` with:
   - Dropdown fed by `/getdifficulties` showing “Level X - type”.
   - Mapping numeric `difficultyId` by level+type using `/getquestions`.
   - Submit guard + disabled button if id unresolved.
   - ESLint dependency fixes on `useCallback` hooks.
   - Pass `{ difficultyId: String(numericId) }` to `createQuestionFormData`.

2) Sanity checks
   - Try Level 3 (should resolve id and upload).
   - Try Level 1/2 (should disable submit and show a clear message until ids exist).

3) Environment cleanup (you can do now)
   - Free disk space (clear `node_modules/.cache`, `build`, temporary files, Recycle Bin).
   - If present, remove `.git/index.lock` (close any git processes first).
   - Restart dev server: stop `npm start`, then `npm start` again.

Optional shortcuts (if urgently needed before mapping exists)

- Temporary hardcode numeric ids for difficulties (not recommended for long-term). Replace once mapping is available.

Notes

- Long-term backend improvement (optional): include the numeric id in `/getdifficulties` or accept hashed ids on `/uploadquestion` and decode server-side. This removes the need for client-side mapping.

