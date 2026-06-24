/**
 * iOS-style sliding tab tests.
 *
 * Tests run against a self-contained HTML fixture injected via page.setContent()
 * so no auth or dev server is required. The fixture mirrors the exact CSS from
 * master.css and the same DOM structure used by ManufacturersClient and
 * MasterDevicesClient.
 */
import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Fixture — mirrors master.css tab rules exactly
// ---------------------------------------------------------------------------

function buildFixture(tabCount: number, labels: string[], activeIdx = 0) {
  const tabsHtml = labels
    .map(
      (label, i) =>
        `<button role="tab" aria-selected="${i === activeIdx}" class="m-tab${i === activeIdx ? ' active' : ''}" data-idx="${i}">${label}</button>`,
    )
    .join('\n')

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root {
    --bg: #f5f6f8;
    --bg2: #ffffff;
    --border: rgba(0,0,0,0.10);
    --text: #111827;
    --muted: #6b7280;
    --ff: system-ui, sans-serif;
    --accent: #0d9488;
  }
  body { margin: 24px; font-family: var(--ff); background: #f0f2f5; }

  /* master.css tab rules — keep in sync */
  .m-tabs {
    position: relative;
    display: flex;
    gap: 0;
    margin-bottom: 20px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 4px;
  }
  .m-tab-slider {
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px;
    width: calc((100% - 8px) / var(--m-tab-count, 2));
    transform: translateX(calc(var(--m-tab-idx, 0) * 100%));
    background: var(--bg2);
    border-radius: 7px;
    box-shadow: 0 1px 5px rgba(0,0,0,.09);
    transition: transform 220ms cubic-bezier(.4,0,.2,1);
    pointer-events: none;
    z-index: 0;
    will-change: transform;
  }
  .m-tab {
    flex: 1;
    padding: 8px 16px;
    border-radius: 7px;
    font-family: var(--ff);
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    cursor: pointer;
    background: transparent;
    border: 0;
    transition: color .15s;
    white-space: nowrap;
    text-align: center;
    position: relative;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .m-tab.active { color: var(--text); }
  .m-tab:hover:not(.active) { color: var(--text); }

  /* Mobile override */
  @media (max-width: 640px) {
    .m-tabs { flex-wrap: nowrap; padding: 3px; }
    .m-tab-slider { top: 3px; bottom: 3px; left: 3px; width: calc((100% - 6px) / var(--m-tab-count, 2)); }
    .m-tab { flex: 1; padding: 8px 6px; font-size: 12px; min-width: 0; }
  }
</style>
</head>
<body>
<div
  id="tabs"
  class="m-tabs"
  role="tablist"
  style="--m-tab-count: ${tabCount}; --m-tab-idx: ${activeIdx}"
>
  <div class="m-tab-slider" aria-hidden="true"></div>
  ${tabsHtml}
</div>

<div id="panel" data-active="${activeIdx}">Panel ${activeIdx}</div>

<script>
  const tabs = document.querySelectorAll('.m-tab')
  const container = document.getElementById('tabs')
  const panel = document.getElementById('panel')

  tabs.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false') })
      btn.classList.add('active')
      btn.setAttribute('aria-selected', 'true')
      container.style.setProperty('--m-tab-idx', String(i))
      panel.textContent = 'Panel ' + i
      panel.dataset.active = String(i)
    })
  })
</script>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getSliderTransformX(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const slider = document.querySelector('.m-tab-slider') as HTMLElement
    const matrix = getComputedStyle(slider).transform
    if (!matrix || matrix === 'none') return 0
    const m = new DOMMatrix(matrix)
    return m.m41
  })
}

async function getSliderWidth(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    return (document.querySelector('.m-tab-slider') as HTMLElement).getBoundingClientRect().width
  })
}

async function getTabWidth(page: import('@playwright/test').Page, idx: number): Promise<number> {
  return page.evaluate((i) => {
    const tabs = document.querySelectorAll('.m-tab')
    return tabs[i].getBoundingClientRect().width
  }, idx)
}

// 5px tolerance — tight enough to catch real misalignment, loose enough for sub-pixel rounding
const PX = 5

// ---------------------------------------------------------------------------
// 2-tab tests (Devices — Catalogue / Trash)
// ---------------------------------------------------------------------------

