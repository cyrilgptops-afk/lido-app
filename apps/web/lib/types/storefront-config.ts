import { z } from "zod";

// ── Palette ─────────────────────────────────────────────────────────────────
export const PaletteSchema = z.object({
  primary:    z.string().default("#2362E8"),
  secondary:  z.string().default("#0D1526"),
  background: z.string().default("#070C18"),
  surface:    z.string().default("#0D1526"),
  text:       z.string().default("#EEF2FF"),
  accent:     z.string().default("#3B82F6"),
});

// ── Typography ───────────────────────────────────────────────────────────────
export const TypographyConfigSchema = z.object({
  fontFamily:  z.string().default("Inter, sans-serif"),
  headingSize: z.enum(["sm", "md", "lg", "xl"]).default("lg"),
  bodySize:    z.enum(["sm", "md", "lg"]).default("md"),
});

// ── Hero Banner ──────────────────────────────────────────────────────────────
export const HeroConfigSchema = z.object({
  enabled:  z.boolean().default(true),
  title:    z.string().default("Welcome to our Store"),
  subtitle: z.string().optional(),
  imageUrl: z.string().optional(),
  ctaLabel: z.string().default("Shop Now"),
  ctaLink:  z.string().default("/storefront"),
  height:   z.enum(["sm", "md", "lg", "full"]).default("md"),
  overlay:  z.boolean().default(true),
});

// ── Catalog ──────────────────────────────────────────────────────────────────
export const CatalogConfigSchema = z.object({
  layout:        z.enum(["grid", "list", "masonry"]).default("grid"),
  columns:       z.object({
    xs: z.number().default(1),
    sm: z.number().default(2),
    md: z.number().default(3),
    lg: z.number().default(4),
  }).default({ xs: 1, sm: 2, md: 3, lg: 4 }),
  showCategory:   z.boolean().default(true),
  showRating:     z.boolean().default(true),
  showBadges:     z.boolean().default(true),
  pageSize:       z.number().min(4).max(100).default(20),
  sortOptions:    z.array(z.enum(["price_asc", "price_desc", "name_asc", "newest"])).default(["newest", "price_asc", "price_desc"]),
  defaultSort:    z.enum(["price_asc", "price_desc", "name_asc", "newest"]).default("newest"),
  filterSidebar:  z.boolean().default(true),
});

// ── Product Card ─────────────────────────────────────────────────────────────
export const ProductCardConfigSchema = z.object({
  variant:         z.enum(["standard", "compact", "detailed"]).default("standard"),
  showQuickAdd:    z.boolean().default(true),
  showWishlist:    z.boolean().default(false),
  showBadges:      z.boolean().default(true),
  showCategory:    z.boolean().default(true),
  showRating:      z.boolean().default(true),
  imageAspect:     z.enum(["square", "portrait", "landscape"]).default("square"),
  showDescription: z.boolean().default(false),
  borderRadius:    z.enum(["none", "sm", "md", "lg", "xl"]).default("md"),
  elevation:       z.number().min(0).max(24).default(2),
  hoverEffect:     z.enum(["none", "lift", "glow", "border"]).default("lift"),
});

// ── Checkout ─────────────────────────────────────────────────────────────────
export const CheckoutConfigSchema = z.object({
  steps:            z.array(z.enum(["cart", "shipping", "payment", "review"])).default(["cart", "shipping", "payment", "review"]),
  quickBuy:         z.boolean().default(true),
  guestAllowed:     z.boolean().default(true),
  showOrderSummary: z.boolean().default(true),
  showPromoCode:    z.boolean().default(true),
  allowedPayments:  z.array(z.enum(["stripe", "paypal", "cod"])).default(["stripe"]),
});

// ── Header ───────────────────────────────────────────────────────────────────
export const HeaderConfigSchema = z.object({
  logoUrl:     z.string().optional(),
  logoText:    z.string().default("Store"),
  showSearch:  z.boolean().default(true),
  showCart:    z.boolean().default(true),
  showAccount: z.boolean().default(true),
  sticky:      z.boolean().default(true),
  transparent: z.boolean().default(false),
  navLinks:    z.array(z.object({ label: z.string(), href: z.string() })).default([]),
});

// ── Footer ───────────────────────────────────────────────────────────────────
export const FooterConfigSchema = z.object({
  enabled:   z.boolean().default(true),
  copyright: z.string().optional(),
  links:     z.array(z.object({ label: z.string(), href: z.string() })).default([]),
});

// ── Root Config ──────────────────────────────────────────────────────────────
export const StorefrontConfigSchema = z.object({
  botId:           z.string(),
  tenantId:        z.string().default("default"),
  palette:         PaletteSchema.default({
    primary: "#2362E8", secondary: "#0D1526", background: "#070C18",
    surface: "#0D1526", text: "#EEF2FF", accent: "#3B82F6",
  }),
  typography:      TypographyConfigSchema.default({
    fontFamily: "Inter, sans-serif", headingSize: "lg", bodySize: "md",
  }),
  hero:            HeroConfigSchema.default({
    enabled: true, title: "Welcome to our Store", ctaLabel: "Shop Now",
    ctaLink: "/storefront", height: "md", overlay: true,
  }),
  catalog:         CatalogConfigSchema.default({
    layout: "grid", columns: { xs: 1, sm: 2, md: 3, lg: 4 },
    showCategory: true, showRating: true, showBadges: true,
    pageSize: 20, sortOptions: ["newest", "price_asc", "price_desc"],
    defaultSort: "newest", filterSidebar: true,
  }),
  productCard:     ProductCardConfigSchema.default({
    variant: "standard", showQuickAdd: true, showWishlist: false,
    showBadges: true, showCategory: true, showRating: true,
    imageAspect: "square", showDescription: false,
    borderRadius: "md", elevation: 2, hoverEffect: "lift",
  }),
  checkout:        CheckoutConfigSchema.default({
    steps: ["cart", "shipping", "payment", "review"], quickBuy: true,
    guestAllowed: true, showOrderSummary: true, showPromoCode: true,
    allowedPayments: ["stripe"],
  }),
  header:          HeaderConfigSchema.default({
    logoText: "Store", showSearch: true, showCart: true,
    showAccount: true, sticky: true, transparent: false, navLinks: [],
  }),
  footer:          FooterConfigSchema.default({
    enabled: true, links: [],
  }),
  maintenanceMode: z.boolean().default(false),
  updatedAt:       z.string().datetime().optional(),
});

// ── Exported Types ────────────────────────────────────────────────────────────
export type StorefrontConfig   = z.infer<typeof StorefrontConfigSchema>;
export type PaletteConfig      = z.infer<typeof PaletteSchema>;
export type TypographyConfig   = z.infer<typeof TypographyConfigSchema>;
export type HeroConfig         = z.infer<typeof HeroConfigSchema>;
export type CatalogConfig      = z.infer<typeof CatalogConfigSchema>;
export type ProductCardConfig  = z.infer<typeof ProductCardConfigSchema>;
export type CheckoutConfig     = z.infer<typeof CheckoutConfigSchema>;
export type HeaderConfig       = z.infer<typeof HeaderConfigSchema>;
export type FooterConfig       = z.infer<typeof FooterConfigSchema>;
