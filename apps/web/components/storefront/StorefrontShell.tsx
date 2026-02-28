import React from "react";
import { ThemeProvider, CssBaseline, Box } from "@mui/material";
import { useStorefrontConfig } from "@/lib/storefront/StorefrontConfigContext";
import { buildStorefrontTheme } from "@/lib/storefront/buildStorefrontTheme";
import StorefrontHeader from "./StorefrontHeader";
import StorefrontFooter from "./StorefrontFooter";
import MaintenancePage from "./MaintenancePage";

interface Props {
  children: React.ReactNode;
}

export default function StorefrontShell({ children }: Props) {
  const config = useStorefrontConfig();
  const theme  = buildStorefrontTheme(
    config.palette,
    config.typography,
    config.productCard.borderRadius
  );

  if (config.maintenanceMode) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MaintenancePage />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <StorefrontHeader config={config.header} />
        <Box component="main" sx={{ flex: 1 }}>
          {children}
        </Box>
        <StorefrontFooter config={config.footer} />
      </Box>
    </ThemeProvider>
  );
}
