// Gero aqui a paleta de cores de marca usada pelo Tailwind (as variáveis
// --color-brand-* definidas em @theme no globals.css). O Tailwind v4 já
// compila as classes utilitárias (bg-brand-500, text-brand-100 etc.) para
// referenciar essas variáveis em vez de embutir o valor hexadecimal direto,
// então para dar a cada barbearia (tenant) sua própria identidade visual eu
// só preciso sobrescrever essas variáveis em runtime — nenhum componente
// precisa mudar.
//
// Se o tenant não configurou nenhuma cor própria, devolvo exatamente a
// paleta padrão que já existe hoje no globals.css, para não mudar nada
// visualmente enquanto o whitelabel não for configurado.

type ComponentesRGB = { r: number; g: number; b: number };

const BRANCO: ComponentesRGB = { r: 255, g: 255, b: 255 };
const PRETO: ComponentesRGB = { r: 0, g: 0, b: 0 };

export type PaletaMarca = {
  50: string;
  100: string;
  200: string;
  500: string;
  600: string;
  700: string;
  900: string;
  950: string;
};

// Paleta padrão da Sevilha, idêntica à que está hoje em src/app/globals.css.
const PALETA_PADRAO: PaletaMarca = {
  50: '#fff8eb',
  100: '#ffe7bf',
  200: '#f8d28a',
  500: '#c8902f',
  600: '#a9711e',
  700: '#8a5c14',
  900: '#3b2710',
  950: '#1c1510'
};

function hexValido(hex: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(hex);
}

function hexParaRgb(hex: string): ComponentesRGB {
  const numero = parseInt(hex.slice(1), 16);
  return {
    r: (numero >> 16) & 255,
    g: (numero >> 8) & 255,
    b: numero & 255
  };
}

function rgbParaHex({ r, g, b }: ComponentesRGB): string {
  const paraDoisDigitos = (canal: number) =>
    Math.round(Math.min(255, Math.max(0, canal))).toString(16).padStart(2, '0');
  return `#${paraDoisDigitos(r)}${paraDoisDigitos(g)}${paraDoisDigitos(b)}`;
}

// Mistura a cor base com um alvo (branco ou preto) na proporção informada.
// proporcao 0 devolve a cor original; proporcao 1 devolve o alvo puro.
function misturar(base: ComponentesRGB, alvo: ComponentesRGB, proporcao: number): ComponentesRGB {
  return {
    r: base.r + (alvo.r - base.r) * proporcao,
    g: base.g + (alvo.g - base.g) * proporcao,
    b: base.b + (alvo.b - base.b) * proporcao
  };
}

/**
 * Gera a paleta completa de tons (mesma estrutura usada hoje no projeto) a
 * partir da cor principal do tenant e, opcionalmente, de uma cor escura
 * própria para hover/ênfase.
 *
 * @param corPrincipal cor de marca do tenant (ex.: "#2563eb"). Se ausente ou
 * inválida, uso a paleta padrão da Sevilha.
 * @param corEscura variante escura opcional. Se ausente, escureço a cor
 * principal automaticamente para aproximar o mesmo contraste que a Sevilha
 * usa hoje entre o tom 500 e o 700.
 */
export function gerarPaletaMarca(
  corPrincipal?: string | null,
  corEscura?: string | null
): PaletaMarca {
  if (!corPrincipal || !hexValido(corPrincipal)) {
    return PALETA_PADRAO;
  }

  const principal = hexParaRgb(corPrincipal);
  const escura = corEscura && hexValido(corEscura) ? hexParaRgb(corEscura) : misturar(principal, PRETO, 0.32);

  return {
    50: rgbParaHex(misturar(principal, BRANCO, 0.94)),
    100: rgbParaHex(misturar(principal, BRANCO, 0.86)),
    200: rgbParaHex(misturar(principal, BRANCO, 0.66)),
    500: rgbParaHex(principal),
    600: rgbParaHex(misturar(principal, PRETO, 0.14)),
    700: rgbParaHex(escura),
    900: rgbParaHex(misturar(escura, PRETO, 0.35)),
    950: rgbParaHex(misturar(escura, PRETO, 0.55))
  };
}
