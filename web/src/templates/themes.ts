import type { TemplateTheme } from '../types';

export interface ThemeConfig {
  name: string;
  label: string;
  // Identidade visual
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  cardBg: string;
  textColor: string;
  textMutedColor: string;
  borderColor: string;
  // Tipografia
  fontFamily: string;
  fontFamilyHeading: string;
  // Forma
  borderRadius: string;
  // Classes Tailwind para componentes recorrentes
  buttonStyle: string;
  buttonOutlineStyle: string;
  headerBg: string;
  badgeDiscountStyle: string;
  // Comportamento visual
  heroLayout: 'banner' | 'editorial' | 'minimal' | 'combat';
  gridCols: string; // classes tailwind para o grid de produtos
}

export const themes: Record<TemplateTheme, ThemeConfig> = {
  // -------------------------------------------------------
  // MODA FEMININA — acessórios femininos
  // Cliente: loja de acessórios femininos
  // Personalidade: delicado, feminino, moderno
  // -------------------------------------------------------
  moda: {
    name: 'moda',
    label: 'Moda Feminina',
    primaryColor: '#be185d',       // pink-700
    secondaryColor: '#fce7f3',     // pink-100
    accentColor: '#db2777',        // pink-600
    bgColor: '#ffffff',
    cardBg: '#ffffff',
    textColor: '#1c1917',          // stone-900
    textMutedColor: '#78716c',     // stone-500
    borderColor: '#f3e8ff',        // purple-100
    fontFamily: "'Inter', sans-serif",
    fontFamilyHeading: "'Inter', sans-serif",
    borderRadius: '12px',
    buttonStyle: 'bg-pink-700 text-white hover:bg-pink-800 rounded-full font-medium',
    buttonOutlineStyle: 'border border-pink-700 text-pink-700 hover:bg-pink-50 rounded-full font-medium',
    headerBg: 'bg-white border-b border-pink-100',
    badgeDiscountStyle: 'bg-pink-600 text-white',
    heroLayout: 'banner',
    gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  },

  // -------------------------------------------------------
  // SEMI-JOIAS — acessórios premium (mantido)
  // -------------------------------------------------------
  'semi-joias': {
    name: 'semi-joias',
    label: 'Semi-joias',
    primaryColor: '#8b6f47',
    secondaryColor: '#faf7f2',
    accentColor: '#d4a853',
    bgColor: '#faf7f2',
    cardBg: '#ffffff',
    textColor: '#3d2b1f',
    textMutedColor: '#a78060',
    borderColor: '#e8d9c0',
    fontFamily: "'Playfair Display', serif",
    fontFamilyHeading: "'Playfair Display', serif",
    borderRadius: '8px',
    buttonStyle: 'bg-amber-700 text-white hover:bg-amber-800',
    buttonOutlineStyle: 'border border-amber-700 text-amber-700 hover:bg-amber-50',
    headerBg: 'bg-amber-50 border-b border-amber-200',
    badgeDiscountStyle: 'bg-amber-600 text-white',
    heroLayout: 'editorial',
    gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  },

  // -------------------------------------------------------
  // JIU-JITSU — artigos de luta
  // Cliente: loja de artigos de jiu-jitsu
  // Personalidade: intenso, disciplinado, premium esportivo
  // -------------------------------------------------------
  festas: {
    name: 'festas',
    label: 'Jiu-Jitsu & Luta',
    primaryColor: '#991b1b',       // red-800
    secondaryColor: '#1c1917',     // stone-900 (fundo dark do hero)
    accentColor: '#dc2626',        // red-600
    bgColor: '#0c0a09',            // stone-950
    cardBg: '#1c1917',             // stone-900
    textColor: '#fafaf9',          // stone-50
    textMutedColor: '#a8a29e',     // stone-400
    borderColor: '#292524',        // stone-800
    fontFamily: "'Inter', sans-serif",
    fontFamilyHeading: "'Inter', sans-serif",
    borderRadius: '4px',
    buttonStyle: 'bg-red-700 text-white hover:bg-red-800 uppercase tracking-wide font-bold',
    buttonOutlineStyle: 'border border-red-700 text-red-500 hover:bg-red-950 uppercase tracking-wide font-bold',
    headerBg: 'bg-stone-950 border-b border-stone-800',
    badgeDiscountStyle: 'bg-red-600 text-white',
    heroLayout: 'combat',
    gridCols: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-3',
  },

  // -------------------------------------------------------
  // FOOD DELIVERY — salgados e comida
  // Cliente: Fábrica de Salgados (delivery)
  // Personalidade: apetitoso, brasileiro, urgência de delivery
  // -------------------------------------------------------
  artesanato: {
    name: 'artesanato',
    label: 'Food & Delivery',
    primaryColor: '#c2410c',       // orange-700
    secondaryColor: '#fff7ed',     // orange-50
    accentColor: '#ea580c',        // orange-600
    bgColor: '#ffffff',
    cardBg: '#ffffff',
    textColor: '#1c1917',          // stone-900
    textMutedColor: '#78716c',     // stone-500
    borderColor: '#fed7aa',        // orange-200
    fontFamily: "'Inter', sans-serif",
    fontFamilyHeading: "'Inter', sans-serif",
    borderRadius: '16px',
    buttonStyle: 'bg-orange-600 text-white hover:bg-orange-700 font-bold shadow-sm shadow-orange-200',
    buttonOutlineStyle: 'border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-bold',
    headerBg: 'bg-white border-b border-orange-100 shadow-sm',
    badgeDiscountStyle: 'bg-orange-500 text-white',
    heroLayout: 'minimal',
    gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  },
};

export function getTheme(name: TemplateTheme): ThemeConfig {
  return themes[name] || themes.moda;
}

// Mapeamento de nomes antigos para novos (retrocompatibilidade)
export const THEME_LABELS: Record<TemplateTheme, string> = {
  moda: 'Moda Feminina',
  'semi-joias': 'Semi-joias & Premium',
  festas: 'Jiu-Jitsu & Esportes',
  artesanato: 'Food & Delivery',
};
