import type { ReactNode } from 'react'

export interface EligibilityItem {
  programme: string
  age: string
  note: string
}

interface EligibilityProps {
  kicker: string
  /** Title — text or JSX (wrap accent words in `<em>` or `<span class="italic text-(--accent)">` if you want a flourish) */
  title: ReactNode
  items: EligibilityItem[]
}

export function Eligibility({ kicker, title, items }: EligibilityProps) {
  if (items.length === 0) return null

  return (
    <section className="pb-24">
      <div className="page-wrap">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">{kicker}</div>
            <h2 className="text-[clamp(36px,5vw,52px)] leading-[1.05]">
              {title}
            </h2>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.programme}
              className="rounded-[18px] p-7"
              style={{
                border: '1.5px solid var(--ink)',
                background: 'var(--paper)',
              }}
            >
              <h4 className="font-serif text-2xl mb-1">{item.programme}</h4>
              <div className="font-mono text-xs uppercase tracking-wider text-(--accent) mb-3">
                {item.age}
              </div>
              <p className="text-(--ink-soft) text-[14.5px] m-0">{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
