import type { SVGProps } from 'react'

/** Het Clubhuis-beeldmerk (huisje + verhalenbubbel), inline zodat het scherp schaalt zonder extra request. */
export function LogoMark({ size = 28, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" {...props}>
      <path d="M20 48 L12.4 61.3 Q11.8 62.3 12.9 61.9 L32 51 Z" fill="#3F739F" />
      <rect x="8" y="26" width="48" height="26" rx="9" fill="#3F739F" />
      <path
        d="M4.6 29.4 L29.6 8.2 Q32 6.2 34.4 8.2 L59.4 29.4 Z"
        fill="#F78E2D"
        stroke="#F78E2D"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <rect x="25.5" y="33" width="13" height="14" rx="3.6" fill="#F7F4EF" />
    </svg>
  )
}
