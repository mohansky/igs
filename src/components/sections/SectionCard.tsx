import type { VariantProps } from 'class-variance-authority'
import { Card, cardVariants } from '#/components/ui/card'
import { cn } from '#/lib/utils'

interface SectionCardProps {
  kicker?: string
  title?: string
  variant?: VariantProps<typeof cardVariants>['variant']
  className?: string
  children: React.ReactNode
}

export function SectionCard({
  kicker,
  title,
  variant = 'glass',
  className,
  children,
}: SectionCardProps) {
  return (
    <Card
      variant={variant}
      className={cn('rise-in rounded-2xl p-6 sm:p-8', className)}
    >
      {kicker && <p className="island-kicker mb-2">{kicker}</p>}
      {title && (
        <h2 className="display-title mb-5 text-2xl font-bold text-(--sea-ink) sm:text-3xl">
          {title}
        </h2>
      )}
      {children}
    </Card>
  )
}
