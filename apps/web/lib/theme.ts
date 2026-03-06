import { createTheme, alpha } from "@mui/material/styles";

// Magento-inspired palette, blue-primary variant
const MAGENTO_BLUE = "#1E5BD8";
const MAGENTO_BLUE_DARK = "#1748B1";
const MAGENTO_CHARCOAL = "#1F1F1F";
const BG_DEFAULT = "#F2F4F7";
const BG_PAPER = "#FFFFFF";
const BORDER = "#E5E7EB";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: MAGENTO_BLUE,
      dark: MAGENTO_BLUE_DARK,
      light: "#4D7EF0",
      contrastText: "#FFFFFF"
    },
    secondary: {
      main: "#111827",
      contrastText: "#FFFFFF"
    },
    background: {
      default: BG_DEFAULT,
      paper: BG_PAPER
    },
    text: {
      primary: MAGENTO_CHARCOAL,
      secondary: "#6B7280",
      disabled: "#9CA3AF"
    },
    divider: BORDER,
    error: { main: "#DC2626" },
    success: { main: "#16A34A" },
    warning: { main: "#F59E0B" },
    info: { main: "#2563EB" }
  },
  spacing: 8,
  typography: {
    fontFamily: [
      "Open Sans",
      "Montserrat",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "sans-serif"
    ].join(","),
    h1: { fontWeight: 700, letterSpacing: "-0.02em", fontSize: "2.6rem", lineHeight: 1.1 },
    h2: { fontWeight: 700, letterSpacing: "-0.02em", fontSize: "2.1rem", lineHeight: 1.15 },
    h3: { fontWeight: 700, letterSpacing: "-0.015em", fontSize: "1.8rem", lineHeight: 1.2 },
    h4: { fontWeight: 600, letterSpacing: "-0.01em", fontSize: "1.5rem", lineHeight: 1.25 },
    h5: { fontWeight: 600, fontSize: "1.2rem", lineHeight: 1.3 },
    h6: { fontWeight: 600, fontSize: "1rem", lineHeight: 1.35 },
    subtitle1: { fontWeight: 600, fontSize: "0.95rem" },
    subtitle2: { fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "0.7rem" },
    body1: { lineHeight: 1.65, fontSize: "0.98rem" },
    body2: { lineHeight: 1.6, fontSize: "0.9rem" },
    button: { fontWeight: 700, letterSpacing: "0.01em" },
    caption: { letterSpacing: "0.02em" }
  },
  shape: { borderRadius: 10 },
  shadows: [
    "none",
    "0 1px 2px rgba(0,0,0,0.06)",
    "0 2px 6px rgba(0,0,0,0.08)",
    "0 4px 10px rgba(0,0,0,0.10)",
    "0 8px 18px rgba(0,0,0,0.12)",
    "0 12px 24px rgba(0,0,0,0.14)",
    "0 16px 32px rgba(0,0,0,0.16)",
    "0 20px 40px rgba(0,0,0,0.18)",
    "0 24px 48px rgba(0,0,0,0.20)",
    "0 28px 56px rgba(0,0,0,0.22)",
    "0 32px 64px rgba(0,0,0,0.24)",
    "0 36px 72px rgba(0,0,0,0.26)",
    "0 40px 80px rgba(0,0,0,0.28)",
    "0 44px 88px rgba(0,0,0,0.30)",
    "0 48px 96px rgba(0,0,0,0.32)",
    "0 52px 104px rgba(0,0,0,0.34)",
    "0 56px 112px rgba(0,0,0,0.36)",
    "0 60px 120px rgba(0,0,0,0.38)",
    "0 64px 128px rgba(0,0,0,0.40)",
    "0 68px 136px rgba(0,0,0,0.42)",
    "0 72px 144px rgba(0,0,0,0.44)",
    "0 76px 152px rgba(0,0,0,0.46)",
    "0 80px 160px rgba(0,0,0,0.48)",
    "0 84px 168px rgba(0,0,0,0.50)",
    "0 88px 176px rgba(0,0,0,0.52)",
    "0 92px 184px rgba(0,0,0,0.54)"
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*": { boxSizing: "border-box" },
        html: { scrollBehavior: "smooth" },
        body: {
          background: "linear-gradient(180deg, #F6F8FB 0%, #EEF1F5 100%)"
        },
        "::-webkit-scrollbar": { width: 8, height: 8 },
        "::-webkit-scrollbar-track": { background: BG_DEFAULT },
        "::-webkit-scrollbar-thumb": {
          background: "#D1D5DB",
          borderRadius: 6,
          "&:hover": { background: "#9CA3AF" }
        }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 700,
          borderRadius: 8
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${MAGENTO_BLUE} 0%, ${MAGENTO_BLUE_DARK} 100%)`,
          boxShadow: `0 6px 16px ${alpha(MAGENTO_BLUE, 0.35)}`,
          "&:hover": {
            background: `linear-gradient(135deg, #4D7EF0 0%, ${MAGENTO_BLUE} 100%)`
          }
        },
        outlinedPrimary: {
          borderColor: alpha(MAGENTO_BLUE, 0.7),
          "&:hover": {
            borderColor: MAGENTO_BLUE,
            backgroundColor: alpha(MAGENTO_BLUE, 0.08)
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: BG_PAPER,
          border: `1px solid ${BORDER}`,
          transition: "border-color 0.2s, box-shadow 0.2s",
          "&:hover": {
            borderColor: alpha(MAGENTO_BLUE, 0.25)
          }
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#FFFFFF",
          backgroundImage: "none",
          borderRight: `1px solid ${BORDER}`
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#FFFFFF",
          color: MAGENTO_CHARCOAL,
          borderBottom: `1px solid ${BORDER}`,
          boxShadow: "0 8px 20px rgba(15, 23, 42, 0.06)"
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: "background 0.15s",
          "&:hover": { backgroundColor: alpha(MAGENTO_BLUE, 0.08) },
          "&.Mui-selected": {
            background: `linear-gradient(90deg, ${alpha(MAGENTO_BLUE, 0.18)} 0%, ${alpha(MAGENTO_BLUE, 0.05)} 100%)`,
            borderLeft: `2px solid ${MAGENTO_BLUE}`,
            paddingLeft: "calc(12px - 2px)",
            color: MAGENTO_CHARCOAL,
            "& .MuiListItemIcon-root": { color: MAGENTO_BLUE },
            "&:hover": { background: `linear-gradient(90deg, ${alpha(MAGENTO_BLUE, 0.24)} 0%, ${alpha(MAGENTO_BLUE, 0.08)} 100%)` }
          }
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#FFFFFF",
            "& fieldset": { borderColor: BORDER },
            "&:hover fieldset": { borderColor: alpha(MAGENTO_BLUE, 0.4) },
            "&.Mui-focused fieldset": { borderColor: MAGENTO_BLUE }
          }
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: BORDER }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${BORDER}` }
      }
    }
  }
});

export default theme;


