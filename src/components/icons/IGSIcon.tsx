import type { SVGProps } from 'react'

interface IGSIconProps extends SVGProps<SVGSVGElement> {
  color?: string
}

// Square "IGS" badge. The rounded square follows `color` (currentColor by
// default, so a text-* class themes it), and the letters are knocked out
// in the page background color so they stay legible in light and dark.
// The dot keeps the fixed brand red.
export default function IGSIcon({
  color = 'currentColor',
  ...props
}: IGSIconProps) {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 308 308"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlSpace="preserve"
      style={{
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        strokeLinejoin: 'round',
        strokeMiterlimit: 2,
      }}
      {...props}
    >
      <path
        d="M304,79l0,150c0,41.394 -33.606,75 -75,75l-150,0c-41.394,0 -75,-33.606 -75,-75l0,-150c0,-41.394 33.606,-75 75,-75l150,-0c41.394,0 75,33.606 75,75Z"
        fill={color}
      />
      <g transform="matrix(1.300535,0,0,1.300535,-32.667704,-47.461187)">
        <text
          x="29px"
          y="195px"
          style={{
            fontFamily: "'OpenSans-ExtraBold', 'Open Sans', sans-serif",
            fontWeight: 800,
            fontSize: '113.08px',
            fill: 'var(--background)',
          }}
        >
          IGS
        </text>
        <text
          x="217.337px"
          y="195px"
          style={{
            fontFamily: "'Fraunces-Black', 'Fraunces'",
            fontWeight: 900,
            fontSize: '113.08px',
            fill: '#fa2900',
          }}
        >
          .
        </text>
      </g>
    </svg>
  )
}
