import type { ReactNode } from 'react'

export interface DateItem {
  label: string
  value: string
}

export interface DatesContent {
  kicker: string
  /** Title — text or JSX */
  title: ReactNode
  items: DateItem[]
}

interface DocumentsProps {
  kicker: string
  /** Title — text or JSX (wrap accent words in `<em>` or `<span class="italic text-(--accent)">` if you want a flourish) */
  title: ReactNode
  items: string[]
  dates: DatesContent
}

export function Documents({ kicker, title, items }: DocumentsProps) {
  return (
    <section className="pb-24">
      <div className="page-wrap">
        <div className="grid gap-8 lg:grid-cols-2">
          <div
            className="rounded-[18px] p-9"
            style={{
              border: '1.5px solid var(--ink)',
              background: 'var(--paper)',
            }}
          >
            <div className="section-eyebrow">{kicker}</div>
            <h3 className="font-serif text-2xl mb-4">{title}</h3>
            <ul className="m-0 list-none space-y-2.5 p-0 text-[15px] text-(--ink-soft)">
              {items.map((doc) => (
                <li key={doc} className="flex gap-2">
                  <span className="text-(--accent)">✓</span>
                  {doc}
                </li>
              ))}
            </ul>
          </div>
          {/* <div
            className="rounded-[18px] p-9"
            style={{
              border: '1.5px solid var(--ink)',
              background: 'var(--bg-2)',
            }}
          >
            <div className="section-eyebrow">{dates.kicker}</div>
            <h3 className="font-serif text-2xl mb-4">{dates.title}</h3>
            <ul className="m-0 list-none space-y-3 p-0 text-[15px]">
              {dates.items.map((item) => (
                <li key={item.label}>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-(--ink-soft)">
                    {item.label}
                  </div>
                  <div className="text-(--ink) font-serif text-lg">
                    {item.value}
                  </div>
                </li>
              ))}
            </ul>
          </div> */}
        </div>
      </div>
    </section>
  )
}
