import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { site, SITE_TITLE } from '#/lib/site'
import { Image } from '#/components/ui/image'

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

const { header, images } = site.gallery

function Gallery() {
  const [open, setOpen] = useState(false)
  const [startIndex, setStartIndex] = useState(0)

  const openLightbox = useCallback((index: number) => {
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

      {/* Masonry grid with paper-card frames */}
      <section className="pb-24">
        <div className="page-wrap">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((src: string, i: number) => (
              <button
                key={src}
                type="button"
                onClick={() => openLightbox(i)}
                className="photo-card cursor-zoom-in"
                style={{
                  aspectRatio: i % 4 === 0 ? '4/5' : '1/1',
                  transform: `rotate(${(i % 3) - 1}deg)`,
                  transition: 'transform .3s ease, box-shadow .3s ease',
                }}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={src}
                    alt={`Gallery image ${i + 1}`}
                    fill
                    className="rounded-[3px] object-cover"
                  />
                </div>
              </button>
            ))}
          </div>
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
              {images.map((src: string, i: number) => (
                <CarouselItem key={src}>
                  <div className="relative aspect-video">
                    <Image
                      src={src}
                      alt={`Gallery image ${i + 1}`}
                      fill
                      priority
                      className="rounded-lg object-contain"
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
