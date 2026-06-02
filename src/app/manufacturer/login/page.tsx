import { redirect } from 'next/navigation'

// Old approval email links pointed to /manufacturer/login — redirect to the real login page.
// The layout protects /manufacturer/* with requireRole, so we must handle this
// before the layout auth check fires.
export default function ManufacturerLoginRedirect({
  searchParams,
}: {
  searchParams: { email?: string }
}) {
  const email = searchParams?.email ?? ''
  const dest  = email
    ? `/login?email=${encodeURIComponent(email)}`
    : '/login'
  redirect(dest)
}
