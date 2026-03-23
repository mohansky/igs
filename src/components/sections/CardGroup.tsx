import type { VariantProps } from 'class-variance-authority'
import { Card, cardVariants } from '#/components/ui/card'
import { cn } from '#/lib/utils'

interface CardGroupProps<T> {
  kicker?: string
  title?: string
  items: T[]
  columns?: '2' | '3' | '4'
  cardVariant?: VariantProps<typeof cardVariants>['variant']
  cardClassName?: string
  renderItem: (item: T, index: number) => React.ReactNode
  getKey: (item: T) => string
  className?: string
  staggerMs?: number
}

export function CardGroup<T>({
  kicker,
  title,
  items,
  columns = '3',
  cardVariant = 'feature',
  cardClassName,
  renderItem,
  getKey,
  className,
  staggerMs = 90,
}: CardGroupProps<T>) {
  const colsClass = {
    '2': 'sm:grid-cols-2',
    '3': 'sm:grid-cols-2 lg:grid-cols-3',
    '4': 'sm:grid-cols-2 lg:grid-cols-4',
  }[columns]

  return (
    <section className={className}>
      {kicker && <p className="island-kicker mb-2">{kicker}</p>}
      {title && (
        <h2 className="display-title mb-6 text-2xl font-bold text-(--sea-ink) sm:text-3xl">
          {title}
        </h2>
      )}
      <div className={cn('grid gap-4', colsClass)}>
        {items.map((item, index) => (
          <Card
            key={getKey(item)}
            variant={cardVariant}
            className={cn('rise-in rounded-2xl p-5', cardClassName)}
            style={{ animationDelay: `${index * staggerMs + 80}ms` }}
          >
            {renderItem(item, index)}
          </Card>
        ))}
      </div>
    </section>
  )
}
