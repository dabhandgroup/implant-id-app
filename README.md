# Implant ID — Next.js Project

Migrated from static HTML/CSS to Next.js App Router with static export (v61).

## Quick start

```bash
npm install
npm run dev      # Dev server at localhost:3000
npm run build    # Static export to /out
```

## Deployment (Vercel)

Push to your Vercel-connected repo or drag the project folder into Vercel. The `next.config.ts` is set to `output: 'export'` so Vercel will generate static HTML. The `vercel.json` handles:

- `cleanUrls: true` — strips `.html` extensions
- `trailingSlash: false`
- Rewrites for `/device/:mn` → `/device-page` and `/clinics/patient/:mn` → `/clinics/patient-view`

## Architecture

### Layout types

| Type | Pages | Shared elements |
|------|-------|----------------|
| **Marketing** | Homepage, /patients, /clinics, /about, /wallet, /library, etc. | AnnounceBar + Nav + Footer |
| **Auth** | /login, /forgot, /register-clinic, /patients/register, /admin | Standalone (no nav/footer) |
| **Dashboard** | /clinics/dashboard, /patients/dashboard, /admin/dashboard, etc. | Self-contained (sidebar + mobile nav in page content) |

### Key files

```
src/
├── app/
│   ├── layout.tsx          ← Root layout (fonts, global CSS, viewport)
│   ├── page.tsx            ← Homepage
│   ├── page.css            ← Homepage-specific styles
│   ├── content.ts          ← Homepage HTML content
│   ├── clinics/
│   │   ├── page.tsx        ← /clinics marketing page
│   │   ├── dashboard/      ← /clinics/dashboard
│   │   ├── library/        ← /clinics/library
│   │   └── patient-view/   ← /clinics/patient/:mn (via rewrite)
│   ├── patients/
│   │   ├── page.tsx        ← /patients marketing page
│   │   ├── dashboard/      ← /patients/dashboard
│   │   ├── account/        ← /patients/account
│   │   └── ...
│   └── ...
├── components/
│   ├── AnnounceBar.tsx     ← Shared announcement bar
│   ├── Nav.tsx             ← Shared marketing navigation + mobile menu
│   ├── Footer.tsx          ← Shared footer
│   ├── MarketingLayout.tsx ← Wraps: AnnounceBar + Nav + {children} + Footer
│   ├── AuthLayout.tsx      ← Pass-through wrapper
│   └── ScriptLoader.tsx    ← Client component for loading page scripts
├── styles/
│   └── globals.css         ← Design system (was styles.css)
public/
├── icon.svg
├── wordmark.svg
├── implants.js             ← Device database
├── scanner.js              ← Barcode scanner
└── scripts/                ← Per-page JS extracted from inline <script> blocks
```

### How content works

Each page has three files:
- `page.tsx` — Server component with metadata export, renders content + scripts
- `content.ts` — HTML body content as a JSON-safe string
- `page.css` — Page-specific inline styles (extracted from original `<style>` blocks)

The HTML is rendered via `dangerouslySetInnerHTML`. This preserves 100% visual fidelity with the original static site while giving you the consistency benefits of shared components (Nav, Footer, AnnounceBar).

### URL routing

| URL | Route | Notes |
|-----|-------|-------|
| `/` | `app/page.tsx` | Homepage |
| `/patients` | `app/patients/page.tsx` | Patients landing |
| `/clinics` | `app/clinics/page.tsx` | Clinics landing |
| `/device/W3DR01` | Rewrite → `app/device-page/page.tsx` | Device detail (reads mn from path/query) |
| `/library` | `app/library/page.tsx` | Was feature-library.html |
| `/wallet` | `app/wallet/page.tsx` | Was feature-wallet.html |
| `/scan` | `app/scan/page.tsx` | Was feature-scan.html |
| `/patients/register` | `app/patients/register/page.tsx` | Was register-patient.html |
| `/clinics/patient/:mn` | Rewrite → `app/clinics/patient-view/page.tsx` | Patient view |

## What changed from v60

- **Shared components**: Nav, Footer, and AnnounceBar are now single-source-of-truth React components — no more copy-paste drift between pages
- **Per-page metadata**: Each page exports its own `<title>` and `<meta description>`
- **Clean routing**: Next.js file-based routing replaces most Vercel rewrites
- **Per-page CSS**: Inline `<style>` blocks extracted to separate `.css` files
- **Per-page scripts**: Inline `<script>` blocks extracted to `/public/scripts/` and loaded via `next/script`
- **Link normalisation**: All `.html` links converted to clean URLs
