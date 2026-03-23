import { useState, useRef, useEffect, type ImgHTMLAttributes } from 'react'
import { cn } from '#/lib/utils'

const R2_BASE_URL = import.meta.env.VITE_R2_BASE_URL ?? ''

interface BaseImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height'> {
  /** Path relative to R2 bucket, or an absolute/public URL */
  src: string
  alt: string
  /** object-fit value when using fill or fixed dimensions */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  /** object-position value */
  objectPosition?: string
  /** Load eagerly (above the fold) — default is lazy */
  priority?: boolean
  /** Blur placeholder color or base64 data URI */
  placeholder?: 'blur' | 'empty'
  /** Low-quality base64 image for blur placeholder */
  blurDataURL?: string
  /** Responsive sizes attribute */
  sizes?: string
  /** Quality hint (1-100) for R2/CDN transforms */
  quality?: number
  className?: string
}

type ImageProps = BaseImageProps &
  (
    | { /** Fill parent container (absolute positioning + object-fit) */ fill: true; width?: never; height?: never }
    | { fill?: false; /** Intrinsic width in px */ width: number; /** Intrinsic height in px */ height: number }
  )

function resolveUrl(src: string): string {
  if (src.startsWith('http') || src.startsWith('data:')) {
    return src
  }
  if (!R2_BASE_URL) {
    // No R2 configured — fall back to public folder
    return src.startsWith('/') ? src : `/${src}`
  }
  const base = R2_BASE_URL.endsWith('/') ? R2_BASE_URL : `${R2_BASE_URL}/`
  const path = src.startsWith('/') ? src.slice(1) : src
  return `${base}${path}`
}

export function Image({
  src,
  alt,
  width,
  height,
  fill = false,
  objectFit = 'cover',
  objectPosition = 'center',
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  sizes,
  quality,
  className,
  style,
  ...props
}: ImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [inView, setInView] = useState(priority)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (priority || !imgRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(imgRef.current)
    return () => observer.disconnect()
  }, [priority])

  let resolvedSrc = resolveUrl(src)

  // Append quality param for R2/CDN if base URL is set
  if (quality && R2_BASE_URL && !src.startsWith('/') && !src.startsWith('http')) {
    const sep = resolvedSrc.includes('?') ? '&' : '?'
    resolvedSrc = `${resolvedSrc}${sep}quality=${quality}`
  }

  const showBlur = placeholder === 'blur' && blurDataURL && !loaded

  const imgStyle: React.CSSProperties = {
    ...(fill
      ? {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit,
          objectPosition,
        }
      : {
          objectFit,
          objectPosition,
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
        }),
    ...style,
  }

  return (
    <img
      ref={imgRef}
      alt={alt}
      src={inView ? resolvedSrc : undefined}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : undefined}
      onLoad={() => setLoaded(true)}
      className={cn(
        'transition-opacity duration-300',
        showBlur && 'opacity-0',
        loaded && 'opacity-100',
        className,
      )}
      style={{
        ...imgStyle,
        ...(showBlur
          ? {
              backgroundImage: `url(${blurDataURL})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : {}),
      }}
      {...props}
    />
  )
}
