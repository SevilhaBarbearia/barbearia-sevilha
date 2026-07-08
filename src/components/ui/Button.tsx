import Link from 'next/link';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
};

const variants = {
  primary:
    'brilho-ouro border border-brand-100/25 bg-gradient-to-r from-brand-500 to-brand-200 text-brand-950 shadow-button hover:-translate-y-0.5 hover:from-brand-200 hover:to-brand-500 focus-visible:ring-brand-100/50',
  secondary:
    'border border-white/14 bg-white/[0.08] text-white shadow-lg shadow-black/15 hover:-translate-y-0.5 hover:border-brand-500/55 hover:bg-white/[0.13] focus-visible:ring-brand-500/45',
  ghost:
    'border border-transparent bg-transparent text-zinc-200 hover:border-white/10 hover:bg-white/[0.08] hover:text-white focus-visible:ring-white/25',
  danger:
    'border border-red-400/25 bg-red-600 text-white shadow-lg shadow-red-950/20 hover:-translate-y-0.5 hover:bg-red-500 focus-visible:ring-red-300/35'
};

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold tracking-tight transition duration-200 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-11 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  className,
  variant = 'primary',
  children
}: {
  href: string;
  className?: string;
  variant?: keyof typeof variants;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold tracking-tight transition duration-200 focus-visible:outline-none focus-visible:ring-4 sm:min-h-11 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm',
        variants[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}
