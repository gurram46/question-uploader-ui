# Easy Mode Screen Plan

## Goal
Create a new screen for non-technical users that makes the ingestion workflow fast, obvious, and low-risk.

This screen is not a replacement for:
- `AI Automation`
- `AI Simplified`

It is a third workflow focused on:
- very low cognitive load
- very few choices on screen at one time
- safe defaults
- fast completion
- keeping as much useful data as possible without forcing the user through a dense review tool

## Product intent
The current `AI Automation` screen is powerful but dense. It exposes too many controls, terms, and branches at once.

The new screen should optimize for:
- first-time users
- low-skill operators
- repetitive upload operators
- people who only want to finish the task quickly

The new screen should not optimize for:
- power-user bulk editing
- deep debug workflows
- advanced metadata tuning
- complex validation analysis

## Core principle
The user should always know:
1. what to do next
2. what the system is doing now
3. what is ready
4. what is missing
5. what happens when they click the main button

## Success criteria
The screen is successful if a new user can:
1. upload a file
2. optionally upload an answer key
3. review only the most important output
4. fix obvious problems quickly
5. commit the batch

without needing to understand:
- verification state
- page filters
- validation modes
- source-page mechanics
- bulk metadata internals
- question-by-question deep tooling

## Constraints
- Must not break existing `AI Automation`
- Must not break existing `AI Simplified`
- Must preserve data capture opportunities, even if they are hidden behind progressive disclosure
- Must reuse the existing backend endpoints where possible
- Must feel faster than current screens even if backend speed is unchanged

## New screen name
Working name:
- `Easy Mode`

Possible final labels:
- `Fast Upload`
- `Quick Review`
- `Easy Review`
- `Operator Mode`

Recommended nav label:
- `Easy Mode`

Reason:
- short
- clear
- non-technical

## Screen philosophy
The screen should be:
- step-based
- single-column or strongly guided
- one primary action at a time
- forgiving
- informative without being noisy

The screen should avoid:
- multiple competing button groups
- developer-style status language
- too many inline badges
- too many filters visible by default
- exposing all metadata fields at once

## Proposed information architecture

### Step 0: Batch context
Show a compact top card:
- selected batch
- file name
- status
- total questions detected
- uploaded by
- last update time

Actions:
- `Choose Batch`
- `Create New Batch`

If no batch is selected:
- show only the batch chooser / create flow
- hide the rest of the workflow

### Step 1: Upload source file
Primary card:
- upload PDF/DOCX
- show upload progress
- show processing status
- show elapsed time
- show estimated remaining time if job status allows it

Primary action:
- `Upload and Start`

When done:
- auto-advance user to next step

### Step 2: Upload answer key
Primary card:
- upload answer key file
- show parse timer
- show estimated parse time
- show pages being processed
- show parsed answer count

After parse:
- show compact editable table
  - `Q No.`
  - `Answer`

Primary action:
- `Apply Answer Key`

Secondary action:
- `Skip for now`

This step must not auto-apply.

### Step 3: Quick review
This is the most important UX step.

Only show:
- questions with missing answer
- questions with weak extraction confidence if available
- questions with empty text
- questions with image/diagram relevance
- obvious parse conflicts

Do not show the whole batch first.

Default view:
- `Needs Review`

Optional tab:
- `All Questions`

Each card should show:
- question number
- source page
- question text
- options
- selected answer
- page images / diagrams for that page

Actions per card:
- edit text
- edit options
- choose correct answer
- mark as ready

Do not show:
- verify
- reject
- developer status badges unless collapsed under details

### Step 4: Important metadata only
Show a compact metadata card with only the highest-value fields:
- subject
- chapter
- topic
- exam type
- published year

Behavior:
- prefill from batch when possible
- apply to all by default
- allow skipping

Advanced metadata should be hidden under:
- `More fields`

### Step 5: Final check and commit
Final summary card:
- total questions
- questions with answers
- questions missing answers
- questions with blank text
- questions with diagrams
- metadata coverage summary

Primary action:
- `Commit Batch`

Secondary action:
- `Review Issues`

If there are soft issues:
- allow commit
- clearly warn

If there are hard technical failures:
- block commit

## UX simplification rules

### Rule 1: One main button per step
Every step should have only one dominant CTA.

### Rule 2: Hide advanced controls
Advanced fields, filters, and range tools must stay hidden by default.

### Rule 3: Use plain language
Use:
- `Upload answer key`
- `Review answers`
- `Fix missing details`
- `Commit batch`

Avoid:
- `verification`
- `bulk validate`
- `range apply`
- `reconcile`
- `draft state`

### Rule 4: Auto-save edits
If feasible, edits should save automatically or on blur.
Avoid forcing the user to repeatedly click save per micro-edit.

### Rule 5: Show progress everywhere
Long-running actions must always show:
- what is happening
- how long it has taken
- estimated remaining time if possible

### Rule 6: Review only what matters first
Default queue should be:
- missing answer
- suspicious answer
- missing text
- parse mismatch

Do not dump 90 questions on first load if only 6 need attention.

## Data safety requirements
The screen must be easy, but it must not silently lose useful data.

