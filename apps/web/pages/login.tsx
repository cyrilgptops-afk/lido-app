import Head from "next/head";
import NextLink from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Link,
  TextField,
  Alert,
} from "@mui/material";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@lido.com");
  const [password, setPassword] = useState("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await axios.post(`${baseUrl}/auth/login`, {
        email,
        password,
      });

      if (response.data.success) {
        const { accessToken, user } = response.data.data;
        localStorage.setItem("token", accessToken);
        localStorage.setItem("user", JSON.stringify(user));
        
        // Redirect based on role
        if (user.role === "admin") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
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
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <form onSubmit={handleLogin}>
                <Stack spacing={2}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    helperText="Use admin@lido.com for admin access"
                  />
                  <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    helperText="Any password works in dev mode"
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    disabled={loading}
                  >
                    {loading ? "Signing in..." : "Sign in"}
                  </Button>
                </Stack>
              </form>

              <Divider sx={{ my: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  or
                </Typography>
              </Divider>

              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  color="inherit"
                  fullWidth
                  size="large"
                  disabled
                >
                  Continue with Google
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  fullWidth
                  size="large"
                  disabled
                >
                  Continue with GitHub
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
