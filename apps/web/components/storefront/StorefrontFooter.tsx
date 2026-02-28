import { Box, Container, Typography, Stack, Link as MuiLink } from "@mui/material";
import type { FooterConfig } from "@/lib/types/storefront-config";

interface Props {
  config: FooterConfig;
}

export default function StorefrontFooter({ config }: Props) {
  if (!config.enabled) return null;

  return (
    <Box
      component="footer"
      sx={{ borderTop: "1px solid rgba(255,255,255,0.07)", py: 4, mt: "auto" }}
    >
      <Container maxWidth="xl">
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Typography variant="body2" color="text.secondary">
            {config.copyright ?? `© ${new Date().getFullYear()} All rights reserved.`}
          </Typography>
          {config.links.length > 0 && (
            <Stack direction="row" spacing={3}>
              {config.links.map((link) => (
                <MuiLink
                  key={link.href}
                  href={link.href}
                  variant="body2"
                  color="text.secondary"
                  underline="hover"
                >
                  {link.label}
                </MuiLink>
              ))}
            </Stack>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
