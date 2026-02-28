import Head from "next/head";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Divider,
  Stack
} from "@mui/material";
import DashboardLayout from "../../components/layouts/DashboardLayout";

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>Settings – Lido</title>
      </Head>
      <DashboardLayout>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Manage workspace preferences and API keys.
          </Typography>

          <Stack spacing={3}>
            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Workspace
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Stack spacing={2}>
                  <TextField
                    label="Workspace name"
                    defaultValue="My Workspace"
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="API base URL"
                    defaultValue="http://localhost:3001"
                    size="small"
                    fullWidth
                  />
                  <Box>
                    <Button variant="contained" color="primary">
                      Save changes
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  API Keys
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Typography variant="body2" color="text.secondary">
                  API key management coming soon.
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      </DashboardLayout>
    </>
  );
}
