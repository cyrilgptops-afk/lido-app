import { useState, useEffect } from "react";
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
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import Link from "next/link";
import { useRouter } from "next/router";
import { botsApi } from "../../lib/api/bots";
import type { ActiveBot as BotNavItem, ApplicationBotConfig } from "../../lib/api/bots";

const DRAWER_WIDTH = 248;
const LIDO_BLUE = "#2362E8";

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

// ── Reusable nav helpers ─────────────────────────────────────────────────────
interface NavItemDef { href: string; label: string; icon: React.ReactNode }

function NavListItem({ item, active, indent }: {
  item: NavItemDef;
  active: boolean;
  indent?: boolean;
}) {
  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <ListItemButton
        component={Link}
        href={item.href}
        selected={active}
        sx={indent ? { pl: 2.5 } : undefined}
      >
        <ListItemIcon sx={{ minWidth: 34, color: active ? LIDO_BLUE : "text.secondary" }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontSize: "0.875rem",
            fontWeight: active ? 600 : 400,
            color: active ? "text.primary" : "text.secondary",
            noWrap: true,
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}

function NavGroupLabel({ label }: { label: string }) {
  return (
    <Typography
      variant="caption"
      sx={{
        px: 1.5, pt: 1.5, pb: 0.25, display: "block",
        color: "text.disabled", fontSize: "0.65rem",
        fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
      }}
    >
      {label}
    </Typography>
  );
}

interface DashboardLayoutProps {
  children  : React.ReactNode;
  /** Remove AppBar + padding so content fills 100% of the viewport height. */
  fullWindow?: boolean;
}

export default function DashboardLayout({ children, fullWindow = false }: DashboardLayoutProps) {
  const router = useRouter();

  // isEmbedded = ?fullscreen=1 in URL → hides sidebar + AppBar (true fullscreen / iframe embed).
  // Computed in an effect so it's only evaluated client-side after router is ready,
  // preventing SSR/hydration mismatches.
  const [isEmbedded, setIsEmbedded] = useState(false);
  useEffect(() => {
    if (!router.isReady) return;
    const p = String(router.query.fullscreen ?? '').toLowerCase();
    setIsEmbedded(p === '1' || p === 'true' || p === 'yes');
  }, [router.isReady, router.query.fullscreen]);

  // isFullWindow = hides AppBar + removes padding (sidebar still visible).
  // Activated by the fullWindow prop OR when embedded.
  const isFullWindow = fullWindow || isEmbedded;

  const [chatBots, setChatBots] = useState<BotNavItem[]>([]);
  const [appBots,  setAppBots]  = useState<BotNavItem[]>([]);

  useEffect(() => {
    botsApi.getActiveBots('chat')
      .then((r) => setChatBots(r.data ?? []))
      .catch(() => {});
    botsApi.getActiveBots('application')
      .then((r) => setAppBots(r.data ?? []))
      .catch(() => {});
  }, []);

  /** True when itemHref (path + optional ?query) matches the current route. */
  const isNavActive = (itemHref: string): boolean => {
    const [itemPath, qs] = itemHref.split('?');

    // Exact pathname match (static routes)
    if (router.pathname === itemPath) {
      if (!qs) return true;
      const params = new URLSearchParams(qs);
      return [...params.entries()].every(([k, v]) => String(router.query[k]) === v);
    }

    // Dynamic route match: e.g. itemHref='/apps/42' vs pathname='/apps/[botId]'
    // Split both into segments and compare, treating [param] as a wildcard.
    const itemSegments   = itemPath.split('/').filter(Boolean);
    const routeSegments  = router.pathname.split('/').filter(Boolean);
    if (itemSegments.length !== routeSegments.length) return false;
    const dynamicMatch = routeSegments.every((seg, i) => {
      if (/^\[.+\]$/.test(seg)) {
        // Extract param name and compare against actual query value
        const paramName = seg.slice(1, -1);
        return String(router.query[paramName]) === itemSegments[i];
      }
      return seg === itemSegments[i];
    });
    return dynamicMatch;
  };

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
        {/* ── Overview + Bots (always visible) ─────────────────── */}
        {([
          { href: "/dashboard", label: "Overview", icon: <DashboardRoundedIcon fontSize="small" /> },
          { href: "/bots",      label: "Bots",     icon: <SmartToyRoundedIcon  fontSize="small" /> },
        ] as NavItemDef[]).map((item) => (
          <NavListItem key={item.href} item={item} active={isNavActive(item.href)} />
        ))}

        {/* ── Chat bots — one nav item per deployed chat bot ──── */}
        {chatBots.length > 0 && (
          <>
            <NavGroupLabel label="Chat" />
            {chatBots.map((b) => {
              const href = `/chat?botId=${b.id}`;
              return (
                <NavListItem
                  key={`chat-${b.id}`}
                  item={{ href, label: b.display_name || b.name, icon: <ChatRoundedIcon fontSize="small" /> }}
                  active={isNavActive(href)}
                  indent
                />
              );
            })}
          </>
        )}

        {/* ── Application bots — one nav item per deployed app ── */}
        {appBots.length > 0 && (
          <>
            <NavGroupLabel label="Applications" />
            {appBots.map((b) => {
              const cfg       = (b.config ?? {}) as ApplicationBotConfig;
              const isDynamic = cfg.embedType === 'dynamic' || (!cfg.appUrl && Boolean(b.storage_key));
              const href      = isDynamic ? `/apps/${b.id}` : `/apps?botId=${b.id}`;
              return (
                <NavListItem
                  key={`app-${b.id}`}
                  item={{ href, label: b.display_name || b.name, icon: <AppsRoundedIcon fontSize="small" /> }}
                  active={isNavActive(href)}
                  indent
                />
              );
            })}
          </>
        )}

        {/* ── Remaining static items ───────────────────────────── */}
        {([
          { href: "/integrations",            label: "Integrations", icon: <ExtensionRoundedIcon  fontSize="small" /> },
          { href: "/storefront",              label: "Storefront",   icon: <StorefrontRoundedIcon fontSize="small" /> },
          { href: "/admin/storefront/config", label: "SF Config",    icon: <TuneRoundedIcon       fontSize="small" /> },
          { href: "/settings",                label: "Settings",     icon: <SettingsRoundedIcon   fontSize="small" /> },
        ] as NavItemDef[]).map((item) => (
          <NavListItem key={item.href} item={item} active={isNavActive(item.href)} />
        ))}
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
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden", bgcolor: "background.default" }}>
      {/* Sidebar — hidden in embedded (?fullscreen=1) mode */}
      {!isEmbedded && (
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
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow       : 1,
          display        : "flex",
          flexDirection  : "column",
          height         : "100vh",
          overflow       : "hidden",
          minWidth       : 0,
        }}
      >
        {/* Top AppBar — hidden in fullWindow / ?fullscreen mode */}
        {!isFullWindow && (
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              color: "text.primary",
              flexShrink: 0,
            }}
          >
            <Toolbar sx={{ minHeight: 64 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                sx={{ ml: "auto", textTransform: "none", fontWeight: 500, fontSize: "0.8rem" }}
              >
                My Workspace
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        {/* Content area */}
        <Box
          sx={{
            flexGrow  : 1,
            overflow  : isFullWindow ? "hidden" : "auto",
            p         : isFullWindow ? 0 : { xs: 3, md: 4 },
            display   : isFullWindow ? "flex" : "block",
            flexDirection: "column",
            height    : isFullWindow ? "100%" : undefined,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
