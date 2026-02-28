import Head from "next/head";
import NextLink from "next/link";
import { Box, Typography, Button, Stack, Chip, Grid, alpha } from "@mui/material";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";

const LIDO_BLUE = "#2362E8";

const FEATURES = [
  {
    icon: <SmartToyRoundedIcon />,
    title: "Intelligent Bots",
    description: "Deploy stateless automation bots that connect to any SaaS service."
  },
  {
    icon: <ExtensionRoundedIcon />,
    title: "Deep Integrations",
    description: "Native connectors for Dropbox, Google Drive, Zoho, Slack, and more."
  },
  {
    icon: <SpeedRoundedIcon />,
    title: "Real-time Monitoring",
    description: "Track every run, retry, and failure from a unified dashboard."
  }
];

export default function HomePage() {
  return (
    <>
      <Head>
        <title>Lido – Automation Platform</title>
        <meta name="description" content="Deploy and manage automation bots across your SaaS stack." />
      </Head>

      <Box
        component="main"
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          // subtle radial glow behind the hero text
          background: `radial-gradient(ellipse 80% 50% at 50% -10%, ${alpha(LIDO_BLUE, 0.18)} 0%, transparent 70%), #070C18`
        }}
      >
        {/* ── Nav bar ── */}
        <Box
          component="header"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: { xs: 3, md: 6 },
            py: 2.5,
            borderBottom: `1px solid ${alpha("#fff", 0.06)}`
          }}
        >
          {/* Wordmark */}
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <svg width="26" height="26" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="60" height="60" rx="14" stroke={LIDO_BLUE} strokeWidth="5" />
              <path d="M14 22 H28 V32 H40 V42" stroke={LIDO_BLUE} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="40" cy="44" r="4" fill={LIDO_BLUE} />
              <circle cx="28" cy="20" r="3" fill={LIDO_BLUE} />
            </svg>
            <Typography
              fontWeight={800}
              sx={{
                fontSize: "1.15rem",
                letterSpacing: "-0.02em",
                background: `linear-gradient(135deg, #fff 30%, ${LIDO_BLUE})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            >
              Lido
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5}>
            <Button component={NextLink} href="/login" variant="outlined" color="inherit" size="small">
              Sign in
            </Button>
            <Button component={NextLink} href="/dashboard" variant="contained" color="primary" size="small">
              Dashboard
            </Button>
          </Stack>
        </Box>

        {/* ── Hero ── */}
        <Box sx={{ maxWidth: 880, mx: "auto", px: { xs: 3, md: 4 }, pt: { xs: 8, md: 14 }, pb: 6, textAlign: "center" }}>
          <Chip
            icon={<AutoFixHighRoundedIcon sx={{ fontSize: 14 }} />}
            label="Automation Platform · Now with Next.js 16"
            variant="outlined"
            color="primary"
            size="small"
            sx={{ mb: 5, fontWeight: 600, fontSize: "0.72rem", letterSpacing: "0.04em" }}
          />

          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: "2.4rem", sm: "3.5rem", md: "4.5rem" },
              lineHeight: 1.08,
              mb: 3,
              // two-tone heading: white → Lido blue
              background: `linear-gradient(160deg, #EEF2FF 40%, ${LIDO_BLUE} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          >
            Orchestrate every bot, integration&nbsp;&amp; workflow.
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ fontSize: { xs: "1rem", md: "1.15rem" }, mb: 6, maxWidth: 560, mx: "auto" }}
          >
            Deploy automation bots, monitor execution in real-time, and manage
            connected services — from a single, unified control plane.
          </Typography>

          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
            <Button
              component={NextLink}
              href="/login"
              variant="contained"
              color="primary"
              size="large"
              sx={{ px: 4 }}
            >
              Get started free
            </Button>
            <Button
              component={NextLink}
              href="/dashboard"
              variant="outlined"
              color="inherit"
              size="large"
              sx={{ px: 4 }}
            >
              View dashboard
            </Button>
          </Stack>
        </Box>

        {/* ── Feature cards ── */}
        <Box sx={{ maxWidth: 960, mx: "auto", px: { xs: 3, md: 4 }, pb: 14 }}>
          <Grid container spacing={3}>
            {FEATURES.map((f) => (
              <Grid item xs={12} md={4} key={f.title}>
                <Box
                  sx={{
                    p: 3,
                    height: "100%",
                    border: `1px solid ${alpha("#fff", 0.07)}`,
                    borderRadius: 3,
                    bgcolor: alpha("#0D1526", 0.7),
                    backdropFilter: "blur(8px)",
                    transition: "border-color 0.2s",
                    "&:hover": { borderColor: alpha(LIDO_BLUE, 0.4) }
                  }}
                >
                  <Box
                    sx={{
                      display: "inline-flex",
                      p: 1.25,
                      mb: 2,
                      borderRadius: 2,
                      bgcolor: alpha(LIDO_BLUE, 0.12),
                      color: LIDO_BLUE
                    }}
                  >
                    {f.icon}
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {f.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Box>
    </>
  );
}
