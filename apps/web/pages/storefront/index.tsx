import type { GetServerSideProps } from "next";
import Head from "next/head";
import {
  Grid,
  Container,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Stack,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme
} from "@mui/material";
import { useState } from "react";
import {
  StorefrontConfigProvider,
  useStorefrontConfig,
} from "@/lib/storefront/StorefrontConfigContext";
import StorefrontShell from "@/components/storefront/StorefrontShell";
import ProductCard from "@/components/storefront/ProductCard";
import HeroBanner from "@/components/storefront/HeroBanner";
import {
  StorefrontConfigSchema,
  type StorefrontConfig,
} from "@/lib/types/storefront-config";
import type { Product } from "@/lib/types/product";

interface Props {
  botId:         string;
  initialConfig: StorefrontConfig;
  products:      Product[];
  categories:    string[];
}

// ── Inner catalog — runs inside StorefrontConfigProvider ─────────────────────
function CatalogContent({
  products,
  categories,
}: {
  products:   Product[];
  categories: string[];
}) {
  const config = useStorefrontConfig();
  const { catalog, productCard, hero } = config;
  const theme      = useTheme();
  const isDesktop  = useMediaQuery(theme.breakpoints.up("md"));

  const [sort,            setSort]            = useState(catalog.defaultSort);
  const [activeCategory,  setActiveCategory]  = useState<string | null>(null);

  const filtered = activeCategory
    ? products.filter((p) => p.categoryName === activeCategory)
    : products;

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "price_asc":  return a.price - b.price;
      case "price_desc": return b.price - a.price;
      case "name_asc":   return a.name.localeCompare(b.name);
      default:           return 0;
    }
  });

  const filterSidebar = catalog.filterSidebar && isDesktop && categories.length > 0;

  const sidebarContent = (
    <Box sx={{ width: 220, pr: 2 }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Categories
      </Typography>
      <Divider sx={{ mb: 1 }} />
      <List dense disablePadding>
        <ListItem disablePadding>
          <ListItemButton
            selected={activeCategory === null}
            onClick={() => setActiveCategory(null)}
            sx={{ borderRadius: 2 }}
          >
            <ListItemText
              primary="All"
              primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: activeCategory === null ? 600 : 400 }}
            />
          </ListItemButton>
        </ListItem>
        {categories.map((cat) => (
          <ListItem key={cat} disablePadding>
            <ListItemButton
              selected={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              sx={{ borderRadius: 2 }}
            >
              <ListItemText
                primary={cat}
                primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: activeCategory === cat ? 600 : 400 }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <>
      {hero.enabled && <HeroBanner config={hero} />}

      <Container maxWidth="xl" sx={{ py: 5 }}>
        {/* Sort + active filter chips */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
          sx={{ mb: 4 }}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {activeCategory && (
              <Chip
                label={activeCategory}
                size="small"
                color="primary"
                variant="outlined"
                onDelete={() => setActiveCategory(null)}
              />
            )}
          </Stack>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Sort by</InputLabel>
            <Select
              value={sort}
              label="Sort by"
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              {catalog.sortOptions.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Main layout */}
        <Stack direction="row" gap={4} alignItems="flex-start">
          {/* Filter sidebar */}
          {filterSidebar && sidebarContent}

          {/* Product grid */}
          <Box sx={{ flex: 1 }}>
            <Grid container spacing={3}>
              {sorted.map((product) => (
                <Grid
                  item
                  key={product.id}
                  xs={12 / catalog.columns.xs}
                  sm={12 / catalog.columns.sm}
                  md={filterSidebar ? 12 / (catalog.columns.md - 1) : 12 / catalog.columns.md}
                  lg={12 / catalog.columns.lg}
                >
                  <ProductCard
                    product={product}
                    config={productCard}
                    onAddToCart={(id) => console.log("add to cart:", id)}
                  />
                </Grid>
              ))}
              {sorted.length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <Typography color="text.secondary">No products found.</Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </Stack>
      </Container>
    </>
  );
}

// ── Page entry ───────────────────────────────────────────────────────────────
export default function StorefrontPage({
  botId,
  initialConfig,
  products,
  categories,
}: Props) {
  return (
    <>
      <Head>
        <title>{initialConfig.header.logoText} – Shop</title>
        <meta name="description" content={initialConfig.hero.subtitle ?? "Browse our catalog"} />
      </Head>
      <StorefrontConfigProvider botId={botId} initialConfig={initialConfig}>
        <StorefrontShell>
          <CatalogContent products={products} categories={categories} />
        </StorefrontShell>
      </StorefrontConfigProvider>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const botId   = (ctx.query.botId as string) ?? "default";
  const baseUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";

  const [configRes, productsRes] = await Promise.all([
    fetch(`${baseUrl}/api/storefront/${botId}/config`),
    fetch(`${baseUrl}/api/storefront/${botId}/products`),
  ]);

  const rawConfig   = await configRes.json();
  const rawProducts = await productsRes.json();

  const initialConfig = StorefrontConfigSchema.parse(rawConfig.data);
  const products: Product[] = rawProducts.data ?? [];
  const categories = [...new Set(products.map((p) => p.categoryName).filter(Boolean))] as string[];

  return { props: { botId, initialConfig, products, categories } };
};