test.describe('2-tab: Devices (Catalogue / Trash)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(buildFixture(2, ['Catalogue', 'Trash'], 0))
  })

  test('first tab is active by default', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Catalogue' })).toHaveClass(/active/)
    await expect(page.getByRole('tab', { name: 'Trash' })).not.toHaveClass(/active/)
  })

  test('aria-selected reflects active tab', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Catalogue' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Trash' })).toHaveAttribute('aria-selected', 'false')
  })

  test('slider starts at translateX(0)', async ({ page }) => {
    const x = await getSliderTransformX(page)
    expect(Math.abs(x)).toBeLessThan(PX)
  })

  test('clicking Trash moves active class and slider', async ({ page }) => {
    await page.getByRole('tab', { name: 'Trash' }).click()

    await expect(page.getByRole('tab', { name: 'Trash' })).toHaveClass(/active/)
    await expect(page.getByRole('tab', { name: 'Catalogue' })).not.toHaveClass(/active/)
    await expect(page.getByRole('tab', { name: 'Trash' })).toHaveAttribute('aria-selected', 'true')

    await page.waitForTimeout(260)

    const sliderW = await getSliderWidth(page)
    const x = await getSliderTransformX(page)
    expect(Math.abs(x - sliderW)).toBeLessThan(PX)
  })

  test('slider width equals one tab width', async ({ page }) => {
    const sliderW = await getSliderWidth(page)
    const tabW = await getTabWidth(page, 0)
    expect(Math.abs(sliderW - tabW)).toBeLessThan(PX)
  })

  test('clicking back to Catalogue slides pill back to 0', async ({ page }) => {
    await page.getByRole('tab', { name: 'Trash' }).click()
    await page.waitForTimeout(260)
    await page.getByRole('tab', { name: 'Catalogue' }).click()
    await page.waitForTimeout(260)

    const x = await getSliderTransformX(page)
    expect(Math.abs(x)).toBeLessThan(PX)
  })

  test('panel content reflects active tab', async ({ page }) => {
    await expect(page.locator('#panel')).toHaveText('Panel 0')
    await page.getByRole('tab', { name: 'Trash' }).click()
    await expect(page.locator('#panel')).toHaveText('Panel 1')
  })

  test('slider has CSS transition property', async ({ page }) => {
    const transition = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.m-tab-slider') as HTMLElement).transition
    )
    expect(transition).toContain('transform')
  })
})

// ---------------------------------------------------------------------------
// 3-tab tests (Manufacturers — All / Pending / Rejected)
// ---------------------------------------------------------------------------

