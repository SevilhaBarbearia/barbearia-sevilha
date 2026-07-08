'use client';

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState
} from 'react';
import type {
  ChangeEvent,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';
import { cn } from '@/lib/utils';

const campoBase =
  'w-full rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5 text-sm font-medium text-white shadow-inner shadow-black/20 outline-none transition placeholder:text-zinc-500 focus:border-brand-500 focus:bg-black/35 focus:ring-4 focus:ring-brand-500/15 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-2xl sm:px-4 sm:py-3';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(campoBase, className)} {...props} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-bold text-zinc-100', className)} {...props} />;
}

type OpcaoSelect = {
  value: string;
  label: string;
  disabled?: boolean;
};

function extrairOpcoes(children: SelectHTMLAttributes<HTMLSelectElement>['children']): OpcaoSelect[] {
  return Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const props = child.props as { value?: string | number; children?: unknown; disabled?: boolean };
      const value = props.value === undefined ? String(props.children ?? '') : String(props.value);
      const label = Children.toArray(props.children).join('');

      return {
        value,
        label,
        disabled: props.disabled
      };
    });
}

/**
 * Select visual customizado.
 * Mantém um <select> oculto com name/value para preservar submissão nativa dos formulários
 * e evita o menu padrão do navegador, que ficava visualmente inconsistente na Vercel/Chrome.
 */
export function Select({
  children,
  className,
  disabled,
  id,
  name,
  value,
  defaultValue,
  required,
  onChange,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const buttonId = id ?? `select-${generatedId}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const options = useMemo(() => extrairOpcoes(children), [children]);
  const isControlled = value !== undefined;
  const valorInicial = String(value ?? defaultValue ?? options[0]?.value ?? '');
  const [internalValue, setInternalValue] = useState(valorInicial);
  const [open, setOpen] = useState(false);
  const selectedValue = String(isControlled ? value : internalValue);
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];

  useEffect(() => {
    if (!isControlled && options.length > 0 && !options.some((option) => option.value === internalValue)) {
      setInternalValue(options[0].value);
    }
  }, [internalValue, isControlled, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  function selecionarOpcao(option: OpcaoSelect) {
    if (option.disabled || disabled) return;

    if (!isControlled) {
      setInternalValue(option.value);
    }

    onChange?.({
      target: { value: option.value, name },
      currentTarget: { value: option.value, name }
    } as ChangeEvent<HTMLSelectElement>);

    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <select
        {...props}
        aria-hidden="true"
        tabIndex={-1}
        name={name}
        value={selectedOption?.value ?? ''}
        required={required}
        disabled={disabled}
        onChange={() => undefined}
        className="hidden"
      >
        {children}
      </select>

      <button
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          campoBase,
          'flex min-h-11 cursor-pointer items-center justify-between gap-3 bg-zinc-950/92 pr-3 text-left hover:border-brand-500/70 hover:bg-black/55 disabled:pointer-events-none',
          open && 'border-brand-500 bg-black/55 ring-4 ring-brand-500/15',
          className
        )}
        onClick={() => setOpen((atual) => !atual)}
      >
        <span className="min-w-0 truncate">{selectedOption?.label || 'Selecione uma opção'}</span>
        <span className={cn('shrink-0 text-brand-100 transition', open && 'rotate-180')}>⌄</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-labelledby={buttonId}
          className="absolute left-0 right-0 top-[calc(100%+0.45rem)] z-50 max-h-72 overflow-auto rounded-2xl border border-brand-500/30 bg-zinc-950 p-1.5 shadow-2xl shadow-black/70 ring-1 ring-white/10"
        >
          {options.map((option) => {
            const selected = option.value === selectedValue;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-zinc-200 transition hover:bg-brand-500/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-50',
                  selected && 'bg-brand-500 text-brand-950 hover:bg-brand-500 hover:text-brand-950'
                )}
                onClick={() => selecionarOpcao(option)}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {selected && <span className="text-xs font-black uppercase tracking-[0.18em]">Atual</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(campoBase, 'min-h-24 resize-y leading-6 sm:min-h-28', className)} {...props} />;
}
