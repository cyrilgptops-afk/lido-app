import type { NextApiRequest, NextApiResponse } from "next";
import { StorefrontConfigSchema } from "@/lib/types/storefront-config";

// In-memory config store — replace with Prisma + Redis in production
const configStore: Record<string, unknown> = {};

function defaultConfig(botId: string) {
  return {
    botId,
    tenantId: "default",
    palette: {
      primary: "#2362E8", secondary: "#0D1526",
      background: "#070C18", surface: "#0D1526",
      text: "#EEF2FF", accent: "#3B82F6",
    },
    typography: { fontFamily: "Inter, sans-serif", headingSize: "lg", bodySize: "md" },
    hero: {
      enabled: true,
      title: "Welcome to our Store",
      subtitle: "Discover amazing products at great prices",
      ctaLabel: "Shop Now",
      ctaLink: "/storefront",
      height: "md",
      overlay: true,
    },
    catalog: {
      layout: "grid",
      columns: { xs: 1, sm: 2, md: 3, lg: 4 },
      showCategory: true, showRating: true, showBadges: true,
      pageSize: 20,
      sortOptions: ["newest", "price_asc", "price_desc"],
      defaultSort: "newest",
      filterSidebar: true,
    },
    productCard: {
      variant: "standard", showQuickAdd: true, showWishlist: false,
      imageAspect: "square", showDescription: false,
      borderRadius: "md", elevation: 2, hoverEffect: "lift",
    },
    checkout: {
      steps: ["cart", "shipping", "payment", "review"],
      quickBuy: true, guestAllowed: true,
      showOrderSummary: true, showPromoCode: true,
      allowedPayments: ["stripe"],
    },
    header: {
      logoText: "My Store", showSearch: true,
      showCart: true, showAccount: true,
      sticky: true, transparent: false, navLinks: [],
    },
    footer: {
      enabled: true,
      copyright: `© ${new Date().getFullYear()} My Store. All rights reserved.`,
      links: [
        { label: "Privacy Policy", href: "#" },
        { label: "Terms of Service", href: "#" },
      ],
    },
    maintenanceMode: false,
  };
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { botId } = req.query as { botId: string };

  if (req.method === "GET") {
    const raw    = configStore[botId] ?? defaultConfig(botId);
    const parsed = StorefrontConfigSchema.parse(raw);
    return res.status(200).json({ success: true, data: parsed });
  }

  if (req.method === "PUT") {
    const result = StorefrontConfigSchema.safeParse({ ...(req.body?.data ?? {}), botId });
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_CONFIG", message: result.error.message },
      });
    }
    configStore[botId] = { ...result.data, updatedAt: new Date().toISOString() };
    return res.status(200).json({ success: true, data: configStore[botId] });
  }

  return res.status(405).json({
    success: false,
    error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed" },
  });
}
