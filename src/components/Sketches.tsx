import type { SVGProps } from 'react'

type Common = {
  size?: number
  color?: string
} & Omit<SVGProps<SVGSVGElement>, 'color'>

const inkProps = (color = 'currentColor') => ({
  fill: 'none',
  stroke: color,
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function SketchGirlReading({ size = 120, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...rest}>
      <g {...inkProps(color)}>
        <path d="M52 28 Q48 18 58 14 Q70 12 75 22 Q80 32 74 38" />
        <circle cx="55" cy="20" r="4" />
        <path d="M50 32 Q47 48 52 56 Q60 62 70 58 Q78 54 78 42 Q78 30 70 26 Q60 24 52 30" />
        <path d="M58 44 q2 -2 4 0" />
        <path d="M68 44 q2 -2 4 0" />
        <path d="M62 50 q3 2 6 0" />
        <path d="M44 60 Q40 78 44 96 L82 96 Q86 80 80 62" />
        <path d="M46 70 Q40 80 46 88" />
        <path d="M80 70 Q86 80 80 88" />
        <path d="M44 80 L82 80 L82 96 L44 96 Z" />
        <path d="M63 80 L63 96" />
        <path d="M50 86 L58 86 M68 86 L76 86 M50 90 L58 90 M68 90 L76 90" />
      </g>
    </svg>
  )
}

export function SketchBoyJumping({ size = 120, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...rest}>
      <g {...inkProps(color)}>
        <circle cx="60" cy="28" r="13" />
        <path d="M50 20 q3 -6 8 -4 M62 16 q4 -3 8 1 M70 22 q4 0 6 4" />
        <circle cx="56" cy="28" r=".8" fill={color || 'currentColor'} />
        <circle cx="64" cy="28" r=".8" fill={color || 'currentColor'} />
        <path d="M55 33 q5 4 10 0" />
        <path d="M60 41 L60 70" />
        <path d="M60 50 Q42 46 36 28" />
        <path d="M60 50 Q78 46 86 28" />
        <path d="M60 70 Q50 86 42 100" />
        <path d="M60 70 Q72 86 80 100" />
      </g>
    </svg>
  )
}

export function SketchKidWaving({ size = 120, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} {...rest}>
      <g {...inkProps(color)}>
        <circle cx="60" cy="34" r="14" />
        <path d="M48 22 q4 -8 14 -6 q12 0 14 8" />
        <circle cx="55" cy="34" r=".8" fill={color || 'currentColor'} />
        <circle cx="65" cy="34" r=".8" fill={color || 'currentColor'} />
        <path d="M55 40 q5 4 10 0" />
        <path d="M60 48 Q52 60 50 80 L70 80 Q72 62 60 48" />
        <path d="M52 56 Q40 50 36 36" />
        <path d="M70 56 Q86 60 90 70" />
        <path d="M86 30 q4 -4 6 -2 q2 4 -2 6" />
        <path d="M50 80 L48 104 M70 80 L72 104" />
      </g>
    </svg>
  )
}

export function SketchTree({ size = 200, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} {...rest}>
      <g {...inkProps(color)}>
        <path d="M70 180 L130 180 L120 140 L80 140 Z" />
        <path d="M100 140 L100 180" />
        <path d="M50 130 Q20 110 40 80 Q30 50 70 50 Q90 20 120 40 Q160 30 160 70 Q190 80 170 110 Q190 140 150 140 L50 130 Z" />
        <path
          d="M70 90 q5 5 10 -2 M100 80 q5 5 10 -2 M130 95 q5 5 10 -2 M85 110 q5 5 10 -2 M115 110 q5 5 10 -2"
          opacity=".5"
        />
      </g>
    </svg>
  )
}

export function SketchSun({ size = 100, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} {...rest}>
      <g {...inkProps(color)}>
        <circle cx="50" cy="50" r="18" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
          const r1 = 24
          const r2 = 34
          const rad = (a * Math.PI) / 180
          const x1 = 50 + Math.cos(rad) * r1
          const y1 = 50 + Math.sin(rad) * r1
          const x2 = 50 + Math.cos(rad) * r2
          const y2 = 50 + Math.sin(rad) * r2
          return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} />
        })}
        <circle cx="44" cy="48" r=".8" fill={color || 'currentColor'} />
        <circle cx="56" cy="48" r=".8" fill={color || 'currentColor'} />
        <path d="M44 54 q6 4 12 0" />
      </g>
    </svg>
  )
}

export function SketchCloud({ size = 120, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 120 80" width={size} height={(size * 80) / 120} {...rest}>
      <g {...inkProps(color)}>
        <path d="M22 56 Q10 56 12 44 Q4 36 16 30 Q18 18 32 22 Q40 10 54 18 Q68 10 78 22 Q92 18 96 32 Q108 36 102 48 Q108 60 94 60 Z" />
      </g>
    </svg>
  )
}

export function SketchBird({ size = 80, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 80 60" width={size} height={(size * 60) / 80} {...rest}>
      <g {...inkProps(color)}>
        <path d="M8 30 Q20 14 32 26 Q40 18 48 26 Q60 14 72 30 Q60 22 48 30" />
      </g>
    </svg>
  )
}

