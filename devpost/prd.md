---
doc: prd
status: approved
---

# ReturnBy — Product Requirements

A private, browser-only return-deadline tracker for people who shop online often. Source: `scope.md > Who It's For`, `scope.md > The Unique Kernel`.

## The Core Journey
1. Maya opens ReturnBy and sees one paste box and a "Try a sample" link.
2. She pastes an email and clicks **Find deadline** (Ctrl/Cmd+Enter also works).
3. A preview card shows detected store, order date, order number, total and return window, with the window's source ("policy table" / "default 30 days").
4. She corrects any field inline and clicks **Save**.
5. The order joins the list, sorted by days left and color-coded (green >7 days, amber 3–7, red ≤2, grey expired).
6. She clicks **Add to calendar**; an `.ics` downloads with an all-day event on the deadline and an alert 3 days before.

## Screens and Layout
Single page: paste box + button on top, preview card (after parsing) in the middle, "Your returns" list below, footer with privacy note and Clear all.

## Look and Feel
White background, near-black text, one teal accent; deadline colors are the only others. Monospace for dates/money. Responsive to 360px.

## Features and Behavior
### Parsing
- [x] Dates like `October 3, 2026`, `Oct 3, 2026`, `10/03/2026`, `2026-10-03`, `3 Oct 2026`
- [x] Merchant from "From:" line, known-merchant keyword, or sender domain; else blank
- [x] Order number from `Order #`, `Order number:`, `Order ID`
- [x] Prefers the date next to "order/placed/purchased"; otherwise earliest
- [x] Undetected fields highlighted for manual entry; never guesses silently
### Deadlines
- [x] Known merchants use `policies.json` window, labelled "default; verify with store"
- [x] Unknown merchants default to 30 days, labelled
- [x] User can override the window; saved with the order
### List and export
- [x] Orders persist across reloads (localStorage)
- [x] Each card can be deleted or downloaded as `.ics`

## States and Boundaries
- Empty list: friendly empty state + sample link.
- Parse finds nothing: blank fields + "Couldn't read this one. Fill it in."
- Expired: grey card, "Expired N days ago".
- Persistence: localStorage only (stated in footer).

## Product Decisions
- No inbox access; privacy is the point.
- No AI at runtime: rule-based parsing is free, instant and predictable.
- Fictional merchants in samples and video (rules restrict third-party trademarks).

## What We're Building
Paste → parse → edit → save → list → `.ics`, all client-side.

## Deferred From the POC
Warranty tracking, sync, notifications, photo OCR.

## Non-Goals
Not a returns/label service; no authoritative policy database; no scraping.
