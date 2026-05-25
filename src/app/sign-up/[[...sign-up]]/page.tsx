import { redirect } from 'next/navigation'

// We use a custom login page at /login — redirect anything Clerk sends here
export default function SignUpPage() {
  redirect('/login')
}
