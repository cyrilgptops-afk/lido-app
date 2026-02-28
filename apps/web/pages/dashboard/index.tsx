import Head from "next/head";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Stack,
  Divider
} from "@mui/material";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import DashboardLayout from "../../components/layouts/DashboardLayout";

const STATS = [
  { label: "Active bots", value: "12", color: "success.main" },
  { label: "Queued runs", value: "4", color: "warning.main" },
  { label: "Failed jobs", value: "1", color: "error.main" }
];

const BOT_RUNS = [
  { name: "Dropbox Sync", status: "Completed", chipColor: "success" as const, icon: <CheckCircleRoundedIcon fontSize="small" /> },
  { name: "Google Calendar", status: "In progress", chipColor: "warning" as const, icon: <HourglassTopRoundedIcon fontSize="small" /> },
  { name: "Zoho CRM", status: "Scheduled", chipColor: "default" as const, icon: <SmartToyRoundedIcon fontSize="small" /> }
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
                    <Typography variant="h3" fontWeight={700} sx={{ color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
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
