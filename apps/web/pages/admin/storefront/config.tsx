import Head from "next/head";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Stack,
  Chip,
  Divider,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Slider,
} from "@mui/material";
import { useState } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import {
  StorefrontConfigSchema,
  type StorefrontConfig,
} from "@/lib/types/storefront-config";

// ── Tab panel helper ─────────────────────────────────────────────────────────
function TabPanel({
  value,
  index,
  children,
}: {
  value: number;
  index: number;
  children: React.ReactNode;
}) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
      {children}
    </Typography>
  );
}

// ── Color picker row ─────────────────────────────────────────────────────────
function ColorRow({
  label,
  value,
  onChange,
}: {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
}) {
  return (
    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
      <Box
        component="input"
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          width: 44,
          height: 44,
          border: "none",
          borderRadius: 1,
          cursor: "pointer",
          p: 0.5,
          bgcolor: "background.paper",
        }}
      />
      <TextField
        size="small"
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ flex: 1, maxWidth: 160 }}
        inputProps={{ pattern: "^#[0-9A-Fa-f]{6}$" }}
      />
    </Stack>
  );
}

// ── Default config (mirrors API default) ────────────────────────────────────
const DEFAULT: StorefrontConfig = StorefrontConfigSchema.parse({
  botId: "default",
  palette:     { primary: "#2362E8", secondary: "#0D1526", background: "#070C18", surface: "#0D1526", text: "#EEF2FF", accent: "#3B82F6" },
  typography:  { fontFamily: "Inter, sans-serif", headingSize: "lg", bodySize: "md" },
  hero:        { enabled: true, title: "Welcome to our Store", subtitle: "Discover amazing products", ctaLabel: "Shop Now", ctaLink: "/storefront", height: "md", overlay: true },
  catalog:     { layout: "grid", columns: { xs: 1, sm: 2, md: 3, lg: 4 }, showCategory: true, showRating: true, showBadges: true, pageSize: 20, sortOptions: ["newest", "price_asc", "price_desc"], defaultSort: "newest", filterSidebar: true },
  productCard: { variant: "standard", showQuickAdd: true, showWishlist: false, showBadges: true, showCategory: true, showRating: true, imageAspect: "square", showDescription: false, borderRadius: "md", elevation: 2, hoverEffect: "lift" },
  checkout:    { steps: ["cart", "shipping", "payment", "review"], quickBuy: true, guestAllowed: true, showOrderSummary: true, showPromoCode: true, allowedPayments: ["stripe"] },
  header:      { logoText: "My Store", showSearch: true, showCart: true, showAccount: true, sticky: true, transparent: false, navLinks: [] },
  footer:      { enabled: true, links: [] },
  maintenanceMode: false,
});

