export type VisualFeedbackKind = 'neutral' | 'success' | 'warning' | 'blocked' | 'error';

export interface YaLabsThemeTokens {
  colors: {
    surface: string;
    surfaceMuted: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    success: string;
    warning: string;
    danger: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
  };
  radius: {
    sm: number;
    md: number;
  };
}

export interface VisualMessageStyle {
  kind: VisualFeedbackKind;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  icon: 'info' | 'check' | 'alert' | 'block' | 'error';
}

export interface YaLabsVisualProfile {
  reference: 'YA_LABS';
  mode: 'operational-clarity';
  tokens: YaLabsThemeTokens;
}

export function getYaLabsVisualProfile(): YaLabsVisualProfile {
  return {
    reference: 'YA_LABS',
    mode: 'operational-clarity',
    tokens: {
      colors: {
        surface: '#0E1A24',
        surfaceMuted: '#142635',
        textPrimary: '#F3F7FB',
        textSecondary: '#BED0E0',
        accent: '#00A6A6',
        success: '#1C8C5E',
        warning: '#B97600',
        danger: '#A12626'
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24
      },
      radius: {
        sm: 6,
        md: 10
      }
    }
  };
}

export function getVisualMessageStyle(kind: VisualFeedbackKind): VisualMessageStyle {
  const profile = getYaLabsVisualProfile();

  if (kind === 'success') {
    return {
      kind,
      backgroundColor: profile.tokens.colors.surfaceMuted,
      borderColor: profile.tokens.colors.success,
      textColor: profile.tokens.colors.textPrimary,
      icon: 'check'
    };
  }

  if (kind === 'warning') {
    return {
      kind,
      backgroundColor: profile.tokens.colors.surfaceMuted,
      borderColor: profile.tokens.colors.warning,
      textColor: profile.tokens.colors.textPrimary,
      icon: 'alert'
    };
  }

  if (kind === 'blocked') {
    return {
      kind,
      backgroundColor: profile.tokens.colors.surfaceMuted,
      borderColor: profile.tokens.colors.danger,
      textColor: profile.tokens.colors.textPrimary,
      icon: 'block'
    };
  }

  if (kind === 'error') {
    return {
      kind,
      backgroundColor: profile.tokens.colors.surfaceMuted,
      borderColor: profile.tokens.colors.danger,
      textColor: profile.tokens.colors.textPrimary,
      icon: 'error'
    };
  }

  return {
    kind: 'neutral',
    backgroundColor: profile.tokens.colors.surface,
    borderColor: profile.tokens.colors.accent,
    textColor: profile.tokens.colors.textSecondary,
    icon: 'info'
  };
}
