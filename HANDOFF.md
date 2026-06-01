# Implant ID App — Session Handoff

> Read this before touching any code. It covers everything worked on across the last two sessions
> so you can pick up exactly where we left off without repeating mistakes.

---

## Current State (as of last commit)

**Branch:** `main` — pushed to Vercel, live in production  
**Last commit:** `62ee08a` — "Fix registration: 4 steps, correct finalize() position, DOB layout"

The 4-step patient registration flow is complete and deployed:
1. **Details** — first name, last name, DOB, country of birth, email, phone (all required)
2. **Verify email** — 6-digit OTP code from Clerk
3. **Add implant** — device search + hospital/surgeon/date of surgery
4. **Summary + submit** — review card, optional notes, create Convex patient record → redirect to `/patients/dashboard`

---

## Architecture

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 App Router, TypeScript strict | |
| Auth | **Clerk v7** — Signals API (returns `{ error }`, not throws) | See critical section below |
| Backend | **Convex** | `convex/_generated/` committed to repo |
| Email | **Resend** — welcome emails ONLY | Clerk OTP emails handled by Clerk itself |
| Styling | Plain CSS + custom properties | No Tailwind |
| Deployment | Vercel | Build: `npx convex deploy --cmd 'next build'` |

---

## CRITICAL: Clerk v7 Signals API

Clerk v7 uses a **Futures API**. Methods return `Promise<{ error: ClerkError | null }>` — they do NOT throw. Always destructure `{ error }`.

### Correct method names on `signUp` (type: `SignUpFutureResource`):

```ts
const { signUp } = useSignUp()

// Create the sign-up
const { error: createErr } = await signUp!.create({
  firstName:    'Jane',
  lastName:     'Smith',
  emailAddress: 'jane@example.com',
  // ⚠️ Do NOT include phoneNumber — it makes phone a required Clerk verification field
  //    which breaks finalize() with "Cannot finalise sign-up without creating the session"
})

// Send email OTP
const { error: sendErr } = await signUp!.verifications.sendEmailCode()

// Verify email OTP
const { error: verErr } = await signUp!.verifications.verifyEmailCode({ code: '123456' })

// Finalise — call IMMEDIATELY after verifyEmailCode, not later
const { error: finErr } = await signUp!.finalize()

// Phone (available but NOT used in current sign-up flow — stored in Convex only)
// await signUp!.verifications.sendPhoneCode()
// await signUp!.verifications.verifyPhoneCode({ code })
```

### ❌ Wrong method names (do NOT use — TypeScript will error):
```ts
signUp.prepareEmailAddressVerification()   // ← does not exist on v7
signUp.attemptEmailAddressVerification()   // ← does not exist on v7
```

### Why phone is NOT passed to `signUp.create()`

If you include `phoneNumber` in `signUp.create()`, Clerk treats phone as a **required verification step**. After email verification, the sign-up's `status` is `'missing_requirements'` (phone unverified). Calling `finalize()` then fails with:

> **"Cannot finalise sign-up without creating the session"**

The fix: collect phone number for the **Convex patient record** only. Clerk only knows about email. `finalize()` is called right after `verifyEmailCode()` — this works because email is the only required Clerk identifier.

---

## CRITICAL: Middleware Filename

Next.js only recognises middleware at **`src/middleware.ts`** (or project root `middleware.ts`).

Previously the file was called `src/proxy.ts` — it was NEVER loaded by Next.js, which caused:
- No `x-pathname` header set → `patients/layout.tsx` always called `requireRole` → unauthenticated users on `/patients/register` got a redirect loop / server error

File was renamed with `git mv src/proxy.ts src/middleware.ts`. Do not rename it again.

---

## Key Files

### `src/middleware.ts`
- Public routes: `/patients/register(.*)` and `/sign-up(.*)`
- Adds `x-pathname` header forwarded to server layouts
- Role-based route separation (patients ↔ clinics ↔ admin)

### `src/app/patients/register/RegisterClient.tsx`
Full 4-step registration flow. Key architecture points:
- `type Step = 'details' | 'verifyEmail' | 'implant' | 'summary'`
- `CompactSelect` — generic reusable custom dropdown (no native `<select>` anywhere)
- `DobPicker` — 3× `CompactSelect` (Day / Month / Year), clamped dates, no system UI
- `SurgeryDatePicker` — 2× `CompactSelect` (Month + Year)
- `PhonePicker` — custom flag + dial code dropdown + input
- `CountrySelect` — wraps `CompactSelect` with flag icons
- `DeviceSearch` — autocomplete from `@/data/devices`, max 8 results
- `OtpRow` + `makeOtpHandlers` — 6-box OTP input with auto-advance, backspace, paste
- `useEffect` skips auth steps if already signed in (existing Clerk session)
- `useEffect` redirects to `/patients/dashboard` if patient record already exists (idempotent)
- Import path for `setUserRoleIfNew`: `'../../actions/setUserRole'` (2 levels up, not 3)

