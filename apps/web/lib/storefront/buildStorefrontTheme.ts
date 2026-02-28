import { createTheme, alpha, type Theme } from "@mui/material/styles";
import type { PaletteConfig, TypographyConfig, ProductCardConfig } from "@/lib/types/storefront-config";

const fontSizeMap = { sm: 13, md: 15, lg: 16, xl: 18 } as const;

const headingSizeMap = {
  sm: { h1: "1.8rem", h2: "1.4rem", h3: "1.2rem" },
  md: { h1: "2.2rem", h2: "1.7rem", h3: "1.4rem" },
  lg: { h1: "2.8rem", h2: "2rem",   h3: "1.6rem" },
  xl: { h1: "3.5rem", h2: "2.5rem", h3: "2rem"   },
} as const;

const radiusMap = { none: 0, sm: 4, md: 8, lg: 12, xl: 20 } as const;

export function buildStorefrontTheme(
  palette: PaletteConfig,
  typography: TypographyConfig,
  borderRadius: ProductCardConfig["borderRadius"] = "md"
): Theme {
  return createTheme({
    palette: {
      mode:       "dark",
      primary:    { main: palette.primary, contrastText: "#ffffff" },
      secondary:  { main: palette.secondary },
      background: { default: palette.background, paper: palette.surface },
      text:       { primary: palette.text },
    },
    typography: {
      fontFamily: typography.fontFamily,
      fontSize:   fontSizeMap[typography.bodySize],
      h1: { fontSize: headingSizeMap[typography.headingSize].h1, fontWeight: 800, letterSpacing: "-0.03em" },
      h2: { fontSize: headingSizeMap[typography.headingSize].h2, fontWeight: 700, letterSpacing: "-0.02em" },
      h3: { fontSize: headingSizeMap[typography.headingSize].h3, fontWeight: 700 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: { fontWeight: 600, textTransform: "none" as const },
    },
    shape: { borderRadius: radiusMap[borderRadius] },
    components: {
      MuiCssBaseline: {
        styleOverrides: { body: { backgroundColor: palette.background } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { textTransform: "none", fontWeight: 600, borderRadius: 9999 },
          containedPrimary: {
            background: `linear-gradient(135deg, ${palette.primary} 0%, ${palette.accent} 100%)`,
            boxShadow:  `0 4px 20px ${alpha(palette.primary, 0.4)}`,
            "&:hover":  { boxShadow: `0 6px 28px ${alpha(palette.primary, 0.6)}` },
          },
          outlinedPrimary: {
            borderColor: alpha(palette.primary, 0.5),
            "&:hover": { borderColor: palette.primary, backgroundColor: alpha(palette.primary, 0.08) },
          },
          outlinedInherit: {
            borderColor: "rgba(255,255,255,0.15)",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: palette.surface,
            backgroundImage: "none",
            border: `1px solid ${alpha("#fff", 0.07)}`,
            transition: "border-color 0.2s, box-shadow 0.2s",
            "&:hover": { borderColor: alpha(palette.primary, 0.3) },
          },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: "none",
            backgroundColor: alpha(palette.background, 0.88),
            backdropFilter: "blur(12px)",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
          outlinedPrimary: {
            borderColor: alpha(palette.primary, 0.45),
            backgroundColor: alpha(palette.primary, 0.08),
          },
        },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: "rgba(255,255,255,0.08)" } },
      },
    },
  });
}
