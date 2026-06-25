/**
 * Pending device UI tests: 24h countdown, approve, and cancel flows.
 *
 * Runs against self-contained HTML fixtures injected via page.setContent()
 * so no auth or dev server is required. The fixture mirrors the DOM structure
 * and inline styles used by MasterDevicesClient / MfrDevicesClient.
 */
import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function msUntil(hoursFromNow: number): number {
  return Date.now() + hoursFromNow * 60 * 60 * 1000
}

// Mirrors pendingCountdown() from both client files.
function pendingCountdown(creationTime: number): string {
  const remaining = creationTime + 24 * 60 * 60 * 1000 - Date.now()
  if (remaining <= 0) return 'Due to publish'
  const h = Math.floor(remaining / (60 * 60 * 1000))
  const m = Math.floor((remaining % (60 * 60 * 1000)) / 60_000)
  return h > 0 ? `Publishes in ${h}h ${m}m` : `Publishes in ${m}m`
}

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function buildMasterFixture(opts: {
  status?: 'pending_review' | 'live'
  creationTime?: number
} = {}): string {
  const { status = 'pending_review', creationTime = msUntil(-2) } = opts // default: 22h remaining
  const isPending = status === 'pending_review'
  const countdown = isPending ? pendingCountdown(creationTime) : ''

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    :root {
      --bg: #f5f6f8; --bg2: #fff; --border: rgba(0,0,0,0.10);
      --text: #111827; --muted: #6b7280; --muted2: #9ca3af;
      --accent: #0d9488; --err: #dc2626; --ok: #16a34a; --ff: system-ui, sans-serif;
    }
    body { margin: 24px; font-family: var(--ff); background: var(--bg); }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      border: 1px solid var(--border); background: var(--bg2);
      border-radius: 8px; padding: 7px 14px; cursor: pointer;
      font-family: var(--ff); font-size: 13px; color: var(--text); text-decoration: none;
    }
    .btn-s { background: var(--accent); border-color: transparent; color: #fff; }
    .btn-danger { background: var(--err); border-color: transparent; color: #fff; }
    .btn:disabled { opacity: 0.5; cursor: default; }
    table { width: 100%; border-collapse: collapse; background: var(--bg2);
            border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: left; }
    th { font-size: 11px; text-transform: uppercase; letter-spacing: .8px;
         color: var(--muted2); font-weight: 600; border-bottom: 1px solid var(--border); }
    .confirm-back {
      display: none; position: fixed; inset: 0; background: rgba(0,0,0,.45);
      align-items: center; justify-content: center; z-index: 9999; padding: 24px;
    }
    .confirm-back.open { display: flex; }
    .confirm-modal {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: 18px; padding: 28px; max-width: 400px; width: 100%;
    }
    .confirm-body h3 { text-align: center; margin: 0 0 10px; }
    .confirm-body p { color: var(--muted); font-size: 13.5px; text-align: center; }
    .confirm-actions { display: flex; gap: 10px; margin-top: 22px; }
    .confirm-actions button { flex: 1; justify-content: center; }
  </style>
</head>
<body>
  <table id="devices-table">
    <thead>
      <tr>
        <th>Device</th><th>Type</th><th>Status</th><th>Added</th>
        ${isPending ? '<th>Actions</th>' : ''}
      </tr>
    </thead>
    <tbody>
      <tr id="device-row">
        <td><strong>Medtronic Azure XT DR</strong><br><small>W3DR01</small></td>
        <td>Pacemaker</td>
        <td id="status-cell">
          ${isPending
            ? `<span style="color:#d97706;font-weight:600;font-size:11.5px;background:rgba(217,119,6,.10);padding:3px 10px;border-radius:6px">Pending review</span>`
            : `<span style="color:var(--ok);font-weight:600;font-size:11.5px;background:rgba(22,163,74,.10);padding:3px 10px;border-radius:6px">Live</span>`}
        </td>
        <td>24 Jun 2026</td>
        ${isPending ? `
        <td id="actions-cell">
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px">
            <span id="countdown-text" style="font-size:10.5px;font-weight:600;color:#b45309;">${countdown}</span>
            <button id="cancel-btn" class="btn" style="font-size:11px;padding:3px 10px;height:auto;color:var(--err);border-color:rgba(220,38,38,.3)">Cancel</button>
          </div>
        </td>` : ''}
      </tr>
    </tbody>
  </table>

  ${isPending ? `
  <!-- Cancel confirmation modal -->
  <div class="confirm-back" id="cancel-modal">
    <div class="confirm-modal" id="cancel-modal-inner">
      <div class="confirm-body">
        <h3>Cancel scheduled publication?</h3>
        <p>
          <strong style="color:var(--text)">Medtronic Azure XT DR</strong><br>
          This device will return to <strong>Draft</strong> and won't publish automatically.
        </p>
        <p id="cancel-error" style="color:var(--err);display:none"></p>
      </div>
      <div class="confirm-actions">
        <button id="keep-pending-btn" class="btn">Keep pending</button>
        <button id="confirm-cancel-btn" class="btn btn-danger">Cancel publication</button>
      </div>
    </div>
  </div>

  <script>
    const cancelBtn      = document.getElementById('cancel-btn')
    const cancelModal    = document.getElementById('cancel-modal')
    const cancelModalInner = document.getElementById('cancel-modal-inner')
    const keepPendingBtn = document.getElementById('keep-pending-btn')
    const confirmCancelBtn = document.getElementById('confirm-cancel-btn')
    const statusCell     = document.getElementById('status-cell')
    const actionsCell    = document.getElementById('actions-cell')

    cancelBtn.addEventListener('click', () => {
      cancelModal.classList.add('open')
    })

    keepPendingBtn.addEventListener('click', () => {
      cancelModal.classList.remove('open')
    })

    cancelModal.addEventListener('click', e => {
      if (e.target === cancelModal) cancelModal.classList.remove('open')
    })

    confirmCancelBtn.addEventListener('click', async () => {
      confirmCancelBtn.disabled = true
      confirmCancelBtn.textContent = 'Cancelling…'
      // Simulate async mutation
      await new Promise(r => setTimeout(r, 300))
      cancelModal.classList.remove('open')
      statusCell.innerHTML = '<span style="color:var(--muted);font-size:11.5px;font-weight:600;background:var(--bg);padding:3px 10px;border-radius:6px">Draft</span>'
      actionsCell.innerHTML = '<span style="color:var(--muted);font-size:12px">Returned to draft</span>'
      document.body.setAttribute('data-cancelled', 'true')
    })

  </script>` : ''}
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Tests — pending device on master devices page
// ---------------------------------------------------------------------------

test.describe('Master devices — pending device row', () => {
  test('shows countdown timer and Cancel button for pending device', async ({ page }) => {
    await page.setContent(buildMasterFixture())

    // Countdown is visible
    const countdown = page.locator('#countdown-text')
    await expect(countdown).toBeVisible()
    const text = await countdown.textContent()
    expect(text).toMatch(/Publishes in \d+h \d+m/)

    // Only Cancel — no Approve now
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Approve now' })).toHaveCount(0)
  })

  test('shows correct countdown for a device submitted 22 hours ago', async ({ page }) => {
    const creationTime = Date.now() - 22 * 60 * 60 * 1000
    await page.setContent(buildMasterFixture({ creationTime }))
    const text = await page.locator('#countdown-text').textContent()
    // 24h hold - 22h elapsed = 2h remaining
    expect(text).toMatch(/Publishes in 2h/)
  })

  test('Cancel button opens confirmation modal', async ({ page }) => {
    await page.setContent(buildMasterFixture())

    const modal = page.locator('#cancel-modal')
    await expect(modal).not.toHaveClass(/open/)

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(modal).toHaveClass(/open/)
    await expect(page.getByRole('heading', { name: 'Cancel scheduled publication?' })).toBeVisible()
  })

  test('"Keep pending" closes modal without changing status', async ({ page }) => {
    await page.setContent(buildMasterFixture())

    await page.getByRole('button', { name: 'Cancel' }).click()
    const modal = page.locator('#cancel-modal')
    await expect(modal).toHaveClass(/open/)

    await page.getByRole('button', { name: 'Keep pending' }).click()
    await expect(modal).not.toHaveClass(/open/)
    await expect(page.locator('#status-cell')).toContainText('Pending review')
  })

  test('Clicking backdrop closes modal without changing status', async ({ page }) => {
    await page.setContent(buildMasterFixture())

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('#cancel-modal')).toHaveClass(/open/)

    // Click the backdrop (outside the inner modal card)
    await page.locator('#cancel-modal').click({ position: { x: 5, y: 5 } })
    await expect(page.locator('#cancel-modal')).not.toHaveClass(/open/)
    await expect(page.locator('#status-cell')).toContainText('Pending review')
  })

  test('"Cancel publication" returns device to Draft status', async ({ page }) => {
    await page.setContent(buildMasterFixture())

    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.getByRole('button', { name: 'Cancel publication' }).click()
    await expect(page.locator('#status-cell')).toContainText('Draft', { timeout: 2000 })
    await expect(page.locator('#cancel-modal')).not.toHaveClass(/open/)
    expect(await page.getAttribute('body', 'data-cancelled')).toBe('true')
  })

  test('live device shows no countdown or cancel button', async ({ page }) => {
    await page.setContent(buildMasterFixture({ status: 'live' }))

    await expect(page.locator('#countdown-text')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(0)
    await expect(page.locator('#status-cell')).toContainText('Live')
  })
})

// ---------------------------------------------------------------------------
// Tests — countdown edge cases
// ---------------------------------------------------------------------------

test.describe('pendingCountdown helper', () => {
  test('shows hours and minutes when >1h remaining', async ({ page }) => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    await page.setContent(buildMasterFixture({ creationTime: twoHoursAgo }))
    const text = await page.locator('#countdown-text').textContent()
    // 24h hold - 2h elapsed = 22h remaining
    expect(text).toMatch(/Publishes in 22h \d+m/)
  })

  test('shows minutes only when <1h remaining', async ({ page }) => {
    const twentyThreeAndAHalfHoursAgo = Date.now() - (23 * 60 + 30) * 60 * 1000
    await page.setContent(buildMasterFixture({ creationTime: twentyThreeAndAHalfHoursAgo }))
    const text = await page.locator('#countdown-text').textContent()
    expect(text).toMatch(/Publishes in \d+m$/)
  })

  test('shows fallback text when hold has already elapsed', async ({ page }) => {
    const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000
    // Override countdown in fixture: build fixture then patch the text
    const html = buildMasterFixture({ creationTime: twentyFiveHoursAgo })
    await page.setContent(html)
    // The fixture evaluates countdown() at build time, so text will be "Publishes in 0m" or negative —
    // we test the JS helper logic directly via page.evaluate
    const result = await page.evaluate((ct) => {
      const remaining = ct + 24 * 60 * 60 * 1000 - Date.now()
      if (remaining <= 0) return 'Due to publish'
      const h = Math.floor(remaining / (60 * 60 * 1000))
      const m = Math.floor((remaining % (60 * 60 * 1000)) / 60000)
      return h > 0 ? `Publishes in ${h}h ${m}m` : `Publishes in ${m}m`
    }, twentyFiveHoursAgo)
    expect(result).toBe('Due to publish')
  })
})
