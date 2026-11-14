import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { audio } from '@/engine/audio/AudioEngine';

const buttonVariants = cva(
  'press inline-flex items-center justify-center gap-2 rounded-full font-display font-bold whitespace-nowrap select-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-royal text-white [--ledge:#172554] hover:bg-[#2445a3]',
        gold: 'bg-gold text-royal-deep [--ledge:#B45309] hover:bg-[#fbab1f]',
        emerald: 'bg-emerald text-white [--ledge:#047857] hover:bg-[#12c98c]',
        coral: 'bg-coral text-white [--ledge:#BE123C]',
        ghost: 'bg-white text-ink [--ledge:#E8E1D5] border border-sand hover:bg-cream',
        soft: 'bg-royal-soft text-royal [--ledge:#c9d5f3] hover:bg-[#dbe4f8]',
      },
      size: {
        sm: 'h-10 px-4 text-[15px]',
        md: 'h-12 px-6 text-[17px]',
        lg: 'h-14 px-8 text-xl',
        xl: 'h-[68px] px-12 text-2xl sm:text-[28px]',
        icon: 'size-12',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { silent?: boolean }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, silent, onClick, type = 'button', ...props }, ref) => (
  <button
    ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)}
    onClick={e => { if (!silent) audio.sfx.tap(); onClick?.(e); }}
    {...props}
  />
));
Button.displayName = 'Button';
export { buttonVariants };
