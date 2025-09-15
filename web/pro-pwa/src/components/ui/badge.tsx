
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "border-ofair-blue/20 bg-ofair-blue/10 text-ofair-blue hover:bg-ofair-blue/20",
        secondary: "border-ofair-turquoise/20 bg-ofair-turquoise/10 text-ofair-turquoise hover:bg-ofair-turquoise/20",
        destructive: "border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20",
        outline: "border-white/30 bg-white/20 text-foreground hover:bg-white/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
