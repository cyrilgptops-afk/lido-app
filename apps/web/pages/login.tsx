import Head from "next/head";
import NextLink from "next/link";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Link
} from "@mui/material";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Sign in – Lido</title>
      </Head>
      <Box
        component="main"
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 420 }}>
          <Stack alignItems="center" spacing={2} sx={{ mb: 4 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <LockRoundedIcon sx={{ color: "#fff" }} />
            </Box>
            <Typography variant="h4" fontWeight={700}>
              Welcome back
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Connect your account to start deploying automation bots.
            </Typography>
          </Stack>

          <Card variant="outlined">
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  color="inherit"
                  fullWidth
                  size="large"
                >
                  Continue with Google
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  fullWidth
                  size="large"
                >
                  Continue with GitHub
                </Button>
                <Divider>
                  <Typography variant="caption" color="text.secondary">
                    or
                  </Typography>
                </Divider>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                >
                  Sign in with SSO
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Link component={NextLink} href="/" color="text.secondary" variant="body2">
              Back to home
            </Link>
          </Box>
        </Box>
      </Box>
    </>
  );
}
