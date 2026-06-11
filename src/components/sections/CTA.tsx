import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { SketchSun } from '#/components/Sketches'
import { cn } from '#/lib/utils'

export interface CtaButton {
  label: string
  to: string
  /** primary = mustard pill (default); ghost = outlined paper */
  variant?: 'primary' | 'ghost'
}

export interface CtaMetaItem {
  /** Bold serif italic top line (phone, email, address) */
  label: string
  /** Smaller secondary line below */
  detail: string
}

interface CTASectionProps {
  eyebrow?: string
  /** Title — plain text or JSX (e.g. with an `<em>` accent) */
  title: ReactNode
  description?: string
  buttons: CtaButton[]
  meta?: CtaMetaItem[]
  /** Decorative wiggling sun in the top-right corner */
  showSketch?: boolean
  className?: string
}

const primaryStyle = {
  background: 'var(--accent-3)',
  borderColor: 'var(--accent-3)',
  color: 'var(--ink)',
}

const ghostStyle = {
  color: 'var(--paper)',
  borderColor: 'var(--paper)',
}

export function CTASection({
  eyebrow,
  title,
  description,
  buttons,
  meta,
  showSketch = false,
  className,
}: CTASectionProps) {
  return (
    <section className={cn('pb-24', className)}>
      <div className="page-wrap">
        <div className="cta-band">
          <div className="relative z-2">
            {eyebrow && (
              <div
                className="section-eyebrow"
                style={{ color: 'var(--accent-3)' }}
              >
                {eyebrow}
              </div>
            )}
            <h2 className="text-[clamp(36px,5vw,64px)] leading-[1.05] text-(--paper) max-w-[18ch] [&_em]:italic [&_em]:text-(--accent-3)">
              {title}
            </h2>
            {description && (
              <p className="text-primary max-w-[38ch] mt-5 mb-7">
                {description}
              </p>
            )}
            {buttons.length > 0 && (
              <div className="flex flex-wrap gap-3.5">
                {buttons.map((btn) => {
                  const isGhost = btn.variant === 'ghost'
                  return (
                    <Link
                      key={`${btn.label}-${btn.to}`}
                      to={btn.to as string}
                      title={btn.label}
                    >
                      <span
                        className={cn('btn-paper', isGhost && 'btn-ghost')}
                        style={isGhost ? ghostStyle : primaryStyle}
                      >
                        {btn.label}
                        {!isGhost && (
                          <span
                            aria-hidden
                            style={{ fontSize: 18, lineHeight: 0.8 }}
                          >
                            →
                          </span>
                        )}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {meta && meta.length > 0 && (
            <div className="cta-meta">
              {meta.map((m) => {
                const href = m.label.includes('@')
                  ? `mailto:${m.label}`
                  : /^\+?[\d\s\-()]{7,}$/.test(m.label)
                    ? `tel:${m.label.replace(/[\s\-()]/g, '')}`
                    : null
                return (
                  <div key={`${m.label}-${m.detail}`}>
                    {href ? (
                      <a href={href} className="hover:text-(--accent-3)">
                        <b>{m.label}</b>
                      </a>
                    ) : (
                      <b>{m.label}</b>
                    )}
                    {/* {m.detail} */}
                  </div>
                )
              })}
            </div>
          )}

          {showSketch && (
            <div
              className="float wiggle"
              style={{ top: 20, right: 20, opacity: 0.7 }}
            >
              <SketchSun size={80} color="var(--accent-3)" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
