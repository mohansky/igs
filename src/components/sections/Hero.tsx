import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '#/lib/utils'
import { Image } from '#/components/ui/image'

const heroVariants = cva(
  'rise-in relative overflow-hidden rounded-4xl px-6 py-10 sm:px-10',
  {
    variants: {
      size: {
        sm: 'sm:py-16',
        md: 'sm:py-28',
        lg: 'sm:py-40',
      },
    },
    defaultVariants: {
      size: 'lg',
    },
  },
)

interface HeroProps extends VariantProps<typeof heroVariants> {
  image: string
  kicker?: string
  title: string
  description?: string
  overlay?: string
  className?: string
  children?: React.ReactNode
}

export function Hero({
  image,
  kicker,
  title,
  description,
  overlay = 'bg-black/30',
  size,
  className,
  children,
}: HeroProps) {
  return (
    <section className={cn(heroVariants({ size }), className)}>
      <Image
        src={image}
        alt={kicker || title}
        title={kicker || title}
        fill
        priority
      />
      <div className={cn('absolute inset-0', overlay)} />
      <div className="relative z-10">
        {kicker && (
          <p className="island-kicker mb-3 text-white/70">{kicker}</p>
        )}
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-white sm:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mb-8 max-w-2xl text-base text-white/80 sm:text-lg">
            {description}
          </p>
        )}
        {children && <div className="flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  )
}
