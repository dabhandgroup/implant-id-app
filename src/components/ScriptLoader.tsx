'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Appends scripts via DOM on every route change so they re-execute on client
// navigation. Browser cache means no re-download — just re-execution.
export default function ScriptLoader({ scripts }: { scripts: string[] }) {
  const pathname = usePathname()

  useEffect(() => {
    const elements: HTMLScriptElement[] = []

    // Load sequentially so scripts that depend on earlier ones work correctly
    scripts.reduce((chain, src) => {
      return chain.then(
        () =>
          new Promise<void>((resolve) => {
            const el = document.createElement('script')
            el.src = src
            el.onload = () => resolve()
            el.onerror = () => resolve()
            document.body.appendChild(el)
            elements.push(el)
          })
      )
    }, Promise.resolve())

    return () => {
      elements.forEach((el) => {
        try { el.parentNode?.removeChild(el) } catch { /* already removed */ }
      })
    }
  // Re-run whenever the page changes (pathname) or script list changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, scripts.join(',')])

  return null
}
