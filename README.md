# ReturnBy

Paste an order-confirmation email → get your return deadline and a one-click calendar reminder. Runs entirely in your browser: no account, no inbox access, nothing sent anywhere.

## Try it
```
npm install
npm run dev     # http://localhost:5173
npm test        # unit tests
```
Click **Try a sample** to load fictional demo emails.

## How it works
- `src/parse.ts` — rule-based extraction of store, order date, order number, total
- `src/policy.ts` + `data/policies.json` — return window per store (fallback 30 days)
- `src/deadline.ts` — due date, days left, color status
- `src/store.ts` — localStorage persistence
- `src/ics.ts` — RFC 5545 calendar file with a reminder 3 days before

Planning docs (`devpost/scope.md`, `prd.md`, `spec.md`, `checklist.md`) originated as AI-assisted scope/PRD/spec drafts and were copied and edited before implementation. The Devpost Learn skill pack was installed, but its learner interview was not completed. These documents must not be represented as completed Skill Pack interview output; that required workflow remains outstanding before hackathon submission.

## AI disclosure
Built with an AI coding agent following the Devpost Learn AI Basics skills. No AI runs inside the app.

## License
MIT
