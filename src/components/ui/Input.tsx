import { cn } from '@/lib/utils';

const campoBase =
  'w-full rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5 text-sm font-medium text-white shadow-inner shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-brand-500 focus:bg-black/35 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-2xl sm:px-4 sm:py-3';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(campoBase, className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-bold text-zinc-100', className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(campoBase, 'cursor-pointer bg-zinc-950', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(campoBase, 'min-h-24 resize-y leading-6 sm:min-h-28', className)} {...props} />;
}
