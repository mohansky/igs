export interface StatItem {
  /** Big serif number (e.g. "10,000", "1 : 15", "5") */
  num: string
  /** Optional italic suffix rendered next to the number (e.g. " ft²") */
  suffix?: string
  /** Descriptive label below the number */
  label: string
}

interface StatsProps {
  items: StatItem[]
}

export function Stats({ items }: StatsProps) {
  return (
    <section className="pb-24">
      <div className="page-wrap">
        <div className="stats">
          {items.map((s) => (
            <div className="stat" key={`${s.num}-${s.label}`}>
              <div className="stat-num">
                {s.num}
                {s.suffix && <em>{s.suffix}</em>}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
