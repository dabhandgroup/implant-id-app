'use client'

import { useQuery } from 'convex/react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '../../../../../convex/_generated/api'
import type { Id } from '../../../../../convex/_generated/dataModel'

const MRI_COLOUR: Record<string, string> = {
  safe: 'var(--ok)', conditional: '#d97706', unsafe: 'var(--err)', unknown: 'var(--muted)',
}

export default function MfrDeviceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as Id<'devices'>
  const device = useQuery(api.devices.getDeviceById, { id })

  if (device === undefined) {
    return (
      <div style={{ padding: '60px 40px', color: 'var(--muted)', fontFamily: 'var(--ff)' }}>Loading…</div>
    )
  }

  if (device === null) {
    return (
      <div style={{ padding: '60px 40px', fontFamily: 'var(--ff)' }}>
        <div style={{ color: 'var(--err)', marginBottom: 16 }}>Device not found.</div>
        <button className="btn" onClick={() => router.push('/manufacturer/devices')}>← Back to devices</button>
      </div>
    )
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: 760, margin: '0 auto', fontFamily: 'var(--ff)' }}>
      <button
        className="btn"
        style={{ marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        onClick={() => router.push('/manufacturer/devices')}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to devices
      </button>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px' }}>{device.model ?? 'Unnamed device'}</h1>
            <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>{device.manufacturer}</div>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 600, padding: '4px 12px', borderRadius: 6, background: `color-mix(in srgb,${MRI_COLOUR[device.mriStatus ?? 'unknown']} 12%,transparent)`, color: MRI_COLOUR[device.mriStatus ?? 'unknown'] }}>
            {device.mriStatus === 'safe' ? 'MR Safe' : device.mriStatus === 'conditional' ? 'MR Conditional' : device.mriStatus === 'unsafe' ? 'MR Unsafe' : 'Unknown'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            ['Device type',    device.deviceType],
            ['Classification', device.classification],
            ['Field strengths',device.fieldStrengths],
            ['SAR limit',      device.sarLimit],
            ['Status',         device.status],
          ].map(([label, value]) => value ? (
            <div key={String(label)}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--muted2)', fontWeight: 600, marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{value}</div>
            </div>
          ) : null)}
        </div>
      </div>

      <div className="card" style={{ background: 'color-mix(in srgb,var(--accent) 4%,transparent)', border: '1px solid color-mix(in srgb,var(--accent) 15%,transparent)' }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8, color: 'var(--accent-deep)' }}>Requesting changes</div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 16px' }}>
          Device data on Implant ID is verified before publishing. To request a change to MRI safety parameters, field strengths, or other clinical data, submit a change request for review by the Implant ID team.
        </p>
        <a href="/manufacturer/dashboard" className="btn btn-s" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Submit change request
        </a>
      </div>
    </div>
  )
}