export function SketchLeaf({ size = 60, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} {...rest}>
      <g {...inkProps(color)}>
        <path d="M10 50 Q10 20 30 10 Q50 20 50 50 Q30 44 10 50 Z" />
        <path d="M10 50 Q30 30 50 10" opacity=".6" />
        <path
          d="M20 40 Q24 36 28 38 M30 36 Q34 32 38 34 M40 28 Q44 24 46 26"
          opacity=".5"
        />
      </g>
    </svg>
  )
}

export function SketchPaperBoat({ size = 100, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 100 80" width={size} height={(size * 80) / 100} {...rest}>
      <g {...inkProps(color)}>
        <path d="M10 54 L90 54 L78 70 L22 70 Z" />
        <path d="M10 54 L50 24 L90 54" />
        <path d="M50 24 L50 54" />
        <path d="M4 74 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0" opacity=".6" />
      </g>
    </svg>
  )
}

export function SketchKite({ size = 100, color, ...rest }: Common) {
  return (
    <svg
      viewBox="0 0 100 140"
      width={size}
      height={(size * 140) / 100}
      {...rest}
    >
      <g {...inkProps(color)}>
        <path d="M50 8 L82 44 L50 86 L18 44 Z" />
        <path d="M50 8 L50 86 M18 44 L82 44" opacity=".6" />
        <path d="M50 86 Q56 96 48 104 Q40 112 50 120 Q60 128 50 136" />
        <path d="M44 100 q4 -3 8 0 q-4 3 -8 0 M52 116 q4 -3 8 0 q-4 3 -8 0" />
      </g>
    </svg>
  )
}

export function SketchBicycle({ size = 140, color, ...rest }: Common) {
  return (
    <svg
      viewBox="0 0 140 100"
      width={size}
      height={(size * 100) / 140}
      {...rest}
    >
      <g {...inkProps(color)}>
        <circle cx="32" cy="74" r="18" />
        <circle cx="108" cy="74" r="18" />
        <circle cx="32" cy="74" r="2" fill={color || 'currentColor'} />
        <circle cx="108" cy="74" r="2" fill={color || 'currentColor'} />
        <path
          d="M32 56 L32 92 M14 74 L50 74 M19 61 L45 87 M19 87 L45 61"
          opacity=".4"
        />
        <path
          d="M108 56 L108 92 M90 74 L126 74 M95 61 L121 87 M95 87 L121 61"
          opacity=".4"
        />
        <path d="M32 74 L70 74 L108 74 M70 74 L70 50 L98 50 M70 74 L92 50" />
        <path d="M98 50 L106 42 M106 42 L114 44" />
        <path d="M64 50 L76 50" />
      </g>
    </svg>
  )
}

export function SketchBook({ size = 100, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 100 80" width={size} height={(size * 80) / 100} {...rest}>
      <g {...inkProps(color)}>
        <path d="M10 18 Q30 10 48 18 L48 70 Q30 62 10 70 Z" />
        <path d="M90 18 Q70 10 52 18 L52 70 Q70 62 90 70 Z" />
        <path d="M48 18 L48 70 M52 18 L52 70" />
        <path
          d="M16 28 L40 28 M16 36 L40 36 M16 44 L40 44 M16 52 L36 52"
          opacity=".5"
        />
        <path
          d="M60 28 L84 28 M60 36 L84 36 M60 44 L84 44 M60 52 L80 52"
          opacity=".5"
        />
      </g>
    </svg>
  )
}

export function SketchHand({ size = 80, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 80 100" width={size} height={(size * 100) / 80} {...rest}>
      <g {...inkProps(color)}>
        <path d="M20 96 Q14 70 16 50 Q18 42 24 44 Q26 30 30 24 Q36 22 36 30 L36 46 Q38 18 44 16 Q50 18 48 30 L48 46 Q50 22 56 22 Q62 24 60 36 L60 50 Q64 36 68 38 Q72 42 70 54 Q68 70 66 80 Q60 96 50 96 Z" />
      </g>
    </svg>
  )
}

export function SketchStar({ size = 60, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} {...rest}>
      <g {...inkProps(color)}>
        <path d="M30 8 L36 24 L52 26 L40 38 L44 54 L30 46 L16 54 L20 38 L8 26 L24 24 Z" />
      </g>
    </svg>
  )
}

export function SketchSwirl({ size = 60, color, ...rest }: Common) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} {...rest}>
      <g {...inkProps(color)}>
        <path d="M30 30 m-3 0 a3 3 0 1 1 6 0 a6 6 0 1 1 -12 0 a9 9 0 1 1 18 0 a12 12 0 1 1 -24 0" />
      </g>
    </svg>
  )
}

export function SketchArrow({
  size = 80,
  color,
  curl = 1,
  ...rest
}: Common & { curl?: number }) {
  return (
    <svg viewBox="0 0 80 50" width={size} height={(size * 50) / 80} {...rest}>
      <g {...inkProps(color)}>
        <path d={`M6 ${25 - curl * 6} Q40 ${25 + curl * 14} 70 25`} />
        <path d="M70 25 L62 19 M70 25 L62 31" />
      </g>
    </svg>
  )
}

export function SketchUnderline({
  width = 200,
  color,
  ...rest
}: Omit<Common, 'size'> & { width?: number }) {
  return (
    <svg
      viewBox="0 0 200 16"
      width={width}
      height={(width * 16) / 200}
      preserveAspectRatio="none"
      {...rest}
    >
      <g {...inkProps(color)}>
        <path d="M4 10 Q50 2 100 8 T196 6" />
      </g>
    </svg>
  )
}
