import type { SVGProps } from 'react'

interface IGSLogoProps extends SVGProps<SVGSVGElement> {
  height?: number | string
  color?: string
}

export default function Logo({
  height = 40,
  color = 'currentColor',
  ...props
}: IGSLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 2800 460"
      height={height}
      style={{
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        strokeLinejoin: 'round',
        strokeMiterlimit: 2,
      }}
      fill="none"
      {...props}
    >
      <g transform="matrix(300,0,0,300,2754.45,353.348276)"></g>
      <text
        x="53.55px"
        y="353.348px"
        fill={color}
        style={{
          fontFamily: "'Ubuntu-Bold', 'Ubuntu', sans-serif",
          fontWeight: 700,
          fontSize: '300px',
        }}
      >
        Ri
        <tspan x="335.55px 496.35px " y="353.348px 353.348px ">
          ve
        </tspan>
        rside A
        <tspan x="1671.75px 1814.25px " y="353.348px 353.348px ">
          ca
        </tspan>
        dem
        <tspan x="2590.35px " y="353.348px ">
          y
        </tspan>
      </text>
    </svg>
  )
}
