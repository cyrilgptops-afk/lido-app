import Head from "next/head";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Stack
} from "@mui/material";
import ExtensionRoundedIcon from "@mui/icons-material/ExtensionRounded";
import DashboardLayout from "../../components/layouts/DashboardLayout";

const AVAILABLE_INTEGRATIONS = [
  { name: "Dropbox", description: "Sync files and folders.", status: "available" },
  { name: "Google Drive", description: "Manage Drive documents.", status: "available" },
  { name: "Google Calendar", description: "Schedule and read events.", status: "available" },
  { name: "Zoho CRM", description: "Automate CRM workflows.", status: "coming_soon" },
  { name: "Slack", description: "Send messages and alerts.", status: "coming_soon" }
];

export default function IntegrationsPage() {
  return (
    <>
      <Head>
        <title>Integrations – Lido</title>
      </Head>
      <DashboardLayout>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Integrations
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Connect external services for your bots.
          </Typography>

          <Grid container spacing={3}>
            {AVAILABLE_INTEGRATIONS.map((integration) => (
              <Grid item xs={12} sm={6} md={4} key={integration.name}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardActionArea
                    disabled={integration.status === "coming_soon"}
                    sx={{ height: "100%" }}
                  >
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <ExtensionRoundedIcon color="primary" sx={{ mb: 1.5 }} />
                        {integration.status === "coming_soon" && (
                          <Chip label="Soon" size="small" variant="outlined" />
                        )}
                      </Stack>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        {integration.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {integration.description}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </DashboardLayout>
    </>
  );
}
