import type { ReactNode } from 'react'

export interface FaqItem {
  question: string
  answer: string
}

interface FAQProps {
  kicker: string
  /** Title — text or JSX (wrap accent words in `<span class="italic text-(--accent)">`) */
  title: ReactNode
  items: FaqItem[]
}

export function FAQ({ kicker, title, items }: FAQProps) {
  if (items.length === 0) return null

  return (
    <section className="pb-24" id="faqs">
      <div className="page-wrap">
        <div className="mx-auto max-w-3xl">
          <div className="section-eyebrow">{kicker}</div>
          <h2 className="mb-8 text-[clamp(28px,3.5vw,44px)] leading-tight">
            {title}
          </h2>

          <div className="border-t border-black/10 dark:border-white/10">
            {items.map((item) => (
              <details
                key={item.question}
                className="group border-b border-black/10 dark:border-white/10"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-serif text-lg text-(--sea-ink) [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <svg
                    className="size-5 shrink-0 text-(--accent) transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <p className="pb-5 text-[16px] leading-relaxed text-(--ink-soft)">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
