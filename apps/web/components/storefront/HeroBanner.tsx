import { Box, Typography, Button, Container, alpha } from "@mui/material";
import Link from "next/link";
import type { HeroConfig } from "@/lib/types/storefront-config";

const heightMap = {
  sm:   "35vh",
  md:   "52vh",
  lg:   "68vh",
  full: "100vh",
};

interface Props {
  config: HeroConfig;
}

export default function HeroBanner({ config }: Props) {
  if (!config.enabled) return null;

  return (
    <Box
      sx={{
        position: "relative",
        height: heightMap[config.height],
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        ...(config.imageUrl
          ? {
              backgroundImage: `url(${config.imageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {
              background: (t) =>
                `radial-gradient(ellipse 80% 60% at 50% 0%, ${alpha(
                  t.palette.primary.main,
                  0.28
                )} 0%, transparent 70%), ${t.palette.background.default}`,
            }),
      }}
    >
      {config.overlay && config.imageUrl && (
        <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.52)" }} />
      )}

      <Container maxWidth="md" sx={{ position: "relative", zIndex: 1, textAlign: "center" }}>
        <Typography
          variant="h1"
          gutterBottom
          sx={{
            mb: 2,
            background: (t) =>
              `linear-gradient(160deg, #fff 40%, ${t.palette.primary.main})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {config.title}
        </Typography>

        {config.subtitle && (
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ mb: 4, fontWeight: 400, maxWidth: 560, mx: "auto" }}
          >
            {config.subtitle}
          </Typography>
        )}

        <Button
          component={Link}
          href={config.ctaLink}
          variant="contained"
          color="primary"
          size="large"
          sx={{ px: 5 }}
        >
          {config.ctaLabel}
        </Button>
      </Container>
    </Box>
  );
}
