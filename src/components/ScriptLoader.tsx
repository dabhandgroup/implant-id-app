'use client'

import Script from 'next/script'

export default function ScriptLoader({ scripts }: { scripts: string[] }) {
  return (
    <>
      {scripts.map((src, i) => (
        <Script key={i} src={src} strategy="afterInteractive" />
      ))}
    </>
  )
}
