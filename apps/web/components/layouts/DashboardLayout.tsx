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
  alpha,
  IconButton,
  Tooltip,
  useMediaQuery,
  Autocomplete,
  TextField,
  BottomNavigation,
  BottomNavigationAction,
  InputAdornment
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import AppsRoundedIcon from "@mui/icons-material/AppsRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import Link from "next/link";
import { useRouter } from "next/router";
import { botsApi } from "../../lib/api/bots";
import type { ActiveBot as BotNavItem, ApplicationBotConfig } from "../../lib/api/bots";

const DRAWER_WIDTH = 260;
const COLLAPSED_WIDTH = 76;
const MAGENTO_BLUE = "#1E5BD8";

/** Inline SVG that replicates the Lido circuit-mark icon */
function LidoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="60" height="60" rx="14" stroke={MAGENTO_BLUE} strokeWidth="5" />
      <path
        d="M14 22 H28 V32 H40 V42"
        stroke={MAGENTO_BLUE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="40" cy="44" r="4" fill={MAGENTO_BLUE} />
      <circle cx="28" cy="20" r="3" fill={MAGENTO_BLUE} />
    </svg>
  );
}

// Reusable nav helpers
interface NavItemDef { href: string; label: string; icon: React.ReactNode }

function NavListItem({ item, active, indent, collapsed }: {
  item: NavItemDef;
  active: boolean;
  indent?: boolean;
  collapsed: boolean;
}) {
  const button = (
    <ListItemButton
      component={Link}
      href={item.href}
      selected={active}
      sx={indent ? { pl: 2.5 } : undefined}
    >
      <ListItemIcon sx={{ minWidth: 34, color: active ? MAGENTO_BLUE : "text.secondary", justifyContent: "center" }}>
        {item.icon}
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        primaryTypographyProps={{
          fontSize: "0.875rem",
          fontWeight: active ? 600 : 400,
          color: active ? "text.primary" : "text.secondary",
          noWrap: true
        }}
        sx={{
          opacity: collapsed ? 0 : 1,
          width: collapsed ? 0 : "auto",
          transition: "opacity 0.2s",
          whiteSpace: "nowrap"
        }}
      />
    </ListItemButton>
  );

  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      {collapsed ? (
        <Tooltip title={item.label} placement="right" arrow>
          <Box>{button}</Box>
        </Tooltip>
      ) : button}
    </ListItem>
  );
}

