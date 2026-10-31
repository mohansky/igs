import { useState, useCallback, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { site, SITE_TITLE } from '#/lib/site'
import { Image } from '#/components/ui/image'
import { listGalleryItems, type GalleryItem } from '#/server/gallery'

import { Dialog, DialogContent, DialogTitle } from '#/components/ui/dialog'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from '#/components/ui/carousel'
import { VisuallyHidden } from 'radix-ui'

export const Route = createFileRoute('/gallery')({
  head: () => ({
    meta: [{ title: `Gallery | ${SITE_TITLE}` }],
  }),
  component: Gallery,
})

const { header } = site.gallery

function Gallery() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['galleryItems'],
    queryFn: () => listGalleryItems(),
    staleTime: 5 * 60 * 1000,
  })

  const [activeImages, setActiveImages] = useState<string[]>([])
  const [startIndex, setStartIndex] = useState(0)
  const [open, setOpen] = useState(false)

  const openLightbox = useCallback((images: string[], index: number) => {
    setActiveImages(images)
    setStartIndex(index)
    setOpen(true)
  }, [])

  const onApiChange = useCallback(
    (carouselApi: CarouselApi) => {
      if (carouselApi) {
        carouselApi.scrollTo(startIndex, true)
      }
    },
    [startIndex],
  )

  const looseImages = useMemo(
    () => items.filter((i): i is GalleryItem & { type: 'image' } => i.type === 'image'),
    [items],
  )

  return (
    <main>
      {/* Hero */}
      <div className="page-wrap pt-8 pb-16">
        <section>
          <div className="hero-eyebrow">{header.kicker}</div>
          <h1 className="hero-headline" style={{ maxWidth: '16ch' }}>
            A year in <em>pictures.</em>
          </h1>
          {header.description && (
            <p className="mt-7 max-w-[60ch] text-[19px] leading-relaxed text-(--ink-soft)">
              {header.description}
            </p>
          )}
        </section>
      </div>

      {/* Cards grid — loose photos + event/folder albums */}
      <section className="pb-24">
        <div className="page-wrap">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="photo-card animate-pulse bg-(--bg-2)"
                  style={{ aspectRatio: i % 4 === 0 ? '4/5' : '1/1' }}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-(--ink-soft)">No photos yet — check back soon.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item, i) => {
                const looseIndex =
                  item.type === 'image'
                    ? looseImages.findIndex((img) => img.src === item.src)
                    : -1
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() =>
                      item.type === 'image'
                        ? openLightbox(
                            looseImages.map((img) => img.src),
                            looseIndex,
                          )
                        : openLightbox(item.images, 0)
                    }
                    className="photo-card cursor-zoom-in"
                    style={{
                      aspectRatio: i % 4 === 0 ? '4/5' : '1/1',
                      transform: `rotate(${(i % 3) - 1}deg)`,
                      transition: 'transform .3s ease, box-shadow .3s ease',
                    }}
                  >
                    <div className="relative h-full w-full">
                      <Image
                        src={item.type === 'image' ? item.src : item.cover}
                        alt={
                          item.type === 'image'
                            ? `Gallery image ${i + 1}`
                            : `${item.name} cover photo`
                        }
                        fill
                        className="rounded-[3px] object-cover"
                      />
                      {item.type === 'folder' && (
                        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-3 text-left">
                          <p className="text-sm font-semibold text-white">
                            {item.name}
                          </p>
                          <p className="text-xs text-white/80">
                            {item.images.length} photo
                            {item.images.length === 1 ? '' : 's'}
                          </p>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[95vw] border-0 bg-transparent p-0 shadow-none sm:max-w-[90vw] [&>button]:text-white [&>button]:hover:text-white/80"
          showCloseButton
        >
          <VisuallyHidden.Root>
            <DialogTitle>Gallery image viewer</DialogTitle>
          </VisuallyHidden.Root>
          <Carousel
            opts={{ loop: true, startIndex }}
            setApi={onApiChange}
            className="w-full"
          >
            <CarouselContent>
              {activeImages.map((src, i) => (
                <CarouselItem key={src}>
                  <div className="relative h-[80vh] w-full">
                    <Image
                      src={src}
                      alt={`Gallery image ${i + 1}`}
                      fill
                      priority
                      objectFit="contain"
                      className="rounded-lg"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 border-0 bg-black/50 text-white hover:bg-black/70 hover:text-white" />
            <CarouselNext className="right-2 border-0 bg-black/50 text-white hover:bg-black/70 hover:text-white" />
          </Carousel>
        </DialogContent>
      </Dialog>
    </main>
  )
}