Requirements:
- preserve parsed questions even if metadata is incomplete
- preserve parsed answers before apply
- preserve page-linked diagrams
- preserve user edits immediately or very frequently
- preserve batch context if user reloads

If user skips metadata:
- commit should still be possible
- but summary must state which fields are missing

If answer key parse is incomplete:
- system must show missing question numbers clearly
- user must be able to continue

## Proposed backend usage
Use existing endpoints where possible.

Likely existing flow:
- draft upload
- job polling
- draft load
- answer-key parse
- answer-key apply
- asset/image loading
- commit API

Frontend orchestration should:
- wrap these calls into fewer visible steps
- hide backend complexity
- present one combined task model

## Proposed state model for the new screen

### Primary screen state
- `idle`
- `uploading_source`
- `processing_source`
- `ready_for_key`
- `parsing_key`
- `ready_for_review`
- `reviewing`
- `ready_to_commit`
- `committing`
- `done`

### Derived counters
- total questions
- review-needed count
- parsed answers count
- unanswered count
- blank-text count
- metadata-missing count

### Persistence
Store lightweight UI context in local storage:
- active batch id
- last open step
- metadata draft
- review filter

Do not store giant question bodies unless necessary.

## Proposed UI layout

### Desktop
- centered max-width container
- progress stepper at top
- one main card per step
- compact summary rail on right only if it truly helps

### Mobile
- strictly stacked
- sticky bottom CTA for current step
- no dense side panels

## Visual direction
This screen should feel:
- calmer
- cleaner
- more guided
- less dashboard-like

Recommended approach:
- larger section cards
- stronger typography hierarchy
- muted background
- clear success/warning colors
- limited button variations

## Detailed implementation phases

### Phase 1: Spec and shell
- add new nav item
- add new screen route/view
- add top stepper shell
- add placeholder cards for each step

### Phase 2: Source upload flow
- connect batch chooser
- connect file upload
- connect job polling
- show timing/progress

### Phase 3: Answer key flow
- connect key upload
- connect parse
- show editable answer review list
- apply reviewed answers
- show parse timers and counts

### Phase 4: Review queue
- derive `needs review` subset
- build simplified question card
- add inline editing
- show page-linked diagrams

### Phase 5: Metadata and summary
- add compact metadata card
- add final summary
- add commit flow

### Phase 6: Polish
- autosave behavior
- empty states
- retry states
- better status copy
- mobile cleanup

## Review queue heuristics
Questions should enter `Needs Review` if:
- no answer selected
- no option text present
- question text missing or extremely short
- answer key conflict detected
- page image exists and question likely references diagram

Questions should be treated as `Ready` if:
- answer exists or was intentionally left blank
- question text exists
- operator did not flag it

## What should stay hidden under “Advanced”
- page-range tools
- question-range tools
- raw validation details
- low-level difficulty controls
- debug status
- manual per-batch low-level patch actions

## Acceptance criteria for v1
1. User can complete a batch without touching `AI Automation`
2. User can upload source file and answer key from the same screen
3. User sees a clear parse timer and summary
4. User reviews only a reduced queue first
5. User can still inspect all questions if needed
6. User can commit even with optional metadata missing
7. No verify step is required
8. Existing workflows remain intact

## Risks
- too much simplification can hide important error states
- if we allow commit too freely, DB quality may degrade
- if we keep too many controls, the screen becomes dense again
- if review queue heuristics are weak, users may miss important bad questions

## Risk mitigation
- show a final summary before commit
- surface missing-data counts clearly
- keep advanced tools accessible but hidden
- preserve a path back to `AI Automation` for power users

## Recommended implementation choice
Use the existing `AI Simplified` learnings, but do not merge this concept into that screen blindly.

Recommended build strategy:
- create a new dedicated component for `Easy Mode`
- reuse useful helper logic from `ReviewApp` and `AISimplifiedAutomation`
- do not copy the entire old dense workflow into the new screen

## File plan
Likely frontend files:
- `src/components/EasyModeScreen.tsx`
- `src/App.tsx`
- `src/App.css` or a dedicated style file if preferred

Potential shared helpers to extract later:
- answer-key parse/apply helpers
- draft summary selectors
- review queue selectors
- progress/timing formatters

## Tomorrow implementation order
1. Add nav entry and empty screen shell
2. Add stepper and summary model
3. Wire batch selection and source upload
4. Wire answer-key parse/apply
5. Build `Needs Review` queue
6. Add metadata step
7. Add final commit summary
8. Polish and test locally

## Open questions
These do not block the plan, but they matter:

1. Should `Easy Mode` commit all loaded questions by default, or only the `ready` subset?
Recommended: commit all loaded questions, but show a warning if some still have issues.

2. Should metadata be one shared batch-level form or editable per question in easy mode?
Recommended: batch-level first, per-question only inside review cards.

3. Should the user land in `Easy Mode` by default after login?
Recommended: not yet. Add it as a visible option first.

## Decision summary
Build a new third screen for the fastest possible workflow.

It should:
- reduce choices
- reduce jargon
- reduce visible controls
- keep important data
- allow progress without verify
- still preserve an escape hatch to advanced screens
