import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.065] p-4 shadow-premium ring-1 ring-white/[0.035] backdrop-blur-xl transition duration-200 sm:rounded-[1.35rem] sm:p-5 lg:rounded-[1.5rem]',
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-black tracking-tight text-white sm:text-xl', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-1.5 text-sm leading-6 text-zinc-300', className)} {...props} />;
}
