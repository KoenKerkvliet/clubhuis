import type { SVGProps } from 'react'

function base(props: SVGProps<SVGSVGElement>) {
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...props,
  }
}

export function TodayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H17.5a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}

export function FriendsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <circle cx="17" cy="9.5" r="2.4" />
      <path d="M15.5 19c.1-2.2 1.6-3.9 3.6-4.4" />
    </svg>
  )
}

export function TellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="8" width="18" height="9" rx="4" />
      <path d="M8 11.5v3M6.5 13h3" />
      <circle cx="15.5" cy="11.8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function MeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" />
    </svg>
  )
}

export function AuraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 4.5c1 2 1 3.5 0 5-1-1.5-1-3 0-5Z" />
      <path d="M12 6.5c3.5 1 5.5 4 5 7.7-.6 4.1-4.3 5.8-5 5.8s-4.4-1.7-5-5.8c-.5-3.7 1.5-6.7 5-7.7Z" />
    </svg>
  )
}
