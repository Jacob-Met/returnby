---
doc: scope
status: approved
---

# ReturnBy

Paste an order-confirmation email and get a countdown to your return deadline plus a one-click calendar reminder.

## The Unique Kernel
One paste does it all: messy confirmation-email text becomes a dated return deadline and an `.ics` reminder. No account, no inbox connection, no data leaving the browser. Other return trackers want access to your inbox; ReturnBy only needs the text you choose to paste.

## Who It's For
Maya, 29, buys clothes and gadgets online from several stores and returns about a third of them. She stars emails and tries to remember. Every few months she misses a 30-day window and is stuck with a $60 item. She won't give an app access to her Gmail.

## The Core Loop
An order arrives → she copies the confirmation email → pastes it into ReturnBy → checks the merchant and order date it detected → clicks "Add to calendar". She returns for the next order, or to see what's expiring this week.

## Inspiration & Identity
Calm and trustworthy, like a receipt: monospace numbers, white space, one accent color that turns amber then red as a deadline approaches.

## Why This Matters to the Learner
Missed returns cost real money, and the fix is small enough to finish while learning the plan-first workflow.

## What "Working" Looks Like
Paste an order email from a demo store → a card shows "Northwind Outfitters · ordered Oct 3 · return by Nov 2 · 29 days left" → click "Add to calendar" → an `.ics` downloads with a reminder 3 days before the deadline.

## The POC Boundary
- Paste text → extract merchant, order date, order number and total
- Look up the return window in a bundled policy table, or use a manual "N days" value
- Edit any detected field before saving
- A list of saved orders sorted by days left, stored in localStorage
- `.ics` export per order

## Later
Warranty deadlines, price-drop windows, a browser extension, optional LLM extraction for unusual formats, PWA notifications.

## Explicitly Cut
- Gmail/Outlook OAuth: privacy is the kernel.
- Accounts and sync: not needed to prove the loop.
- Receipt photo OCR: heavy and unreliable; pasted text proves the idea.
- Server or database: zero cost, nothing can break during judging.
