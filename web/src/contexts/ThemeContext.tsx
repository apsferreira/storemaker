import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getTheme, type ThemeConfig } from '../templates/themes';
import { useStore } from './StoreContext';

const ThemeContext = createContext<ThemeConfig>(getTheme('moda'));

// Converte ThemeConfig em CSS custom properties para uso em toda a árvore
function buildCSSVars(theme: ThemeConfig): React.CSSProperties {
  return {
    '--color-primary': theme.primaryColor,
    '--color-secondary': theme.secondaryColor,
    '--color-accent': theme.accentColor,
    '--color-bg': theme.bgColor,
    '--color-card-bg': theme.cardBg,
    '--color-text': theme.textColor,
    '--color-text-muted': theme.textMutedColor,
    '--color-border': theme.borderColor,
    '--font-body': theme.fontFamily,
    '--font-heading': theme.fontFamilyHeading,
    '--radius': theme.borderRadius,
    fontFamily: theme.fontFamily,
    backgroundColor: theme.bgColor,
    color: theme.textColor,
    minHeight: '100vh',
  } as React.CSSProperties;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { store } = useStore();
  const theme = getTheme(store.template);
  const cssVars = useMemo(() => buildCSSVars(theme), [theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <div style={cssVars}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
