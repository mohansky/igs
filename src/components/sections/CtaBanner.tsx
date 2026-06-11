import { Link } from '@tanstack/react-router'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'

interface CtaAction {
  label: string
  to: string
}

interface CtaBannerProps {
  title: string
  description: string
  primaryCta: CtaAction
  secondaryCta?: CtaAction
  className?: string
}

export function CtaBanner({
  title,
  description,
  primaryCta,
  secondaryCta,
  className,
}: CtaBannerProps) {
  return (
    <Card
      variant="glass"
      className={cn('rise-in rounded-2xl p-6 text-center sm:p-8', className)}
    >
      <h2 className="display-title mb-3 text-2xl font-bold text-(--sea-ink) sm:text-3xl">
        {title}
      </h2>
      <p className="mx-auto mb-5 max-w-lg text-sm text-(--sea-ink-soft)">
        {description}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to={primaryCta.to as string}>
          <Button>{primaryCta.label}</Button>
        </Link>
        {secondaryCta && (
          <Link to={secondaryCta.to as string}>
            <Button variant="outline">{secondaryCta.label}</Button>
          </Link>
        )}
      </div>
    </Card>
  )
}
