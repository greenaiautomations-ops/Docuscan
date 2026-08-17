import { APP_NAME } from '../../utils/constants'

interface LogoProps {
  /** Pixel size of the square mark. */
  size?: number
  /** Show the "DocVault" wordmark next to the mark. */
  withWordmark?: boolean
  className?: string
}

/**
 * The DocVault mark: a document (folded corner) with a small padlock badge,
 * representing a secure "vault" for your documents. Single inline SVG so it
 * themes cleanly (no external asset request) and matches `public/favicon.svg`.
 */
export function Logo({ size = 32, withWordmark = false, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="docvault-logo-gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="1" stopColor="#4338ca" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#docvault-logo-gradient)" />
        <path
          d="M9.5 7.5h8l4.5 4.5v12a1 1 0 0 1-1 1h-11.5a1 1 0 0 1-1-1v-15.5a1 1 0 0 1 1-1z"
          fill="#ffffff"
        />
        <path d="M17.5 7.5v4.5h4.5" fill="none" stroke="#4338ca" strokeWidth="1" strokeLinejoin="round" />
        <circle cx="21" cy="22" r="6.5" fill="#4338ca" stroke="#ffffff" strokeWidth="1.5" />
        <path
          d="M18.9 21.1v-1.3a2.1 2.1 0 1 1 4.2 0v1.3"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <rect x="18.3" y="20.6" width="5.4" height="4.3" rx="1.1" fill="#ffffff" />
        <circle cx="21" cy="22.6" r="0.9" fill="#4338ca" />
      </svg>
      {withWordmark && (
        <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{APP_NAME}</span>
      )}
    </div>
  )
}
