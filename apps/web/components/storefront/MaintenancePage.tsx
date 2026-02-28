import { Box, Typography, Container } from "@mui/material";
import BuildRoundedIcon from "@mui/icons-material/BuildRounded";

export default function MaintenancePage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="sm" sx={{ textAlign: "center" }}>
        <BuildRoundedIcon sx={{ fontSize: 64, color: "primary.main", mb: 3 }} />
        <Typography variant="h3" fontWeight={700} gutterBottom>
          Down for Maintenance
        </Typography>
        <Typography color="text.secondary">
          We&apos;ll be back shortly. Thank you for your patience.
        </Typography>
      </Container>
    </Box>
  );
}