test.describe('3-tab: Manufacturers (All / Pending / Rejected)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setContent(buildFixture(3, ['All Manufacturers', 'Pending', 'Rejected'], 0))
  })

  test('first tab active by default', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'All Manufacturers' })).toHaveClass(/active/)
    await expect(page.getByRole('tab', { name: 'Pending' })).not.toHaveClass(/active/)
    await expect(page.getByRole('tab', { name: 'Rejected' })).not.toHaveClass(/active/)
  })

  test('slider at index 0 initially', async ({ page }) => {
    const x = await getSliderTransformX(page)
    expect(Math.abs(x)).toBeLessThan(PX)
  })

  test('clicking Pending moves slider to index 1', async ({ page }) => {
    await page.getByRole('tab', { name: 'Pending' }).click()
    await page.waitForTimeout(260)

    const sliderW = await getSliderWidth(page)
    const x = await getSliderTransformX(page)
    expect(Math.abs(x - sliderW)).toBeLessThan(PX)
    await expect(page.getByRole('tab', { name: 'Pending' })).toHaveClass(/active/)
  })

  test('clicking Rejected moves slider to index 2', async ({ page }) => {
    await page.getByRole('tab', { name: 'Rejected' }).click()
    await page.waitForTimeout(260)

    const sliderW = await getSliderWidth(page)
    const x = await getSliderTransformX(page)
    expect(Math.abs(x - sliderW * 2)).toBeLessThan(PX)
    await expect(page.getByRole('tab', { name: 'Rejected' })).toHaveClass(/active/)
  })

  test('slider width is 1/3 of usable container width', async ({ page }) => {
    const sliderW = await getSliderWidth(page)
    const tabW = await getTabWidth(page, 0)
    expect(Math.abs(sliderW - tabW)).toBeLessThan(PX)
  })

  test('can jump from Rejected back to All Manufacturers', async ({ page }) => {
    await page.getByRole('tab', { name: 'Rejected' }).click()
    await page.waitForTimeout(260)
    await page.getByRole('tab', { name: 'All Manufacturers' }).click()
    await page.waitForTimeout(260)

    const x = await getSliderTransformX(page)
    expect(Math.abs(x)).toBeLessThan(PX)
  })

  test('aria-selected updates on every tab click', async ({ page }) => {
    await page.getByRole('tab', { name: 'Pending' }).click()
    await expect(page.getByRole('tab', { name: 'All Manufacturers' })).toHaveAttribute('aria-selected', 'false')
    await expect(page.getByRole('tab', { name: 'Pending' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Rejected' })).toHaveAttribute('aria-selected', 'false')
  })
})

// ---------------------------------------------------------------------------
// Responsive layout — slider math holds at all viewports
// ---------------------------------------------------------------------------

test.describe('Responsive: slider stays aligned at all widths', () => {
  for (const [label, width, height] of [
    ['mobile 375px', 375, 812],
    ['tablet 768px', 768, 1024],
    ['desktop 1280px', 1280, 800],
  ] as const) {
    test(`2-tab: slider aligned on ${label}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.setContent(buildFixture(2, ['Catalogue', 'Trash'], 0))

      const sliderW = await getSliderWidth(page)
      const tabW = await getTabWidth(page, 0)
      expect(Math.abs(sliderW - tabW)).toBeLessThan(PX)

      await page.getByRole('tab', { name: 'Trash' }).click()
      await page.waitForTimeout(260)

      const x = await getSliderTransformX(page)
      expect(Math.abs(x - sliderW)).toBeLessThan(PX)
    })

    test(`3-tab: slider aligned on ${label}`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.setContent(buildFixture(3, ['All Manufacturers', 'Pending', 'Rejected'], 0))

      const sliderW = await getSliderWidth(page)
      const tabW = await getTabWidth(page, 0)
      expect(Math.abs(sliderW - tabW)).toBeLessThan(PX)

      await page.getByRole('tab', { name: 'Rejected' }).click()
      await page.waitForTimeout(260)

      const x = await getSliderTransformX(page)
      expect(Math.abs(x - sliderW * 2)).toBeLessThan(PX)
    })
  }
})

// ---------------------------------------------------------------------------
// Keyboard accessibility — tabs are focusable and activatable
// ---------------------------------------------------------------------------

test.describe('Keyboard accessibility', () => {
  test('tabs are focusable and activatable with Space', async ({ page }) => {
    await page.setContent(buildFixture(2, ['Catalogue', 'Trash'], 0))

    await page.getByRole('tab', { name: 'Trash' }).focus()
    await page.keyboard.press('Space')
    await page.waitForTimeout(260)

    await expect(page.getByRole('tab', { name: 'Trash' })).toHaveClass(/active/)
    const x = await getSliderTransformX(page)
    const sliderW = await getSliderWidth(page)
    expect(Math.abs(x - sliderW)).toBeLessThan(PX)
  })

  test('tabs are activatable with Enter', async ({ page }) => {
    await page.setContent(buildFixture(3, ['All Manufacturers', 'Pending', 'Rejected'], 0))

    await page.getByRole('tab', { name: 'Pending' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('tab', { name: 'Pending' })).toHaveClass(/active/)
  })
})

// ---------------------------------------------------------------------------
// Visual — slider never overflows the tabs container
// ---------------------------------------------------------------------------

test('slider stays within tabs container bounds at every position', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.setContent(buildFixture(3, ['All Manufacturers', 'Pending', 'Rejected'], 0))

  for (let i = 0; i < 3; i++) {
    const container = await page.locator('.m-tabs').boundingBox()
    const slider = await page.locator('.m-tab-slider').boundingBox()

    expect(slider!.x).toBeGreaterThanOrEqual(container!.x - 1)
    expect(slider!.x + slider!.width).toBeLessThanOrEqual(container!.x + container!.width + 1)

    if (i < 2) {
      const labels = ['All Manufacturers', 'Pending', 'Rejected']
      await page.getByRole('tab', { name: labels[i + 1] }).click()
      await page.waitForTimeout(260)
    }
  }
})
