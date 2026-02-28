import { createTheme, alpha } from "@mui/material/styles";

// ── Lido brand tokens ──────────────────────────────────────────────────────────
// Primary blue extracted from the Lido logo mark
const LIDO_BLUE      = "#2362E8";
const LIDO_BLUE_DARK = "#1A4FCA";
const LIDO_BLUE_DIM  = "#1B3B8A";

// Dark navy palette inspired by the circuit/automation aesthetic of the logo
const BG_DEFAULT = "#070C18";   // deep space navy
const BG_PAPER   = "#0D1526";   // sidebar / cards
const BG_SURFACE = "#132037";   // elevated surfaces
const BORDER     = "rgba(255,255,255,0.07)";

const TEXT_PRIMARY   = "#EEF2FF";  // near-white with a blue tint
const TEXT_SECONDARY = "#7E93BC";  // muted blue-grey
// ──────────────────────────────────────────────────────────────────────────────

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main:  LIDO_BLUE,
      dark:  LIDO_BLUE_DARK,
      light: "#5B8EF4",
      contrastText: "#ffffff"
    },
    secondary: {
      main: "#38BDF8",
      contrastText: "#070C18"
    },
    background: {
      default: BG_DEFAULT,
      paper:   BG_PAPER
    },
    text: {
      primary:   TEXT_PRIMARY,
      secondary: TEXT_SECONDARY,
      disabled:  "#3D5275"
    },
    divider: BORDER,
    error:   { main: "#F43F5E" },
    success: { main: "#10B981" },
    warning: { main: "#F59E0B" },
    info:    { main: LIDO_BLUE }
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      "sans-serif"
    ].join(","),
    h1: { fontWeight: 800, letterSpacing: "-0.03em" },
    h2: { fontWeight: 700, letterSpacing: "-0.025em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700, letterSpacing: "-0.015em" },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase", fontSize: "0.7rem" },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.65 },
    button: { fontWeight: 600, letterSpacing: "0.01em" }
  },
  shape: { borderRadius: 10 },
  shadows: [
    "none",
    `0 1px 3px ${alpha(LIDO_BLUE, 0.08)}`,
    `0 2px 6px ${alpha(LIDO_BLUE, 0.10)}`,
    `0 4px 12px ${alpha(LIDO_BLUE, 0.12)}`,
    `0 6px 20px ${alpha(LIDO_BLUE, 0.14)}`,
    `0 8px 24px ${alpha(LIDO_BLUE, 0.16)}`,
    `0 10px 32px ${alpha(LIDO_BLUE, 0.18)}`,
    `0 12px 40px ${alpha(LIDO_BLUE, 0.20)}`,
    `0 14px 48px ${alpha(LIDO_BLUE, 0.22)}`,
    `0 16px 52px ${alpha(LIDO_BLUE, 0.24)}`,
    `0 18px 56px ${alpha(LIDO_BLUE, 0.26)}`,
    `0 20px 60px ${alpha(LIDO_BLUE, 0.28)}`,
    `0 22px 64px ${alpha(LIDO_BLUE, 0.30)}`,
    `0 24px 68px ${alpha(LIDO_BLUE, 0.32)}`,
    `0 26px 72px ${alpha(LIDO_BLUE, 0.34)}`,
    `0 28px 76px ${alpha(LIDO_BLUE, 0.36)}`,
    `0 30px 80px ${alpha(LIDO_BLUE, 0.38)}`,
    `0 32px 84px ${alpha(LIDO_BLUE, 0.40)}`,
    `0 34px 88px ${alpha(LIDO_BLUE, 0.42)}`,
    `0 36px 92px ${alpha(LIDO_BLUE, 0.44)}`,
    `0 38px 96px ${alpha(LIDO_BLUE, 0.46)}`,
    `0 40px 100px ${alpha(LIDO_BLUE, 0.48)}`,
    `0 42px 104px ${alpha(LIDO_BLUE, 0.50)}`,
    `0 44px 108px ${alpha(LIDO_BLUE, 0.52)}`,
    `0 46px 112px ${alpha(LIDO_BLUE, 0.54)}`
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "*": { boxSizing: "border-box" },
        html: { scrollBehavior: "smooth" },
        "::-webkit-scrollbar": { width: 6, height: 6 },
        "::-webkit-scrollbar-track": { background: BG_DEFAULT },
        "::-webkit-scrollbar-thumb": {
          background: LIDO_BLUE_DIM,
          borderRadius: 3,
          "&:hover": { background: LIDO_BLUE }
        }
      }
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 9999,
          paddingLeft: 20,
          paddingRight: 20
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${LIDO_BLUE} 0%, ${LIDO_BLUE_DARK} 100%)`,
          boxShadow: `0 4px 14px ${alpha(LIDO_BLUE, 0.40)}`,
          "&:hover": {
            background: `linear-gradient(135deg, #3B7FF5 0%, ${LIDO_BLUE} 100%)`,
            boxShadow: `0 6px 20px ${alpha(LIDO_BLUE, 0.55)}`
          }
        },
        outlinedPrimary: {
          borderColor: alpha(LIDO_BLUE, 0.5),
          "&:hover": {
            borderColor: LIDO_BLUE,
            backgroundColor: alpha(LIDO_BLUE, 0.08)
          }
        },
        outlinedInherit: {
          borderColor: BORDER,
          "&:hover": { backgroundColor: alpha("#fff", 0.04) }
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
            borderColor: alpha(LIDO_BLUE, 0.25)
          }
        }
      }
    },
    MuiCardActionArea: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          "&:hover .MuiCardActionArea-focusHighlight": {
            opacity: 0.05
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: BG_PAPER,
          backgroundImage: "none"
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: alpha(BG_DEFAULT, 0.85),
          backdropFilter: "blur(12px)"
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          transition: "background 0.15s",
          "&:hover": { backgroundColor: alpha(LIDO_BLUE, 0.08) },
          "&.Mui-selected": {
            background: `linear-gradient(90deg, ${alpha(LIDO_BLUE, 0.22)} 0%, ${alpha(LIDO_BLUE, 0.08)} 100%)`,
            borderLeft: `2px solid ${LIDO_BLUE}`,
            paddingLeft: "calc(12px - 2px)",
            color: "#fff",
            "& .MuiListItemIcon-root": { color: LIDO_BLUE },
            "&:hover": { background: `linear-gradient(90deg, ${alpha(LIDO_BLUE, 0.28)} 0%, ${alpha(LIDO_BLUE, 0.12)} 100%)` }
          }
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
        outlinedPrimary: {
          borderColor: alpha(LIDO_BLUE, 0.45),
          backgroundColor: alpha(LIDO_BLUE, 0.08)
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            backgroundColor: BG_SURFACE,
            "& fieldset": { borderColor: BORDER },
            "&:hover fieldset": { borderColor: alpha(LIDO_BLUE, 0.4) },
            "&.Mui-focused fieldset": { borderColor: LIDO_BLUE }
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
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: BG_SURFACE,
          border: `1px solid ${BORDER}`,
          fontSize: "0.75rem"
        }
      }
    }
  }
});

export default theme;
