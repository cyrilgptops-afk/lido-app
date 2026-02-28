import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Badge,
  Stack,
  Container
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import AccountCircleRoundedIcon from "@mui/icons-material/AccountCircleRounded";
import Link from "next/link";
import type { HeaderConfig } from "@/lib/types/storefront-config";

interface Props {
  config: HeaderConfig;
}

export default function StorefrontHeader({ config }: Props) {
  return (
    <AppBar
      position={config.sticky ? "sticky" : "static"}
      elevation={0}
      sx={{
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        ...(config.transparent && { bgcolor: "transparent !important" }),
      }}
    >
      <Container maxWidth="xl">
        <Toolbar sx={{ gap: 2, minHeight: 64, px: "0 !important" }}>
          {/* Logo */}
          <Link href="/storefront" style={{ textDecoration: "none" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              {config.logoUrl ? (
                <Box
                  component="img"
                  src={config.logoUrl}
                  alt="Logo"
                  sx={{ height: 32 }}
                />
              ) : (
                <Typography
                  variant="h6"
                  fontWeight={800}
                  sx={{
                    background: (t) =>
                      `linear-gradient(135deg, #fff 30%, ${t.palette.primary.main})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {config.logoText}
                </Typography>
              )}
            </Stack>
          </Link>

          {/* Nav links */}
          {config.navLinks.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ ml: 3 }}>
              {config.navLinks.map((link) => (
                <Button
                  key={link.href}
                  component={Link}
                  href={link.href}
                  color="inherit"
                  size="small"
                >
                  {link.label}
                </Button>
              ))}
            </Stack>
          )}

          <Box sx={{ flex: 1 }} />

          {/* Action icons */}
          {config.showSearch && (
            <IconButton color="inherit" size="small" aria-label="Search">
              <SearchRoundedIcon />
            </IconButton>
          )}
          {config.showCart && (
            <IconButton
              color="inherit"
              size="small"
              component={Link}
              href="/storefront/checkout"
              aria-label="Cart"
            >
              <Badge badgeContent={0} color="primary">
                <ShoppingCartRoundedIcon />
              </Badge>
            </IconButton>
          )}
          {config.showAccount && (
            <IconButton
              color="inherit"
              size="small"
              component={Link}
              href="/login"
              aria-label="Account"
            >
              <AccountCircleRoundedIcon />
            </IconButton>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
