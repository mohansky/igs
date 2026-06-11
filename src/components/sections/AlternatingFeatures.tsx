import { Card, CardContent } from '#/components/ui/card'
import { Image } from '#/components/ui/image'
import { cn } from '#/lib/utils'

interface Feature {
  title: string
  desc: string
  img: string
}

interface AlternatingFeaturesProps {
  kicker?: string
  title?: string
  items: Feature[]
  className?: string
}

export function AlternatingFeatures({
  kicker,
  title,
  items,
  className,
}: AlternatingFeaturesProps) {
  return (
    <section className={className}>
      {kicker && <p className="island-kicker mb-2">{kicker}</p>}
      {title && (
        <h2 className="display-title mb-8 text-2xl font-bold text-foreground sm:text-3xl">
          {title}
        </h2>
      )}
      <div className="space-y-20">
        {items.map((item, index) => (
          <Card
            key={item.title}
            // variant="glass"
            className="rise-in overflow-hidden rounded-2xl p-0 bg-transparent shadow-none"
            style={{ animationDelay: `${index * 80 + 80}ms` }}
          >
            <CardContent
              className={cn(
                'flex flex-col gap-6 p-0 sm:flex-row sm:items-center bg-transparent',
                index % 2 !== 0 && 'sm:flex-row-reverse',
              )}
            >
              <Image
                src={item.img}
                alt={item.title}
                width={600}
                height={256}
                className="rounded-2xl h-48 w-full object-cover sm:h-64 sm:w-1/2"
              />
              <div className="flex-1 px-6 py-4 sm:px-8 sm:py-6">
                <h3 className="mb-2 text-xl font-semibold text-(--sea-ink)">
                  {item.title}
                </h3>
                <p className="m-0 text-sm leading-relaxed text-(--sea-ink-soft)">
                  {item.desc}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