function NavGroupLabel({ label, hidden }: { label: string; hidden: boolean }) {
  if (hidden) return null;
  return (
    <Typography
      variant="caption"
      sx={{
        px: 1.5, pt: 1.5, pb: 0.25, display: "block",
        color: "text.disabled", fontSize: "0.65rem",
        fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase"
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // isEmbedded = ?fullscreen=1 in URL -> hides sidebar + AppBar (true fullscreen / iframe embed).
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

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const effectiveCollapsed = !isMobile && isCollapsed;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("lido.drawerCollapsed");
    if (stored != null) setIsCollapsed(stored === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("lido.drawerCollapsed", isCollapsed ? "1" : "0");
  }, [isCollapsed]);

  const drawerWidth = effectiveCollapsed ? COLLAPSED_WIDTH : DRAWER_WIDTH;

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
          px: effectiveCollapsed ? 1.25 : 2.5,
          py: 2.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minHeight: 64,
          justifyContent: effectiveCollapsed ? "center" : "flex-start"
        }}
      >
        <LidoMark size={30} />
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{
            fontSize: "1.15rem",
            letterSpacing: "-0.02em",
            background: `linear-gradient(135deg, #0B1B3A 5%, ${MAGENTO_BLUE} 95%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            opacity: effectiveCollapsed ? 0 : 1,
            width: effectiveCollapsed ? 0 : "auto",
            transition: "opacity 0.2s"
          }}
        >
          Lido
        </Typography>
        {!effectiveCollapsed && (
          <Chip
            label="Enterprise"
            size="small"
            sx={{
              ml: 0.5,
              height: 18,
              fontSize: "0.6rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              bgcolor: alpha(MAGENTO_BLUE, 0.15),
              color: MAGENTO_BLUE,
              border: `1px solid ${alpha(MAGENTO_BLUE, 0.3)}`,
              "& .MuiChip-label": { px: 1 }
            }}
          />
        )}
      </Box>

      <Divider />

      {/* Nav items */}
      <List sx={{ px: 1.5, pt: 1.5, flex: 1 }}>
        {/* Overview + Bots (always visible) */}
        {([
          { href: "/dashboard", label: "Overview", icon: <DashboardRoundedIcon fontSize="small" /> },
          { href: "/bots",      label: "Bots",     icon: <SmartToyRoundedIcon  fontSize="small" /> },
          { href: "/ui",        label: "UI Kit",   icon: <AppsRoundedIcon      fontSize="small" /> }
        ] as NavItemDef[]).map((item) => (
          <NavListItem key={item.href} item={item} active={isNavActive(item.href)} collapsed={effectiveCollapsed} />
        ))}

        {/* Chat bots — one nav item per deployed chat bot */}
        {chatBots.length > 0 && (
          <>
            <NavGroupLabel label="Chat" hidden={effectiveCollapsed} />
            {chatBots.map((b) => {
              const href = `/chat?botId=${b.id}`;
              return (
                <NavListItem
                  key={`chat-${b.id}`}
                  item={{ href, label: b.display_name || b.name, icon: <ChatRoundedIcon fontSize="small" /> }}
                  active={isNavActive(href)}
                  indent
                  collapsed={effectiveCollapsed}
                />
              );
            })}
          </>
        )}

        {/* Application bots — one nav item per deployed app */}
        {appBots.length > 0 && (
          <>
            <NavGroupLabel label="Applications" hidden={effectiveCollapsed} />
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
                  collapsed={effectiveCollapsed}
                />
              );
            })}
          </>
        )}

        {/* Remaining static items */}
        {([
          { href: "/integrations",            label: "Integrations", icon: <ExtensionRoundedIcon  fontSize="small" /> },
          { href: "/storefront",              label: "Storefront",   icon: <StorefrontRoundedIcon fontSize="small" /> },
          { href: "/admin/storefront/config", label: "SF Config",    icon: <TuneRoundedIcon       fontSize="small" /> },
          { href: "/settings",                label: "Settings",     icon: <SettingsRoundedIcon   fontSize="small" /> }
        ] as NavItemDef[]).map((item) => (
          <NavListItem key={item.href} item={item} active={isNavActive(item.href)} collapsed={effectiveCollapsed} />
        ))}
      </List>

      {/* Bottom version badge */}
      <Box sx={{ px: effectiveCollapsed ? 1.5 : 2.5, pb: 2.5 }}>
        <Divider sx={{ mb: 2 }} />
        {!effectiveCollapsed && (
          <Typography variant="caption" color="text.disabled">
            Lido v0.1.0
          </Typography>
        )}
      </Box>
    </Box>
  );

  const searchOptions = [
    "Launch a new bot",
    "Invite a teammate",
    "Configure webhooks",
    "Review failed runs",
    "View analytics"
  ];

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden", bgcolor: "background.default" }}>
      {/* Sidebar — hidden in embedded (?fullscreen=1) mode */}
      {!isEmbedded && (
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
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
          minWidth       : 0
        }}
      >
        {/* Top AppBar — hidden in fullWindow / ?fullscreen mode */}
        {!isFullWindow && (
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              borderBottom: "1px solid rgba(0,0,0,0.08)",
              color: "text.primary",
              flexShrink: 0
            }}
          >
            <Box
              sx={{
                height: 28,
                px: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.72rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "text.secondary",
                borderBottom: "1px solid rgba(0,0,0,0.06)",
                bgcolor: "#F6F7F9"
              }}
            >
              <Box>Enterprise Console</Box>
              <Box>Support • Status • Docs</Box>
            </Box>
            <Toolbar sx={{ minHeight: 64, gap: 1.5 }}>
              {isMobile ? (
                <IconButton color="inherit" onClick={() => setMobileOpen(true)}>
                  <MenuRoundedIcon />
                </IconButton>
              ) : (
                !isEmbedded && (
                  <IconButton
                    color="inherit"
                    onClick={() => setIsCollapsed((v) => !v)}
                    sx={{ mr: 0.5 }}
                  >
                    {isCollapsed ? <ChevronRightRoundedIcon /> : <ChevronLeftRoundedIcon />}
                  </IconButton>
                )
              )}

              {!isMobile && (
                <Autocomplete
                  freeSolo
                  options={searchOptions}
                  sx={{
                    minWidth: 320,
                    maxWidth: 420,
                    flexGrow: 1,
                    "& .MuiInputBase-root": { height: 40 }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Search workflows, bots, settings..."
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchRoundedIcon fontSize="small" />
                          </InputAdornment>
                        )
                      }}
                    />
                  )}
                />
              )}

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
            pb        : isFullWindow ? 0 : { xs: 10, md: 4 },
            display   : isFullWindow ? "flex" : "block",
            flexDirection: "column",
            height    : isFullWindow ? "100%" : undefined
          }}
        >
          {children}
        </Box>

        {isMobile && !isEmbedded && (
          <Box sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: theme.zIndex.appBar }}>
            <BottomNavigation
              showLabels
              value={router.pathname}
              onChange={(_, value) => router.push(value)}
              sx={{ borderTop: "1px solid rgba(255,255,255,0.08)", bgcolor: "background.paper" }}
            >
              <BottomNavigationAction
                label="Home"
                value="/dashboard"
                icon={<DashboardRoundedIcon fontSize="small" />}
              />
              <BottomNavigationAction
                label="Bots"
                value="/bots"
                icon={<SmartToyRoundedIcon fontSize="small" />}
              />
              <BottomNavigationAction
                label="Chat"
                value="/chat"
                icon={<ChatRoundedIcon fontSize="small" />}
              />
              <BottomNavigationAction
                label="Settings"
                value="/settings"
                icon={<SettingsRoundedIcon fontSize="small" />}
              />
            </BottomNavigation>
          </Box>
        )}
      </Box>
    </Box>
  );
}








