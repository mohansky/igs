import type { ComponentType, SVGProps } from 'react'
import { Button } from '#/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip'

interface IconButtonProps {
  tooltip: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  onClick: () => void
  className?: string
  size?: 'xs' | 'sm'
  disabled?: boolean
}

export function IconButton({
  tooltip,
  icon: Icon,
  onClick,
  className,
  size = 'sm',
  disabled,
}: IconButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={size}
            onClick={onClick}
            disabled={disabled}
          >
            <span className="sr-only">{tooltip}</span>
            <Icon className={className} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
