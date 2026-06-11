import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

export interface ProgrammeItem {
  title: string
  age: string
  desc: string
}

interface ProgrammesProps {
  kicker: string
  /** Title — text or JSX (wrap accent words in `<span class="italic text-(--accent)">` for the orange italic flourish) */
  title: ReactNode
  description?: string
  items: ProgrammeItem[]
}

export function Programmes({
  kicker,
  title,
  description,
  items,
}: ProgrammesProps) {
  return (
    <section className="py-24" id="programmes">
      <div className="page-wrap">
        <div className="section-head">
          <div>
            <div className="section-eyebrow">{kicker}</div>
            <h2 className="text-[clamp(36px,5vw,64px)] leading-[1.05]">
              {title}
            </h2>
          </div>
          {description && <p>{description}</p>}
        </div>
        <div className="programme-grid">
          {items.map((p) => (
            <article className="programme" key={p.title}>
              <div className="programme-age">{p.age}</div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
              <Link to="/admissions" className="programme-link">
                Learn more →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
