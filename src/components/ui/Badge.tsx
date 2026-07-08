import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-brand-100 shadow-lg shadow-brand-950/20 sm:gap-2 sm:px-3.5 sm:text-xs sm:tracking-[0.20em]',
        className
      )}
      {...props}
    />
  );
}
