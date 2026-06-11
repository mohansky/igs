import type { ReactNode } from 'react'

export interface ProcessStep {
  /** Step number as string (e.g. "1", "2") — gets zero-padded to 2 digits at render */
  step: string
  title: string
  desc: string
}

interface ProcessStepsProps {
  kicker: string
  /** Title — text or JSX (wrap accent words in `<em>` or `<span class="italic text-(--accent)">` if you want a flourish) */
  title: ReactNode
  steps: ProcessStep[]
}

export function ProcessSteps({ kicker, title, steps }: ProcessStepsProps) {
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
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => (
            <article
              key={s.step}
              className="rounded-[18px] p-7 relative"
              style={{
                border: '1.5px solid var(--ink)',
                background: i % 2 ? 'var(--paper)' : 'var(--bg-2)',
              }}
            >
              <div
                className="font-serif italic leading-none mb-4"
                style={{ fontSize: 56, color: 'var(--accent)' }}
              >
                {s.step.padStart(2, '0')}
              </div>
              <h4 className="font-serif text-xl mb-2">{s.title}</h4>
              <p className="text-(--ink-soft) text-[14.5px] m-0">{s.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
