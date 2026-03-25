import { useState, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { site, SITE_TITLE } from '#/lib/site'
import { Image } from '#/components/ui/image'

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '#/components/ui/dialog'
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

  const openLightbox = useCallback(
    (index: number) => {
      setStartIndex(index)
      setOpen(true)
    },
    [],
  )

  const onApiChange = useCallback(
    (carouselApi: CarouselApi) => {
      if (carouselApi) {
        carouselApi.scrollTo(startIndex, true)
      }
    },
    [startIndex],
  )

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      {/* Header */}
      <div className="rise-in mb-10">
        {header.kicker && (
          <p className="island-kicker mb-2">{header.kicker}</p>
        )}
        <h1 className="display-title mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {header.title}
        </h1>
        {header.description && (
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            {header.description}
          </p>
        )}
      </div>

      {/* Masonry Grid */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            className="mb-4 block w-full cursor-zoom-in overflow-hidden rounded-xl break-inside-avoid"
            onClick={() => openLightbox(i)}
          >
            <div className="relative aspect-video">
              <Image
                src={src}
                alt={`Gallery image ${i + 1}`}
                fill
                className="rounded-xl object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          </button>
        ))}
      </div>

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
              {images.map((src, i) => (
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
