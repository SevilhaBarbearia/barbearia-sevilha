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
  KeyboardEvent,
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
 * Select visual 100% customizado.
 *
 * Motivo: o menu nativo do navegador ficava diferente entre localhost/Vercel e quebrava
 * a identidade premium da interface. Este componente remove o <select> visível e usa
 * um input hidden para preservar o envio normal dos formulários/server actions.
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
  const valorInicial = String(value ?? defaultValue ?? options.find((option) => !option.disabled)?.value ?? '');
  const [internalValue, setInternalValue] = useState(valorInicial);
  const [open, setOpen] = useState(false);

  const selectedValue = String(isControlled ? value : internalValue);
  const selectedOption =
    options.find((option) => option.value === selectedValue) ??
    options.find((option) => !option.disabled) ??
    options[0];

  useEffect(() => {
    if (!isControlled && options.length > 0 && !options.some((option) => option.value === internalValue)) {
      const primeiraOpcaoValida = options.find((option) => !option.disabled) ?? options[0];
      setInternalValue(primeiraOpcaoValida?.value ?? '');
    }
  }, [internalValue, isControlled, options]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
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

  function dispararOnChange(option: OpcaoSelect) {
    onChange?.({
      target: { value: option.value, name },
      currentTarget: { value: option.value, name }
    } as ChangeEvent<HTMLSelectElement>);
  }

  function selecionarOpcao(option: OpcaoSelect) {
    if (option.disabled || disabled) return;

    if (!isControlled) {
      setInternalValue(option.value);
    }

    dispararOnChange(option);
    setOpen(false);
  }

  function navegarTeclado(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((atual) => !atual);
      return;
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

    event.preventDefault();
    const opcoesValidas = options.filter((option) => !option.disabled);
    const indiceAtual = Math.max(0, opcoesValidas.findIndex((option) => option.value === selectedOption?.value));
    const proximoIndice = event.key === 'ArrowDown'
      ? Math.min(opcoesValidas.length - 1, indiceAtual + 1)
      : Math.max(0, indiceAtual - 1);

    const proximaOpcao = opcoesValidas[proximoIndice];
    if (proximaOpcao) selecionarOpcao(proximaOpcao);
  }

  const valorParaFormulario = selectedOption?.value ?? '';

  return (
    <div ref={containerRef} className="relative">
      {name && (
        <input
          type="hidden"
          name={name}
          value={valorParaFormulario}
          disabled={disabled}
          data-required={required ? 'true' : undefined}
          readOnly
        />
      )}

      <button
        {...props}
        id={buttonId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          campoBase,
          'group flex min-h-11 cursor-pointer items-center justify-between gap-3 bg-zinc-950/92 pr-3 text-left hover:border-brand-500/70 hover:bg-black/55 disabled:pointer-events-none',
          open && 'border-brand-500 bg-black/55 ring-4 ring-brand-500/15',
          className
        )}
        onClick={() => setOpen((atual) => !atual)}
        onKeyDown={navegarTeclado}
      >
        <span className="min-w-0 truncate">{selectedOption?.label || 'Selecione uma opção'}</span>
        <span className={cn('shrink-0 text-brand-100 transition-transform duration-200', open && 'rotate-180')}>⌄</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-labelledby={buttonId}
          className="select-menu-anim absolute left-0 right-0 top-[calc(100%+0.45rem)] z-[80] max-h-72 overflow-auto rounded-2xl border border-brand-500/30 bg-zinc-950/98 p-1.5 shadow-2xl shadow-black/70 ring-1 ring-white/10 backdrop-blur-xl"
        >
          {options.map((option) => {
            const selected = option.value === valorParaFormulario;

            return (
              <button
                key={`${option.value}-${option.label}`}
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
