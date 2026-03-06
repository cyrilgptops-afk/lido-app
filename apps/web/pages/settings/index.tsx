import Head from "next/head";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Divider,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Slider,
  FormHelperText
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
                  <FormControl size="small" fullWidth>
                    <InputLabel id="timezone-label">Default timezone</InputLabel>
                    <Select labelId="timezone-label" label="Default timezone" defaultValue="UTC">
                      <MenuItem value="UTC">UTC</MenuItem>
                      <MenuItem value="America/New_York">America/New York</MenuItem>
                      <MenuItem value="Europe/London">Europe/London</MenuItem>
                      <MenuItem value="Asia/Calcutta">Asia/Calcutta</MenuItem>
                    </Select>
                    <FormHelperText>Used for scheduled automations.</FormHelperText>
                  </FormControl>
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
                  Notifications
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Stack spacing={2}>
                  <FormControlLabel
                    control={<Switch defaultChecked />}
                    label="Email me for failed runs"
                  />
                  <FormControlLabel
                    control={<Switch />}
                    label="Notify on deployment changes"
                  />
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Alert sensitivity
                    </Typography>
                    <Slider
                      defaultValue={60}
                      step={10}
                      marks
                      min={10}
                      max={100}
                      valueLabelDisplay="auto"
                    />
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
