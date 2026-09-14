type ComponentesRGB = {
  r: number;
  g: number;
  b: number;
};

const BRANCO: ComponentesRGB = {
  r: 255,
  g: 255,
  b: 255,
};

const PRETO: ComponentesRGB = {
  r: 0,
  g: 0,
  b: 0,
};

export const DEFAULT_TENANT_ACCENT = "#B8873F";
export const DEFAULT_TENANT_FOREGROUND = "#000000";

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

const PALETA_PADRAO: PaletaMarca = {
  50: "#FBF6EE",
  100: "#F3E6D2",
  200: "#E3C79D",
  500: DEFAULT_TENANT_ACCENT,
  600: "#9D7134",
  700: "#805B2A",
  900: "#44301A",
  950: "#241A10",
};

export function hexValido(hex?: string | null): hex is string {
  return Boolean(hex && /^#[0-9a-f]{6}$/i.test(hex));
}

function hexParaRgb(hex: string): ComponentesRGB {
  const numero = parseInt(hex.slice(1), 16);

  return {
    r: (numero >> 16) & 255,
    g: (numero >> 8) & 255,
    b: numero & 255,
  };
}

function rgbParaHex({ r, g, b }: ComponentesRGB): string {
  const paraDoisDigitos = (canal: number) =>
    Math.round(Math.min(255, Math.max(0, canal)))
      .toString(16)
      .padStart(2, "0");

  return `#${paraDoisDigitos(r)}${paraDoisDigitos(g)}${paraDoisDigitos(b)}`;
}

function misturar(
  base: ComponentesRGB,
  alvo: ComponentesRGB,
  proporcao: number,
): ComponentesRGB {
  return {
    r: base.r + (alvo.r - base.r) * proporcao,
    g: base.g + (alvo.g - base.g) * proporcao,
    b: base.b + (alvo.b - base.b) * proporcao,
  };
}

function canalLinear(canal: number) {
  const srgb = canal / 255;

  if (srgb <= 0.04045) {
    return srgb / 12.92;
  }

  return Math.pow((srgb + 0.055) / 1.055, 2.4);
}

// Eu calculo a luminância relativa seguindo a fórmula WCAG para sRGB.
export function luminanciaRelativa(hex: string) {
  if (!hexValido(hex)) {
    throw new Error("Cor hexadecimal inválida.");
  }

  const { r, g, b } = hexParaRgb(hex);

  return (
    0.2126 * canalLinear(r) +
    0.7152 * canalLinear(g) +
    0.0722 * canalLinear(b)
  );
}

export function razaoContraste(primeiraCor: string, segundaCor: string) {
  const primeira = luminanciaRelativa(primeiraCor);
  const segunda = luminanciaRelativa(segundaCor);

  const clara = Math.max(primeira, segunda);
  const escura = Math.min(primeira, segunda);

  return (clara + 0.05) / (escura + 0.05);
}

// Eu escolho branco ou preto no momento em que a cor do tenant é salva.
export function calcularForegroundSeguro(accent: string) {
  const cor = hexValido(accent) ? accent : DEFAULT_TENANT_ACCENT;

  const contrasteBranco = razaoContraste(cor, "#FFFFFF");
  const contrastePreto = razaoContraste(cor, "#000000");

  return contrasteBranco > contrastePreto ? "#FFFFFF" : "#000000";
}

export function gerarPaletaMarca(
  corPrincipal?: string | null,
  corEscura?: string | null,
): PaletaMarca {
  if (!hexValido(corPrincipal)) {
    return PALETA_PADRAO;
  }

  const principal = hexParaRgb(corPrincipal);

  const escura = hexValido(corEscura)
    ? hexParaRgb(corEscura)
    : misturar(principal, PRETO, 0.32);

  return {
    50: rgbParaHex(misturar(principal, BRANCO, 0.94)),
    100: rgbParaHex(misturar(principal, BRANCO, 0.86)),
    200: rgbParaHex(misturar(principal, BRANCO, 0.66)),
    500: rgbParaHex(principal),
    600: rgbParaHex(misturar(principal, PRETO, 0.14)),
    700: rgbParaHex(escura),
    900: rgbParaHex(misturar(escura, PRETO, 0.35)),
    950: rgbParaHex(misturar(escura, PRETO, 0.55)),
  };
}
