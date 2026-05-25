<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

---

# Implant ID — Project Standards

This is a premium, production-grade medical web application. Every line of
code must be written to a standard that could be sold commercially. No hacks,
no "we'll fix this later", no quick patches.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router (TypeScript strict) |
| Auth | Clerk v7 — `useUser`, `useClerk`, `currentUser()`, `auth()` |
| Backend | Convex — `useQuery`, `useMutation`, `query`, `mutation` |
| Auth bridge | `ConvexProviderWithClerk` — Clerk JWT template named **"convex"** |
| Email | Resend (via Clerk `email.created` webhook) |
| Styling | Plain CSS with custom properties — no Tailwind, no CSS-in-JS |
| Deployment | Vercel — build command: `npx convex deploy --cmd 'next build'` |

## CSS Design Tokens (globals)

Always use these — never hardcode colours:

```
--accent        primary teal
--accent-deep   deep teal (text on light bg)
--accent2       green teal
--bg            page background
--bg2           card / panel background
--border        subtle border
--border2       dashed border variant
--text          primary text
--muted         secondary text
--muted2        tertiary / placeholder text
--err           error red
--ok            success green
--ff            font family (Inter / system)
--fb            font family fallback
```

## React — Rules That Must Never Be Broken

1. **All hooks at the top of every component, unconditionally.** `useState`,
   `useEffect`, `useRef`, `useQuery`, `useMutation`, `useRouter`, `useUser`
   — all of them, before any conditional logic or early returns.
2. **Early returns only after every hook call.** If you need to guard a render
   (loading state, redirect, etc.) the guard goes after all hooks.
3. **Never copy-paste hooks into conditional blocks.** If a hook seems to need
   a condition, restructure the component.

Violation of these rules causes runtime crashes. There are no exceptions.

## UI Components — Non-Negotiable Rules

### Dropdowns / Selects
**Never use a native `<select>` element anywhere in this app.** Every dropdown
must use the custom `CustomSelect` or `InlineSelect` components located in
`src/components/ui/`. They match the design system, support keyboard
navigation, and close on outside click / Escape.

### Buttons
All buttons use the `.btn` class system:
- `.btn` — secondary / ghost
- `.btn.btn-s` — primary (accent filled)
- `.btn.btn-lg` — full-height (44px) for forms
- `.btn.btn-block` — 100% width
- `.btn.btn-danger` — destructive action

### Forms
- Every `<input>` and `<textarea>` uses the `.input` class
- Every field group uses the `.field` class with a `<label>` above
- Required fields show `<span style={{color:'var(--err)',marginLeft:3}}>*</span>`
- Validation errors shown in a banner above the submit button, never inline
- Loading state on submit buttons — text changes, button disabled

### Loading & Empty States
Every data-dependent view must handle three states:
1. **Loading** — skeleton or blank card, never a spinner unless unavoidable
2. **Empty** — clear message, no broken layout
3. **Error** — user-readable message, not a raw JS error

### Accessibility
- All interactive elements have `aria-label` where the visual label isn't obvious
- Keyboard navigation works for all custom components (Escape closes dropdowns/modals)
- Focus states are visible — never `outline: none` without a custom focus style

## Verification-Gated Features

A patient's record has `verificationStatus: 'pending' | 'active'`.

Features that require an active (verified) record:
- **Add to Wallet** — hidden when pending
- **Share with clinic** — link disabled / locked in sidebar and nav when pending
- **Emergency info quick-access card** — links to verified data only
- Any future feature that exposes full implant data to a third party

When pending:
- Show the orange banner in the content column (not full-width over the sidebar)
- Show the light-grey "inactive" card design
- Hide action buttons entirely (don't just disable them)
- Lock navigation links with a visual lock indicator and tooltip

## Convex Patterns

- `getMyPatient` — always the first query on any patient page; returns `null`
  if not registered (redirect to `/patients/register`), `undefined` while loading
- Mutations are idempotent where possible
- `convex/_generated/` is committed to the repo (not gitignored) so Vercel builds work
- Env vars that Convex needs (`CLERK_ISSUER_URL`) must be set in **both**
  Development and Production Convex deployments, not just Vercel

## File & Folder Conventions

```
src/
  app/
    patients/         # Patient-facing portal
      dashboard/      # DashboardClient.tsx + page.css
      register/       # RegisterClient.tsx + page.css
      share/          # Share-with-clinic page (gated — verified only)
    clinics/          # Clinic staff portal
    admin/            # Platform admin
    api/webhooks/     # Clerk webhook → Resend
  components/
    ui/               # Shared UI primitives (CustomSelect, etc.)
  lib/
    requireRole.ts    # Server-side role guard
```

Shared UI components that are used on more than one page must live in
`src/components/ui/` — never duplicated inline.

## Patient ID Format

`IID-[3 surname][2 firstname][DD][MM][2 random]`
Example: `IID-SMIJO2311XK` (Smith, John, born 23 Nov)

Characters: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no O, no I — avoids confusion with 0 and 1)

## Git Commit Style

Prefix commits with a phase and description:
```
Phase 2c: 4-step registration, custom dropdowns
Fix: redirect already-registered patients away from register
```
Always co-author with Claude.

## What This App Will Become

Implant ID is a commercial medical platform. Clinicians and hospitals will
rely on it. Code quality is a patient safety issue, not just a developer
preference. Write accordingly.
