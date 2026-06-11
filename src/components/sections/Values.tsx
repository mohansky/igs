import type { ComponentType, ReactNode } from 'react'
import {
  SketchBicycle,
  SketchCloud,
  SketchKite,
  SketchLeaf,
  SketchStar,
  SketchSwirl,
} from '#/components/Sketches'

export interface ValueItem {
  title: string
  desc: string
}

export interface PledgeContent {
  /** Pledge quote — text or JSX (wrap an accent phrase in `<span class="accent">…</span>` to colour it) */
  quote: ReactNode
  /** Attribution line below the quote (e.g. "— Our pledge to your family") */
  attribution: string
}

interface ValuesProps {
  kicker: string
  /** Title — text or JSX (wrap accent words in `<span class="italic text-(--accent)">` for the orange italic flourish) */
  title: ReactNode
  items: ValueItem[]
  /** Icon components rendered above each value, cycled if there are more items than icons */
  valueIcons: Array<ComponentType<{ size?: number }>>
  pledge: PledgeContent
}

export function Values({
  kicker,
  title,
  items,
  valueIcons,
  pledge,
}: ValuesProps) {
  return (
    <>
      {/* Values */}
      <section className="pb-24" id="why">
        <div className="page-wrap">
          <div className="values-section">
            <div className="relative z-2 max-w-180">
              <div className="section-eyebrow">{kicker}</div>
              <h2 className="text-[clamp(36px,5vw,64px)] leading-[1.05]">
                {title}
              </h2>
            </div>
            <div className="values-grid">
              {items.map((v, i) => {
                const Icon = valueIcons[i % valueIcons.length]
                return (
                  <div className="value" key={v.title}>
                    {Icon && (
                      <div className="value-icon">
                        <Icon size={72} />
                      </div>
                    )}
                    <h4>{v.title}</h4>
                    <p>{v.desc}</p>
                  </div>
                )
              })}
            </div>

            <div
              className="float pointer-events-none"
              style={{ top: 24, right: 32, opacity: 0.35 }}
            >
              <SketchCloud size={140} color="var(--ink)" />
            </div>
            <div
              className="float pointer-events-none"
              style={{ bottom: -10, right: '20%', opacity: 0.25 }}
            >
              <SketchSwirl size={80} color="var(--ink)" />
            </div>
          </div>
        </div>
      </section>

      {/* Pledge */}
      <section className="pledge" id="pledge">
        <div className="page-wrap relative">
          <div
            className="float wiggle"
            style={{ top: 0, left: '8%', ['--rot' as never]: '-10deg' }}
          >
            <SketchKite size={90} color="var(--accent)" />
          </div>
          <div
            className="float"
            style={{ top: 30, right: '6%', ['--rot' as never]: '12deg' }}
          >
            <SketchBicycle size={150} color="var(--accent-4)" />
          </div>
          <div className="float wiggle" style={{ bottom: -20, left: '20%' }}>
            <SketchStar size={48} color="var(--accent-3)" />
          </div>
          <div className="float" style={{ bottom: 0, right: '24%' }}>
            <SketchLeaf size={60} color="var(--accent-2)" />
          </div>
          <p className="pledge-quote">{pledge.quote}</p>
          <div className="pledge-attr">{pledge.attribution}</div>
        </div>
      </section>
    </>
  )
}
