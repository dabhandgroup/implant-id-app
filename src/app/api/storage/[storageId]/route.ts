/**
 * GET /api/storage/[storageId]
 * Proxies Convex file storage downloads for authenticated admin/manufacturer users.
 * Used to serve manufacturer verification documents in the master admin portal.
 */
export const runtime = 'nodejs'

import { auth }       from '@clerk/nextjs/server'
import { fetchQuery } from 'convex/nextjs'
import { api }        from '../../../../../convex/_generated/api'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ storageId: string }> },
) {
  const clerkAuth = await auth()
  if (!clerkAuth.userId) return new Response('Unauthorised', { status: 401 })

  const convexToken = await clerkAuth.getToken({ template: 'convex' })

  // Verify user is admin or manufacturer
  const me = await fetchQuery(api.users.getMe, {}, { token: convexToken ?? undefined })
  if (!me || !['admin', 'manufacturer'].includes(me.role ?? '')) {
    return new Response('Forbidden', { status: 403 })
  }

  const { storageId } = await params
  const fileUrl = await fetchQuery(api.manufacturers.getStorageUrl, { storageId }, { token: convexToken ?? undefined })
  if (!fileUrl) return new Response('File not found', { status: 404 })

  const upstream = await fetch(fileUrl)
  return new Response(upstream.body, {
    headers: {
      'Content-Type':        upstream.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Disposition': upstream.headers.get('Content-Disposition') ?? 'inline',
      'Cache-Control':       'private, max-age=3600',
    },
  })
}
