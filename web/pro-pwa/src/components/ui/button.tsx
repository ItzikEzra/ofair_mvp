import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden group", {
  variants: {
    variant: {
      default: "bg-gradient-to-r from-ofair-blue to-ofair-blue/90 text-white hover:shadow-lg hover:shadow-ofair-blue/25 hover:scale-105 active:scale-95 backdrop-blur-sm",
      destructive: "bg-red-500/10 text-red-600 border border-red-500/20 backdrop-blur-sm hover:bg-red-500/20 hover:scale-105 active:scale-95",
      outline: "border border-white/30 bg-white/20 backdrop-blur-sm hover:bg-white/30 hover:scale-105 active:scale-95 text-foreground",
      secondary: "bg-gradient-to-r from-ofair-turquoise to-ofair-turquoise/90 text-white hover:shadow-lg hover:shadow-ofair-turquoise/25 hover:scale-105 active:scale-95 backdrop-blur-sm",
      ghost: "bg-transparent hover:bg-white/20 hover:backdrop-blur-sm hover:scale-105 active:scale-95 text-foreground",
      link: "text-ofair-blue underline-offset-4 hover:underline hover:scale-105 transition-all duration-300"
    },
    size: {
      default: "h-12 px-6 py-3",
      sm: "h-10 rounded-lg px-4 text-xs",
      lg: "h-14 rounded-xl px-8 text-base",
      icon: "h-12 w-12 rounded-xl"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "default"
  }
});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  className,
  variant,
  size,
  asChild = false,
  children,
  ...props
}, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({
    variant,
    size,
    className
  }))} ref={ref} {...props}>
        <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:animate-shimmer text-slate-100"></span>
        {children}
      </Comp>;
});
Button.displayName = "Button";
export { Button, buttonVariants };