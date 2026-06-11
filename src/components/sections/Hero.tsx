import type { CSSProperties, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Image } from '#/components/ui/image'
import {
  SketchArrow,
  SketchBird,
  SketchCloud,
  SketchLeaf,
  SketchPaperBoat,
  SketchSun,
} from '#/components/Sketches'
import { cn } from '#/lib/utils'

export interface HeroButton {
  label: string
  to: string
  /** accent = terracotta (default); ghost = outlined paper */
  variant?: 'accent' | 'ghost'
}

export interface HeroHandnote {
  /** Italic serif handwritten line shown next to a sketch arrow */
  text: string
}

export interface HeroCollageImage {
  src: string
  alt: string
  /** Inline placement — uses CSS percent values for top/left/right/bottom and width/height */
  style: CSSProperties
  /** Fallback caption shown when src is empty */
  fallback?: string
}

export interface HeroCollage {
  images: HeroCollageImage[]
  /** Show the four floating sketch decorations (sun, bird, leaf, paper boat) */
  showSketches?: boolean
  /** Show a faint cloud sketch above the collage on lg+ */
  showCloud?: boolean
}

interface HeroProps {
  kicker?: string
  /** Title — text or JSX. Wrap accent words in `<em>` for terracotta italic */
  title: ReactNode
  description?: ReactNode
  /** Cap headline width with a CSS unit, e.g. '16ch', '18ch' */
  headlineMaxWidth?: string
  /** Cap description width with a CSS unit, default '60ch' */
  descriptionMaxWidth?: string
  /** Optional CTAs */
  buttons?: HeroButton[]
  /** Optional italic note with a hand-drawn arrow */
  handnote?: HeroHandnote
  /** Optional photo collage on the right (turns the hero into a 2-column split) */
  collage?: HeroCollage
  className?: string
}

const DEFAULT_COLLAGE_PLACEMENT: CSSProperties[] = [
  {
    top: '6%',
    left: '8%',
    width: '62%',
    height: '58%',
    transform: 'rotate(-3deg)',
    zIndex: 2,
  },
  {
    bottom: '4%',
    right: '4%',
    width: '52%',
    height: '50%',
    transform: 'rotate(2.5deg)',
    zIndex: 1,
    background: 'var(--bg-2)',
  },
]

export function Hero({
  kicker,
  title,
  description,
  headlineMaxWidth,
  descriptionMaxWidth = '60ch',
  buttons,
  handnote,
  collage,
  className,
}: HeroProps) {
  const content = (
    <div className="rise-in">
      {kicker && <div className="hero-eyebrow">{kicker}</div>}
      <h1
        className="hero-headline"
        style={headlineMaxWidth ? { maxWidth: headlineMaxWidth } : undefined}
      >
        {title}
      </h1>
      {description && (
        <p
          className="mt-7 mb-9 text-[19px] leading-relaxed text-(--ink-soft)"
          style={{ maxWidth: descriptionMaxWidth }}
        >
          {description}
        </p>
      )}
      {buttons && buttons.length > 0 && (
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
                  className={cn(
                    'btn-paper',
                    isGhost ? 'btn-ghost' : 'btn-accent',
                  )}
                >
                  {btn.label}
                  {!isGhost && (
                    <span aria-hidden style={{ fontSize: 18, lineHeight: 0.8 }}>
                      →
                    </span>
                  )}
                </span>
              </Link>
            )
          })}
        </div>
      )}
      {handnote && (
        <div className="relative mt-14 flex items-center gap-4 text-(--ink-soft)">
          <SketchArrow
            size={70}
            color="var(--accent)"
            curl={1.4}
            style={{ transform: 'rotate(15deg)' }}
          />
          <span className="handnote text-lg">{handnote.text}</span>
        </div>
      )}
    </div>
  )

  if (!collage) {
    return <section className={cn('relative', className)}>{content}</section>
  }

  return (
    <section className={cn('relative', className)}>
      <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        {content}
        <div className="relative mx-auto aspect-square w-full max-w-130">
          {collage.images.map((img, i) => {
            const placement = img.style ?? DEFAULT_COLLAGE_PLACEMENT[i] ?? {}
            return (
              <div
                key={img.src || `slot-${i}`}
                className="photo-card absolute"
                style={placement}
              >
                {img.src ? (
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    priority={i === 0}
                    className="rounded-[3px] object-cover"
                  />
                ) : (
                  <div className="photo-fill">{img.fallback ?? ''}</div>
                )}
              </div>
            )
          })}
          {collage.showSketches && (
            <>
              <div
                className="float wiggle"
                style={{ top: '-4%', right: '8%', ['--rot' as never]: '8deg' }}
              >
                <SketchSun size={88} color="var(--accent-3)" />
              </div>
              <div
                className="float drift"
                style={{
                  top: '20%',
                  right: '-2%',
                  ['--rot' as never]: '-12deg',
                }}
              >
                <SketchBird size={70} color="var(--accent-4)" />
              </div>
              <div
                className="float wiggle"
                style={{
                  bottom: '-6%',
                  left: '4%',
                  ['--rot' as never]: '-6deg',
                }}
              >
                <SketchLeaf size={70} color="var(--accent-2)" />
              </div>
              <div
                className="float wiggle"
                style={{
                  top: '40%',
                  left: '-26%',
                  ['--rot' as never]: '14deg',
                }}
              >
                <SketchPaperBoat size={84} color="var(--accent)" />
              </div>
            </>
          )}
        </div>
      </div>
      {collage.showCloud && (
        <div
          className="float pointer-events-none hidden lg:block"
          style={{ top: 32, right: '32%', opacity: 0.6 }}
        >
          <SketchCloud size={100} color="var(--ink-soft)" />
        </div>
      )}
    </section>
  )
}
