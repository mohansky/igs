import { useEffect, useCallback } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import Fade from 'embla-carousel-fade'
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
  image?: string
  images?: string[]
  kicker?: string
  title: string
  description?: string
  overlay?: string
  className?: string
  children?: React.ReactNode
  /** Autoplay delay in ms (default 10000) */
  autoplayDelay?: number
}

function HeroSlider({
  images,
  alt,
  delay,
}: {
  images: string[]
  alt: string
  delay: number
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
    Fade(),
    Autoplay({ delay, stopOnInteraction: false }),
  ])

  const onInit = useCallback(() => {
    if (!emblaApi) return
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onInit()
    emblaApi.on('init', onInit)
    return () => {
      emblaApi.off('init', onInit)
    }
  }, [emblaApi, onInit])

  return (
    <div ref={emblaRef} className="absolute inset-0 overflow-hidden">
      <div className="flex h-full">
        {images.map((src, i) => (
          <div key={src} className="relative min-w-0 shrink-0 grow-0 basis-full">
            <Image
              src={src}
              alt={`${alt} ${i + 1}`}
              fill
              priority={i === 0}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Hero({
  image,
  images,
  kicker,
  title,
  description,
  overlay = 'bg-black/30',
  size,
  className,
  children,
  autoplayDelay = 10000,
}: HeroProps) {
  const allImages = images ?? (image ? [image] : [])
  const isSlider = allImages.length > 1

  return (
    <section className={cn(heroVariants({ size }), className)}>
      {isSlider ? (
        <HeroSlider
          images={allImages}
          alt={kicker || title}
          delay={autoplayDelay}
        />
      ) : (
        allImages[0] && (
          <Image
            src={allImages[0]}
            alt={kicker || title}
            title={kicker || title}
            fill
            priority
          />
        )
      )}
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
