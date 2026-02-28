import {
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
  Rating
} from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import Link from "next/link";
import type { ProductCardConfig } from "@/lib/types/storefront-config";
import type { Product } from "@/lib/types/product";

const aspectPaddingMap = {
  square:    "100%",
  portrait:  "133%",
  landscape: "66%",
};

const hoverSxMap: Record<ProductCardConfig["hoverEffect"], object> = {
  none:   {},
  lift:   { transform: "translateY(-6px)", boxShadow: 8 },
  glow:   { boxShadow: (t: { palette: { primary: { main: string } } }) => `0 0 28px ${t.palette.primary.main}55` },
  border: { outline: "2px solid", outlineColor: "primary.main" },
};

const badgeColorMap: Record<NonNullable<Product["badge"]>, "error" | "success" | "warning"> = {
  sale:       "error",
  new:        "success",
  "low-stock": "warning",
};

interface Props {
  product: Product;
  config:  ProductCardConfig;
  onAddToCart: (productId: string) => void;
}

export default function ProductCard({ product, config, onAddToCart }: Props) {
  return (
    <Card
      elevation={config.elevation}
      sx={{
        transition: "all 0.25s ease",
        cursor: "pointer",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        "&:hover": hoverSxMap[config.hoverEffect],
      }}
    >
      {/* Image */}
      <Link href={`/storefront/${product.slug}`} style={{ textDecoration: "none" }}>
        <Box
          sx={{
            position: "relative",
            paddingTop: aspectPaddingMap[config.imageAspect],
            overflow: "hidden",
            bgcolor: "rgba(255,255,255,0.03)",
          }}
        >
          <CardMedia
            component="img"
            image={product.images[0] ?? `https://placehold.co/400x400/0D1526/2362E8?text=${encodeURIComponent(product.name)}`}
            alt={product.name}
            sx={{
              position: "absolute",
              top: 0, left: 0,
              width: "100%", height: "100%",
              objectFit: "cover",
            }}
          />

          {/* Badge */}
          {config.showBadges && product.badge && (
            <Chip
              label={product.badge.replace("-", " ").toUpperCase()}
              size="small"
              color={badgeColorMap[product.badge]}
              sx={{ position: "absolute", top: 8, left: 8, fontWeight: 700, fontSize: "0.65rem" }}
            />
          )}

          {/* Wishlist */}
          {config.showWishlist && (
            <IconButton
              size="small"
              onClick={(e) => e.preventDefault()}
              sx={{
                position: "absolute", top: 6, right: 6,
                bgcolor: "rgba(0,0,0,0.45)",
                backdropFilter: "blur(6px)",
                "&:hover": { bgcolor: "rgba(0,0,0,0.65)" },
              }}
            >
              <FavoriteBorderIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Link>

      {/* Content */}
      <CardContent sx={{ flex: 1, pb: config.variant === "compact" ? 0.5 : 1 }}>
        {config.showCategory && product.categoryName && (
          <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ letterSpacing: "0.05em" }}>
            {product.categoryName}
          </Typography>
        )}

        <Typography
          variant={config.variant === "compact" ? "body2" : "subtitle1"}
          fontWeight={600}
          noWrap
          sx={{ mt: 0.25 }}
        >
          {product.name}
        </Typography>

        {config.showDescription && product.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {product.description}
          </Typography>
        )}

        {config.showRating && product.rating !== undefined && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75 }}>
            <Rating value={product.rating} precision={0.5} size="small" readOnly />
            <Typography variant="caption" color="text.secondary">
              ({product.rating})
            </Typography>
          </Box>
        )}

        <Typography variant="h6" color="primary.main" fontWeight={700} sx={{ mt: 0.75 }}>
          ${product.price.toFixed(2)}
        </Typography>
      </CardContent>

      {/* Quick add */}
      {config.showQuickAdd && (
        <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
          <Button
            variant="contained"
            fullWidth
            size={config.variant === "compact" ? "small" : "medium"}
            startIcon={<AddShoppingCartIcon />}
            onClick={(e) => { e.stopPropagation(); onAddToCart(product.id); }}
          >
            {config.variant === "compact" ? "Add" : "Add to Cart"}
          </Button>
        </CardActions>
      )}
    </Card>
  );
}
