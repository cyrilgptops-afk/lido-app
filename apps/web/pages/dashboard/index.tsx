import Head from "next/head";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Divider,
  Button
} from "@mui/material";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import DashboardLayout from "../../components/layouts/DashboardLayout";

const STATS = [
  { label: "Active bots", value: "12", delta: "+3", color: "success.main" },
  { label: "Queued runs", value: "4", delta: "-1", color: "warning.main" },
  { label: "Failed jobs", value: "1", delta: "+1", color: "error.main" }
];

const BOT_RUNS = [
  { name: "Dropbox Sync", status: "Completed", chipColor: "success" as const, icon: <CheckCircleRoundedIcon fontSize="small" /> },
  { name: "Google Calendar", status: "In progress", chipColor: "warning" as const, icon: <HourglassTopRoundedIcon fontSize="small" /> },
  { name: "Zoho CRM", status: "Scheduled", chipColor: "default" as const, icon: <SmartToyRoundedIcon fontSize="small" /> }
];

const QUICK_ACTIONS = [
  { label: "Launch a bot", icon: <BoltRoundedIcon fontSize="small" /> },
  { label: "Run diagnostics", icon: <AutoGraphRoundedIcon fontSize="small" /> }
];

export default function DashboardPage() {
  return (
    <>
      <Head>
        <title>Dashboard – Lido</title>
      </Head>
      <DashboardLayout>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Automation overview
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Track live bot activity, recent deployments, and system health.
          </Typography>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            {STATS.map((stat) => (
              <Grid item xs={12} sm={4} key={stat.label}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {stat.label}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="baseline">
                      <Typography variant="h3" fontWeight={700} sx={{ color: stat.color }}>
                        {stat.value}
                      </Typography>
                      <Chip size="small" label={stat.delta} color="primary" variant="outlined" />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={7}>
              <Card variant="outlined">
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <AutoGraphRoundedIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={600}>
                      Automation throughput
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Execution volume in the last 24 hours.
                  </Typography>
                  <Box component="svg" viewBox="0 0 400 160" sx={{ width: "100%", height: 160 }}>
                    <defs>
                      <linearGradient id="dash-line" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="#38BDF8" />
                        <stop offset="100%" stopColor="#2362E8" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M20 110 C70 40 130 30 180 70 C230 110 290 100 330 60 C355 35 370 45 380 70"
                      fill="none"
                      stroke="url(#dash-line)"
                      strokeWidth="4"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Quick actions
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Keep key workflows at your fingertips.
                  </Typography>
                  <Stack spacing={1.5}>
                    {QUICK_ACTIONS.map((action) => (
                      <Button
                        key={action.label}
                        variant="outlined"
                        color="inherit"
                        startIcon={action.icon}
                        sx={{ justifyContent: "flex-start" }}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Latest bot runs
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                {BOT_RUNS.map((run) => (
                  <Box
                    key={run.name}
                    sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <SmartToyRoundedIcon fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight={500}>
                        {run.name}
                      </Typography>
                    </Stack>
                    <Chip
                      icon={run.icon}
                      label={run.status}
                      color={run.chipColor}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </DashboardLayout>
    </>
  );
}
