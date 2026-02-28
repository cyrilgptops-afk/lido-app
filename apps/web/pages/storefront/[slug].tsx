import type { GetServerSideProps } from "next";
import Head from "next/head";
import {
  Container,
  Grid,
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  Stack,
  Rating,
  Alert
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import {
  StorefrontConfigProvider,
  useStorefrontConfig,
} from "@/lib/storefront/StorefrontConfigContext";
import StorefrontShell from "@/components/storefront/StorefrontShell";
import {
  StorefrontConfigSchema,
  type StorefrontConfig,
} from "@/lib/types/storefront-config";
import type { Product } from "@/lib/types/product";

const badgeColorMap: Record<
  NonNullable<Product["badge"]>,
  "error" | "success" | "warning"
> = { sale: "error", new: "success", "low-stock": "warning" };

interface Props {
  botId:         string;
  initialConfig: StorefrontConfig;
  product:       Product | null;
}

function ProductDetailContent({ product }: { product: Product | null }) {
  const config = useStorefrontConfig();

  if (!product) {
    return (
      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Alert severity="warning">Product not found.</Alert>
        <Button component={Link} href="/storefront" startIcon={<ArrowBackIcon />} sx={{ mt: 3 }}>
          Back to catalog
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 6 }}>
      <Button
        component={Link}
        href="/storefront"
        startIcon={<ArrowBackIcon />}
        color="inherit"
        size="small"
        sx={{ mb: 4 }}
      >
        Back to catalog
      </Button>

      <Grid container spacing={6} alignItems="flex-start">
        {/* Product image */}
        <Grid item xs={12} md={6}>
          <Box
            component="img"
            src={
              product.images[0] ??
              `https://placehold.co/600x600/0D1526/2362E8?text=${encodeURIComponent(product.name)}`
            }
            alt={product.name}
            sx={{
              width: "100%",
              borderRadius: 3,
              objectFit: "cover",
              maxHeight: 520,
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          />
        </Grid>

        {/* Product info */}
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            {/* Category + badge */}
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {product.categoryName && (
                <Chip
                  label={product.categoryName}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              )}
              {product.badge && (
                <Chip
                  label={product.badge.replace("-", " ").toUpperCase()}
                  size="small"
                  color={badgeColorMap[product.badge]}
                />
              )}
            </Stack>

            <Typography variant="h2">{product.name}</Typography>

            {/* Rating */}
            {product.rating !== undefined && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Rating value={product.rating} precision={0.5} readOnly />
                <Typography variant="body2" color="text.secondary">
                  {product.rating} out of 5
                </Typography>
              </Stack>
            )}

            {/* Price */}
            <Typography variant="h3" color="primary.main" fontWeight={700}>
              ${product.price.toFixed(2)}
            </Typography>

            {/* Description */}
            {product.description && (
              <>
                <Divider />
                <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                  {product.description}
                </Typography>
              </>
            )}

            {/* Stock */}
            {product.stock !== undefined && (
              <Typography
                variant="body2"
                color={product.stock <= 5 ? "error.main" : "success.main"}
                fontWeight={600}
              >
                {product.stock <= 5
                  ? `Only ${product.stock} left in stock`
                  : `${product.stock} in stock`}
              </Typography>
            )}

            <Divider />

            {/* CTAs */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={<ShoppingCartIcon />}
                sx={{ flex: 1 }}
              >
                Add to Cart
              </Button>
              {config.checkout.quickBuy && (
                <Button
                  component={Link}
                  href="/storefront/checkout"
                  variant="outlined"
                  color="primary"
                  size="large"
                  startIcon={<FlashOnIcon />}
                  sx={{ flex: 1 }}
                >
                  Buy Now
                </Button>
              )}
            </Stack>
          </Stack>
        </Grid>
      </Grid>
    </Container>
  );
}

export default function ProductDetailPage({
  botId,
  initialConfig,
  product,
}: Props) {
  return (
    <>
      <Head>
        <title>
          {product?.name ?? "Product"} – {initialConfig.header.logoText}
        </title>
      </Head>
      <StorefrontConfigProvider botId={botId} initialConfig={initialConfig}>
        <StorefrontShell>
          <ProductDetailContent product={product} />
        </StorefrontShell>
      </StorefrontConfigProvider>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const botId   = (ctx.query.botId as string) ?? "default";
  const slug    = ctx.params?.slug as string;
  const baseUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";

  const [configRes, productRes] = await Promise.all([
    fetch(`${baseUrl}/api/storefront/${botId}/config`),
    fetch(`${baseUrl}/api/storefront/${botId}/products/${slug}`),
  ]);

  const rawConfig     = await configRes.json();
  const initialConfig = StorefrontConfigSchema.parse(rawConfig.data);

  let product: Product | null = null;
  if (productRes.ok) {
    const rawProduct = await productRes.json();
    product = rawProduct.data ?? null;
  }

  return { props: { botId, initialConfig, product } };
};