### `src/app/patients/register/page.css`
All custom classes for the register page. Notable:
- `.stepper`, `.dot`, `.dot.on`, `.dot.done`
- `.step-pane`, `.step-pane.on` — show/hide step content
- `.custom-select`, `.custom-select-btn`, `.custom-select-dd`, `.custom-select-list`, `.custom-select-search`
- `.phone-row`, `.phone-code`, `.phone-dd`, `.phone-dd-search`, `.phone-dd-list`
- `.dev-search-wrap`, `.dev-search`, `.dev-results`, `.dev-sel-card`, `.dev-warn`
- `.implant-block`, `.implant-block-hd`
- `.summary`, `.summary .row`, `.summary .k`, `.summary .v`
- `.dob-row`, `.code-row`, `.code-input`
- `.step-title`, `.step-sub`, `.req`, `.field-hint`, `.resend-row`, `.link-btn`

### `src/app/patients/layout.tsx`
- Reads `x-pathname` header (async) from `next/headers`
- Skips `requireRole` if pathname starts with `/patients/register`
- Requires `'patient'` or `'admin'` for all other patient routes

### `src/app/sign-up/[[...sign-up]]/page.tsx`
Permanent redirect → `/patients/register` (legacy Clerk sign-up URL)

### `src/app/actions/setUserRole.ts`
Server action — stamps `publicMetadata.role = 'patient'` on the Clerk user.
- Idempotent: only sets if role not already present
- Called with `try { await setUserRoleIfNew('patient') } catch {}` after `finalize()` — safe to fail because `requireRole` defaults to `'patient'` if role is missing

### `src/lib/requireRole.ts` (do not modify without care)
- `const role = (user.publicMetadata?.role ?? 'patient') as UserRole`
- Defaults to `'patient'` — so if `setUserRoleIfNew` fails transiently, patients still get in

### `convex/email.ts`
- FROM: `Implant ID <noreply@implantid.io>`
- SUPPORT: `support@implantid.io`
- `sendPatientWelcomeEmail` — fires after patient record created via `createPatient`
- NOT responsible for OTP emails (those are Clerk's)

### `convex/emailTemplate.ts`
- Logo URL: `https://portal.implantid.io/images/email-logo.png`
- Always includes legal compliance: opt-in + unsubscribe link at `portal.implantid.io/settings/notifications`
- `includeUnsubscribe?: boolean` — false for admin/system emails, true for patient emails

### `convex/patients.ts`
- `getMyPatient` — returns `null` if unauthenticated (safe on register page), `undefined` while loading
- `createPatient` — requires auth, generates patient ID in format `IID-[3 surname][2 firstname][DD][MM][2 random]`

---

## Standing Rules (non-negotiable)

1. **No native `<select>` elements anywhere.** Every dropdown must be a custom UI component using the `.custom-select*` CSS pattern. See `CompactSelect` in `RegisterClient.tsx` as the reference implementation.

2. **No API keys in chat.** Never ask Harry to paste keys. He is aware of this rule and will not do it. Configure via Vercel/Convex dashboards.

3. **No quick fixes.** This is a commercial medical platform being built to sell. Premium quality only.

4. **Clerk OTP emails** are customised in **Clerk Dashboard → Configure → Email Templates → "Email verification code"**. They cannot be changed via Resend — Resend only handles welcome emails.

5. **All hooks unconditionally at the top of every component** before any conditional logic or early returns (Next.js React rule).

6. **CSS tokens always** — never hardcode colours. See `CLAUDE.md` for the full token list.

---

## Pending / Incomplete Work

### Must do next:
- [ ] **Clerk OTP email template** — Harry needs to go to Clerk Dashboard → Configure → Email Templates → "Email verification code" and replace the generic template with a branded one. Cannot be done in code — Clerk controls this email.
- [ ] **Patient dashboard pending card** — When a new patient lands on `/patients/dashboard`, they should see a greyed-out "pending verification" card. The `verificationStatus: 'pending'` field exists in the Convex schema. The dashboard UI needs to handle this state: orange banner, grey card design, hidden action buttons (Add to Wallet, Share with clinic), locked nav links with visual lock indicator. This was referenced in the user's spec but not yet confirmed as built — **check the dashboard before assuming**.

### Should verify:
- [ ] **Convex setup** — Harry's Notes app had "Convex setup" marked as incomplete. Confirm `CLERK_ISSUER_URL` is set in both Development AND Production Convex deployments (not just Vercel).
- [ ] **`setUserRoleIfNew` reliability** — currently best-effort. A Convex webhook or Clerk webhook could make this more robust long-term.

### Known issue to watch:
- The `existingPatient === undefined` check in `RegisterClient.tsx` causes a brief `null` render (component returns `null`) while Convex query loads. This is intentional — avoids flash of the form for already-registered users. Don't change it without understanding the loading states.

---

## Convex Patterns (quick reference)

```ts
// Always: read guidelines first
// convex/_generated/ai/guidelines.md

// Queries
const patient = useQuery(api.patients.getMyPatient)
// undefined = loading, null = not found, object = found

// Mutations
const createPatient = useMutation(api.patients.createPatient)
await createPatient({ firstName: '...', ... })

// convex/_generated/ IS committed — don't gitignore it
```

---

## Patient ID Format

`IID-[3 surname][2 firstname][DD][MM][2 random]`  
Charset: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no O, no I — avoids 0/1 confusion)  
Example: `IID-SMIJO2311XK`

---

## CSS Custom Properties (from globals)

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
--warn          amber warning
--ff            font family (Inter / system)
--fb            font family fallback
```

---

## Git Commit Style

```
Phase 2c: 4-step registration, custom dropdowns
Fix: redirect already-registered patients away from register
```

Always co-author:
```
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
