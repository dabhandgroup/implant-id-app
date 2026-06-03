# Implant ID — v9 Session Brief

**Repo:** `github.com/dabhandgroup/implant-id-app` · branch `main`  
**Live:** `portal.implantid.io`  
**Stack:** Next.js 15 App Router · Convex · Clerk v7 · Resend · plain CSS  
**Previous session:** This is a continuation — all features below are carry-overs or known issues.

---

## Where We Left Off (v8 end state)

Everything listed below is **already built** — v9 is about fixing remaining bugs and completing unfinished features.

### What's working
- Patient portal (dashboard, share, find care, emergency info, account)
- Clinic portal (dashboard, scan, patients, settings, staff)
- Surgeon portal
- Master admin portal (overview, patients, clinics, manufacturers, devices, bulk upload, settings)
- Manufacturer portal (login at `/manufacturer/login`, dashboard, devices, onboarding at `/manufacturer/onboarding`)
- Apple Wallet pass generation (real .pkpass, MRI badge icons)
- QR code in share emails (stored in Convex file storage)
- Admin status override (test MRI card colours from master admin → patient detail)
- Manufacturer onboarding form (5 steps, document uploads to Convex storage)
- Real-time admin notifications (bell icon, live Convex data)
- Mobile responsive fixes across all portals (mostly done)

---

## Priority Fixes for v9

### 1. Emergency info page — make it editable
**File:** `src/app/patients/emergency/EmergencyClient.tsx`  
Currently read-only. Patients need to be able to add/update:
- Current medications
- Allergies (non-implant)
- Home address
- Additional notes
They **cannot** edit implant type/device — that's clinic-only.  
Needs a Convex mutation + form fields on the page.  
Schema fields to add: `medications`, `homeAddress`, `otherAllergies` on the `patients` table.

### 2. Signed PDF for bulk import + individual device adds
When a manufacturer submits devices (bulk or single), they should receive/download a signed certification PDF containing:
- Device list submitted
- Submitter name + job title
- Date + time
- Digital signature block
- Implant ID branding
No PDF library installed yet — use `jsPDF` or `@react-pdf/renderer`.

### 3. Google Wallet
The Google Wallet button exists but links nowhere functional.  
To implement, Harry needs to provide:
- Google Pay Passes API service account JSON (from Google Cloud Console)
- Enable Google Wallet API in GCP project  
- Merchant ID from Google Pay Business Console
Once credentials are provided, build JWT signing + pass generation at `/api/wallet/google-pass`.

### 4. Patient history/timeline
`DashboardClient.tsx` shows "Events will appear here as your record builds up" — no data.  
Need to track events: shares, verifications, clinic scans, wallet adds.  
Create a `patientEvents` Convex table and write to it on key actions.

### 5. Documents section (patient dashboard)
Currently shows "Documents will appear here once your clinical team adds your implant details."  
Needs a file upload flow for surgeons/clinics to attach PDFs (IFUs, scan reports) to a patient's record.  
Convex file storage already used for manufacturer docs — same pattern.

---

## Known Bugs to Fix

| Bug | Location | Notes |
|-----|----------|-------|
| Master search still slow on first load | `convex/search.ts` + `SearchClient.tsx` | Scans 200 patients sequentially — needs Convex search index |
| Manufacturer dashboard shows no devices if company name doesn't match exactly | `convex/devices.ts:listMyDevices` | Queries by `manufacturer` string — case sensitive |
| `listApprovedClinics` query doesn't exist | `master/dashboard/page.tsx` line 17 | Falls back to `listClinics` — works but noisy |
| Chrome autofill on light-theme pages still flashes on very first fill | `globals.css` | Animation timing may need tuning |
| Manufacturer portal has no `Add Device` page | `/manufacturer/devices/add` | Route exists in shell nav but page returns 404 |

---

## Remaining Incomplete Features (lower priority)

- **Appointments system** — no data model, marked "Coming soon"
- **IFUs & manuals** in manufacturer dashboard — shows placeholder
- **Audit log** in manufacturer dashboard — shows placeholder  
- **Google Wallet** — see priority #3 above
- **Clinic referral / affiliate system** — discussed but not started
- **Invite a friend** feature for patients — discussed but not started

---

## Key Files Reference

```
convex/
  patients.ts          — patient mutations/queries incl. adminSetPatientStatus
  clinics.ts           — clinic applications, approval flow
  manufacturers.ts     — manufacturer onboarding, approval, device submissions
  devices.ts           — device CRUD, bulkInsertDevices, listMyDevices
  email.ts             — all Resend emails (share, verification, approval)
  schema.ts            — full Convex schema

src/app/
  patients/            — patient-facing portal
  clinics/             — clinic staff portal
  master/              — master admin portal
    dashboard/page.tsx — real Convex data, 'use client'
    MasterShell.tsx    — sidebar + mobile nav + search drawer
  manufacturer/
    login/             — dark-themed login (/manufacturer/login)
    dashboard/         — manufacturer dashboard
    onboarding/        — 5-step application form
  api/wallet/pass/     — Apple Wallet .pkpass generation
  api/storage/         — Convex file proxy for admin document downloads

src/lib/requireRole.ts — server-side role guard (roles: patient, clinic_staff, surgeon, admin, manufacturer)
src/middleware.ts      — Clerk middleware + public routes list
```

---

## Environment Notes

- `CLERK_SECRET_KEY` — needed in Convex env vars for admin account creation
- `APPLE_PASS_TYPE_ID`, `APPLE_TEAM_ID`, `APPLE_PASS_CERT`, `APPLE_WWDR_CERT` — Apple Wallet certs
- `RESEND_API_KEY` — email sending
- All Convex env vars must be set in **both** Development and Production deployments

---

## Coding Standards

- **No Tailwind** — plain CSS with custom properties (`--accent`, `--bg`, `--text`, etc.)
- **All React hooks unconditionally at top** — before any early returns
- **No native `<select>`** — use `CustomSelect` from `src/components/ui/`
- **Buttons:** `.btn` / `.btn.btn-s` / `.btn.btn-danger`
- **Inputs:** `.input` class
- Patient ID format: `IID-[3 surname][2 firstname][DD][MM][2 random]`
- Git commits: co-author with `Claude Sonnet 4.6 <noreply@anthropic.com>`
- Build command: `npx convex deploy --cmd 'next build'`
- Always fix build errors before moving on — Vercel auto-deploys from `main`