// ── Main component ────────────────────────────────────────────────────────────
export default function StorefrontConfigPage() {
  const [cfg,      setCfg]      = useState<StorefrontConfig>(DEFAULT);
  const [tab,      setTab]      = useState(0);
  const [saving,   setSaving]   = useState(false);
  const [snack,    setSnack]    = useState<{ open: boolean; msg: string; severity: "success" | "error" }>({ open: false, msg: "", severity: "success" });

  // ── Patch helpers ──────────────────────────────────────────────────────────
  const patchPalette     = (k: keyof typeof cfg.palette,     v: string)  => setCfg((c) => ({ ...c, palette:     { ...c.palette,     [k]: v } }));
  const patchTypography  = (k: keyof typeof cfg.typography,  v: unknown) => setCfg((c) => ({ ...c, typography:  { ...c.typography,  [k]: v } }));
  const patchHero        = (k: keyof typeof cfg.hero,        v: unknown) => setCfg((c) => ({ ...c, hero:        { ...c.hero,        [k]: v } }));
  const patchCatalog     = (k: keyof typeof cfg.catalog,     v: unknown) => setCfg((c) => ({ ...c, catalog:     { ...c.catalog,     [k]: v } }));
  const patchProductCard = (k: keyof typeof cfg.productCard, v: unknown) => setCfg((c) => ({ ...c, productCard: { ...c.productCard, [k]: v } }));
  const patchCheckout    = (k: keyof typeof cfg.checkout,    v: unknown) => setCfg((c) => ({ ...c, checkout:    { ...c.checkout,    [k]: v } }));
  const patchHeader      = (k: keyof typeof cfg.header,      v: unknown) => setCfg((c) => ({ ...c, header:      { ...c.header,      [k]: v } }));
  const patchFooter      = (k: keyof typeof cfg.footer,      v: unknown) => setCfg((c) => ({ ...c, footer:      { ...c.footer,      [k]: v } }));

  const patchCatalogColumns = (k: "xs" | "sm" | "md" | "lg", v: number) =>
    setCfg((c) => ({ ...c, catalog: { ...c.catalog, columns: { ...c.catalog.columns, [k]: v } } }));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/storefront/${cfg.botId}/config`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ data: cfg }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSnack({ open: true, msg: "Configuration saved!", severity: "success" });
    } catch {
      setSnack({ open: true, msg: "Failed to save configuration.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <Head><title>Storefront Config – Lido</title></Head>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Storefront Configuration</Typography>
          <Typography variant="body2" color="text.secondary">
            Customise the look, layout and behaviour of the public storefront.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={cfg.maintenanceMode}
                onChange={(e) => setCfg((c) => ({ ...c, maintenanceMode: e.target.checked }))}
                color="warning"
              />
            }
            label={<Typography variant="body2">Maintenance mode</Typography>}
          />
          <Button variant="contained" color="primary" onClick={handleSave} disabled={saving} sx={{ px: 4 }}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {/* Tab navigation */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        textColor="primary"
        indicatorColor="primary"
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Palette" />
        <Tab label="Typography" />
        <Tab label="Hero Banner" />
        <Tab label="Catalog" />
        <Tab label="Product Card" />
        <Tab label="Checkout" />
        <Tab label="Header / Footer" />
      </Tabs>

      {/* ── Palette ─────────────────────────────────────────────────────── */}
      <TabPanel value={tab} index={0}>
        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>Brand Colours</SectionTitle>
            <Grid container spacing={3}>
              {(["primary", "secondary", "accent"] as const).map((k) => (
                <Grid item xs={12} sm={4} key={k}>
                  <ColorRow label={k.charAt(0).toUpperCase() + k.slice(1)} value={cfg.palette[k]} onChange={(v) => patchPalette(k, v)} />
                </Grid>
              ))}
            </Grid>
            <SectionTitle>Backgrounds</SectionTitle>
            <Grid container spacing={3}>
              {(["background", "surface", "text"] as const).map((k) => (
                <Grid item xs={12} sm={4} key={k}>
                  <ColorRow label={k.charAt(0).toUpperCase() + k.slice(1)} value={cfg.palette[k]} onChange={(v) => patchPalette(k, v)} />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ── Typography ──────────────────────────────────────────────────── */}
      <TabPanel value={tab} index={1}>
        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Font family"
                  value={cfg.typography.fontFamily}
                  onChange={(e) => patchTypography("fontFamily", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Heading size</InputLabel>
                  <Select
                    value={cfg.typography.headingSize}
                    label="Heading size"
                    onChange={(e) => patchTypography("headingSize", e.target.value)}
                  >
                    {["sm", "md", "lg", "xl"].map((v) => <MenuItem key={v} value={v}>{v.toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Body size</InputLabel>
                  <Select
                    value={cfg.typography.bodySize}
                    label="Body size"
                    onChange={(e) => patchTypography("bodySize", e.target.value)}
                  >
                    {["sm", "md", "lg"].map((v) => <MenuItem key={v} value={v}>{v.toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <TabPanel value={tab} index={2}>
        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <FormControlLabel
              control={<Switch checked={cfg.hero.enabled} onChange={(e) => patchHero("enabled", e.target.checked)} />}
              label="Enable hero banner"
              sx={{ mb: 3 }}
            />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="Title" value={cfg.hero.title} onChange={(e) => patchHero("title", e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="Subtitle" value={cfg.hero.subtitle ?? ""} onChange={(e) => patchHero("subtitle", e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="CTA label" value={cfg.hero.ctaLabel} onChange={(e) => patchHero("ctaLabel", e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="CTA link" value={cfg.hero.ctaLink} onChange={(e) => patchHero("ctaLink", e.target.value)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="Background image URL" value={cfg.hero.imageUrl ?? ""} onChange={(e) => patchHero("imageUrl", e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Height</InputLabel>
                  <Select value={cfg.hero.height} label="Height" onChange={(e) => patchHero("height", e.target.value)}>
                    {["sm", "md", "lg", "full"].map((v) => <MenuItem key={v} value={v}>{v.toUpperCase()}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3} sx={{ display: "flex", alignItems: "center" }}>
                <FormControlLabel
                  control={<Switch checked={cfg.hero.overlay} onChange={(e) => patchHero("overlay", e.target.checked)} />}
                  label="Dark overlay"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ── Catalog ─────────────────────────────────────────────────────── */}
      <TabPanel value={tab} index={3}>
        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Layout</InputLabel>
                  <Select value={cfg.catalog.layout} label="Layout" onChange={(e) => patchCatalog("layout", e.target.value)}>
                    {["grid", "list", "masonry"].map((v) => <MenuItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Default sort</InputLabel>
                  <Select value={cfg.catalog.defaultSort} label="Default sort" onChange={(e) => patchCatalog("defaultSort", e.target.value)}>
                    {["newest", "price_asc", "price_desc", "name_asc"].map((v) => <MenuItem key={v} value={v}>{v.replace("_", " ")}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth size="small" type="number" label="Page size"
                  value={cfg.catalog.pageSize}
                  onChange={(e) => patchCatalog("pageSize", parseInt(e.target.value, 10))}
                  inputProps={{ min: 4, max: 100 }}
                />
              </Grid>
            </Grid>

            <SectionTitle>Grid columns per breakpoint</SectionTitle>
            <Grid container spacing={3}>
              {(["xs", "sm", "md", "lg"] as const).map((bp) => (
                <Grid item xs={6} sm={3} key={bp}>
                  <Typography variant="caption" color="text.secondary">{bp.toUpperCase()} — {cfg.catalog.columns[bp]} cols</Typography>
                  <Slider
                    value={cfg.catalog.columns[bp]}
                    onChange={(_, v) => patchCatalogColumns(bp, v as number)}
                    min={1} max={6} step={1} marks
                    valueLabelDisplay="auto"
                    size="small"
                  />
                </Grid>
              ))}
            </Grid>

            <SectionTitle>Toggles</SectionTitle>
            <Stack direction="row" flexWrap="wrap" gap={2}>
              {[
                { label: "Show categories",   key: "showCategory"  as const },
                { label: "Show ratings",      key: "showRating"    as const },
                { label: "Show badges",       key: "showBadges"    as const },
                { label: "Filter sidebar",    key: "filterSidebar" as const },
              ].map(({ label, key }) => (
                <FormControlLabel
                  key={key}
                  control={<Switch checked={cfg.catalog[key] as boolean} onChange={(e) => patchCatalog(key, e.target.checked)} />}
                  label={label}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ── Product Card ────────────────────────────────────────────────── */}
      <TabPanel value={tab} index={4}>
        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              {[
                { label: "Variant",       key: "variant"      as const, options: ["standard", "compact", "detailed"] },
                { label: "Image aspect",  key: "imageAspect"  as const, options: ["square", "portrait", "landscape"] },
                { label: "Hover effect",  key: "hoverEffect"  as const, options: ["none", "lift", "glow", "border"] },
                { label: "Border radius", key: "borderRadius" as const, options: ["none", "sm", "md", "lg", "xl"] },
              ].map(({ label, key, options }) => (
                <Grid item xs={12} sm={6} md={3} key={key}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{label}</InputLabel>
                    <Select
                      value={cfg.productCard[key] as string}
                      label={label}
                      onChange={(e) => patchProductCard(key, e.target.value)}
                    >
                      {options.map((v) => <MenuItem key={v} value={v}>{v}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              ))}
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="caption" color="text.secondary">
                  Elevation — {cfg.productCard.elevation}
                </Typography>
                <Slider
                  value={cfg.productCard.elevation}
                  onChange={(_, v) => patchProductCard("elevation", v as number)}
                  min={0} max={24} step={1}
                  valueLabelDisplay="auto"
                  size="small"
                />
              </Grid>
            </Grid>

            <SectionTitle>Toggles</SectionTitle>
            <Stack direction="row" flexWrap="wrap" gap={2}>
              {[
                { label: "Quick add button",   key: "showQuickAdd"    as const },
                { label: "Wishlist button",    key: "showWishlist"    as const },
                { label: "Show badges",        key: "showBadges"      as const },
                { label: "Show category",      key: "showCategory"    as const },
                { label: "Show rating",        key: "showRating"      as const },
                { label: "Show description",   key: "showDescription" as const },
              ].map(({ label, key }) => (
                <FormControlLabel
                  key={key}
                  control={<Switch checked={cfg.productCard[key] as boolean} onChange={(e) => patchProductCard(key, e.target.checked)} />}
                  label={label}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ── Checkout ────────────────────────────────────────────────────── */}
      <TabPanel value={tab} index={5}>
        <Card variant="outlined">
          <CardContent sx={{ p: 3 }}>
            <SectionTitle>Allowed payment methods</SectionTitle>
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
              {(["stripe", "paypal", "cod"] as const).map((method) => {
                const active = cfg.checkout.allowedPayments.includes(method);
                return (
                  <Chip
                    key={method}
                    label={method.toUpperCase()}
                    color={active ? "primary" : "default"}
                    variant={active ? "filled" : "outlined"}
                    clickable
                    onClick={() => {
                      const next = active
                        ? cfg.checkout.allowedPayments.filter((m) => m !== method)
                        : [...cfg.checkout.allowedPayments, method];
                      patchCheckout("allowedPayments", next);
                    }}
                  />
                );
              })}
            </Stack>

            <SectionTitle>Toggles</SectionTitle>
            <Stack direction="row" flexWrap="wrap" gap={2}>
              {[
                { label: "Quick Buy button",    key: "quickBuy"         as const },
                { label: "Guest checkout",      key: "guestAllowed"     as const },
                { label: "Order summary",       key: "showOrderSummary" as const },
                { label: "Promo code field",    key: "showPromoCode"    as const },
              ].map(({ label, key }) => (
                <FormControlLabel
                  key={key}
                  control={<Switch checked={cfg.checkout[key] as boolean} onChange={(e) => patchCheckout(key, e.target.checked)} />}
                  label={label}
                />
              ))}
            </Stack>
          </CardContent>
        </Card>
      </TabPanel>

      {/* ── Header / Footer ─────────────────────────────────────────────── */}
      <TabPanel value={tab} index={6}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Header</Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  <TextField size="small" fullWidth label="Logo text" value={cfg.header.logoText} onChange={(e) => patchHeader("logoText", e.target.value)} />
                  <TextField size="small" fullWidth label="Logo image URL" value={cfg.header.logoUrl ?? ""} onChange={(e) => patchHeader("logoUrl", e.target.value)} />
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {[
                      { label: "Search",  key: "showSearch"  as const },
                      { label: "Cart",    key: "showCart"    as const },
                      { label: "Account", key: "showAccount" as const },
                      { label: "Sticky",  key: "sticky"      as const },
                      { label: "Transparent", key: "transparent" as const },
                    ].map(({ label, key }) => (
                      <FormControlLabel
                        key={key}
                        control={<Switch size="small" checked={cfg.header[key] as boolean} onChange={(e) => patchHeader(key, e.target.checked)} />}
                        label={<Typography variant="body2">{label}</Typography>}
                      />
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>Footer</Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  <FormControlLabel
                    control={<Switch checked={cfg.footer.enabled} onChange={(e) => patchFooter("enabled", e.target.checked)} />}
                    label="Enable footer"
                  />
                  <TextField
                    size="small" fullWidth label="Copyright text"
                    value={cfg.footer.copyright ?? ""}
                    onChange={(e) => patchFooter("copyright", e.target.value)}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Snackbar feedback */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
