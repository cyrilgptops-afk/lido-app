import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  Divider,
  Chip,
  alpha
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import Link from "next/link";
import { useRouter } from "next/router";

const DRAWER_WIDTH = 248;
const LIDO_BLUE = "#2362E8";

const NAV_ITEMS = [
  { href: "/dashboard",               label: "Overview",      icon: <DashboardRoundedIcon  fontSize="small" /> },
  { href: "/bots",                    label: "Bots",          icon: <SmartToyRoundedIcon   fontSize="small" /> },
  { href: "/integrations",            label: "Integrations",  icon: <ExtensionRoundedIcon  fontSize="small" /> },
  { href: "/storefront",              label: "Storefront",    icon: <StorefrontRoundedIcon fontSize="small" /> },
  { href: "/admin/storefront/config", label: "SF Config",     icon: <TuneRoundedIcon       fontSize="small" /> },
  { href: "/settings",                label: "Settings",      icon: <SettingsRoundedIcon   fontSize="small" /> },
];

/** Inline SVG that replicates the Lido circuit-mark icon */
function LidoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="60" height="60" rx="14" stroke={LIDO_BLUE} strokeWidth="5" />
      <path
        d="M14 22 H28 V32 H40 V42"
        stroke={LIDO_BLUE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="40" cy="44" r="4" fill={LIDO_BLUE} />
      <circle cx="28" cy="20" r="3" fill={LIDO_BLUE} />
    </svg>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <Box
        sx={{
          px: 2.5,
          py: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minHeight: 64
        }}
      >
        <LidoMark size={30} />
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{
            fontSize: "1.15rem",
            letterSpacing: "-0.02em",
            background: `linear-gradient(135deg, #fff 30%, ${LIDO_BLUE})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}
        >
          Lido
        </Typography>
        <Chip
          label="Console"
          size="small"
          sx={{
            ml: 0.5,
            height: 18,
            fontSize: "0.6rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            bgcolor: alpha(LIDO_BLUE, 0.15),
            color: LIDO_BLUE,
            border: `1px solid ${alpha(LIDO_BLUE, 0.3)}`,
            "& .MuiChip-label": { px: 1 }
          }}
        />
      </Box>

      <Divider />

      {/* Nav items */}
      <List sx={{ px: 1.5, pt: 1.5, flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = router.pathname === item.href;
          return (
            <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={Link}
                href={item.href}
                selected={active}
              >
                <ListItemIcon sx={{ minWidth: 34, color: active ? LIDO_BLUE : "text.secondary" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: "0.875rem",
                    fontWeight: active ? 600 : 400,
                    color: active ? "text.primary" : "text.secondary"
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Bottom version badge */}
      <Box sx={{ px: 2.5, pb: 2.5 }}>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="caption" color="text.disabled">
          Lido v0.1.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            borderRight: `1px solid rgba(255,255,255,0.07)`
          }
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            color: "text.primary"
          }}
        >
          <Toolbar sx={{ minHeight: 64 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ ml: "auto", textTransform: "none", fontWeight: 500, fontSize: "0.8rem" }}>
              My Workspace
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ flexGrow: 1, p: { xs: 3, md: 4 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
