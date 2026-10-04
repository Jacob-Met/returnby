---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Paste an email and see the detected fields**
  Becomes usable: preview card with store/date/order#/total.
  Why now: the kernel first.
  PRD ref: `prd.md > The Core Journey` (1-3)
  Spec ref: `spec.md > Components`
  Build: scaffold Vite+TS, parse.ts, preview card.
  Verify (mechanical): parser unit tests pass; sample 1 parses.
  Learner check: paste a sample and read the card.
  Commit: `Add parser and preview`

- [x] **2. Deadline, list and persistence**
  Becomes usable: saved orders sorted by days left, colored, persisted.
  Why now: completes the loop.
  PRD ref: `prd.md > Deadlines`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Data Model`
  Build: policy.ts, deadline.ts, store.ts, list render.
  Verify (mechanical): deadline tests; reload keeps orders.
  Learner check: save two orders, reload.
  Commit: `Add deadlines, list and storage`

- [x] **3. Calendar export**
  Becomes usable: `.ics` download with 3-day alarm.
  Why now: the "oh, that's cool" moment.
  PRD ref: `prd.md > List and export`
  Spec ref: `spec.md > Components`
  Build: ics.ts + button.
  Verify (mechanical): ICS unit test.
  Learner check: open the file in a calendar app.
  Commit: `Add .ics export`

## Hands-on Checkpoints
- [x] Unit tests (6) and production build pass.

## Final Review
- [x] Unit tests cover parse, deadline, policy and ICS; manual browser pass pending (learner).

## Code Tour and App Map
- [x] README explains each module.
