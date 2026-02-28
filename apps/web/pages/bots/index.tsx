import Head from "next/head";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
import DashboardLayout from "../../components/layouts/DashboardLayout";

export default function BotsPage() {
  return (
    <>
      <Head>
        <title>Bots – Lido</title>
      </Head>
      <DashboardLayout>
        <Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 4 }}
          >
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                Bots
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Deploy, pause, and monitor your automation bots.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddRoundedIcon />}
            >
              Deploy bot
            </Button>
          </Stack>

          <Card variant="outlined">
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 8,
                gap: 2
              }}
            >
              <SmartToyRoundedIcon sx={{ fontSize: 48, color: "text.disabled" }} />
              <Typography variant="body1" color="text.secondary">
                No bots deployed yet.
              </Typography>
              <Button variant="outlined" color="primary" startIcon={<AddRoundedIcon />}>
                Deploy your first bot
              </Button>
            </CardContent>
          </Card>
        </Box>
      </DashboardLayout>
    </>
  );
}
