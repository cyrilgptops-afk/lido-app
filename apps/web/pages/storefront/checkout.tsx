import type { GetServerSideProps } from "next";
import Head from "next/head";
import {
  Container,
  Grid,
  Box,
  Typography,
  Button,
  Divider,
  Stack,
  Card,
  CardContent,
  TextField,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import { useState } from "react";
import {
  StorefrontConfigProvider,
  useStorefrontConfig,
} from "@/lib/storefront/StorefrontConfigContext";
import StorefrontShell from "@/components/storefront/StorefrontShell";
import {
  StorefrontConfigSchema,
  type StorefrontConfig,
} from "@/lib/types/storefront-config";

interface Props {
  botId:         string;
  initialConfig: StorefrontConfig;
}

function CheckoutContent() {
  const config      = useStorefrontConfig();
  const steps       = config.checkout.steps;
  const [activeStep, setActiveStep] = useState(0);
  const [promoCode,  setPromoCode]  = useState("");

  const handleNext = () => {
    if (activeStep < steps.length - 1) setActiveStep((s) => s + 1);
  };
  const handleBack = () => {
    if (activeStep > 0) setActiveStep((s) => s - 1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Checkout
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
        {steps.map((step) => (
          <Step key={step}>
            <StepLabel>
              {step.charAt(0).toUpperCase() + step.slice(1)}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={4}>
        {/* Main step content */}
        <Grid item xs={12} md={config.checkout.showOrderSummary ? 8 : 12}>
          {/* Step: Cart */}
          {steps[activeStep] === "cart" && (
            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Your Cart
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Box
                  sx={{ textAlign: "center", py: 5 }}
                >
                  <Typography color="text.secondary">
                    Your cart is empty. Add products from the catalog.
                  </Typography>
                  <Button
                    variant="outlined"
                    href="/storefront"
                    component="a"
                    sx={{ mt: 3 }}
                  >
                    Browse Products
                  </Button>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Step: Shipping */}
          {steps[activeStep] === "shipping" && (
            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Shipping Address
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="First name" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="Last name" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label="Street address" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" label="City" />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" label="State" />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" label="Postal code" />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label="Country" defaultValue="US" />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Step: Payment */}
          {steps[activeStep] === "payment" && (
            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Payment Method
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Stack spacing={2}>
                  {config.checkout.allowedPayments.map((method) => (
                    <Button
                      key={method}
                      variant="outlined"
                      color="inherit"
                      fullWidth
                      size="large"
                    >
                      {method === "stripe"
                        ? "Pay with Card (Stripe)"
                        : method === "paypal"
                        ? "Pay with PayPal"
                        : "Cash on Delivery"}
                    </Button>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Step: Review */}
          {steps[activeStep] === "review" && (
            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Review Your Order
                </Typography>
                <Divider sx={{ mb: 3 }} />
                <Typography color="text.secondary">
                  Please review your order before placing it.
                </Typography>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <Stack
            direction="row"
            justifyContent="space-between"
            sx={{ mt: 3 }}
          >
            <Button
              variant="outlined"
              color="inherit"
              onClick={handleBack}
              disabled={activeStep === 0}
            >
              Back
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNext}
            >
              {activeStep === steps.length - 1 ? "Place Order" : "Continue"}
            </Button>
          </Stack>
        </Grid>

        {/* Order summary sidebar */}
        {config.checkout.showOrderSummary && (
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Order Summary
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={1.5}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2">$0.00</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">Shipping</Typography>
                    <Typography variant="body2" color="success.main">Free</Typography>
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">Tax</Typography>
                    <Typography variant="body2">$0.00</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography fontWeight={700}>Total</Typography>
                    <Typography fontWeight={700} color="primary.main">
                      $0.00
                    </Typography>
                  </Box>
                </Stack>

                {config.checkout.showPromoCode && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Promo code
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Enter code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                      />
                      <Button variant="outlined" size="small" disabled={!promoCode}>
                        Apply
                      </Button>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

export default function CheckoutPage({ botId, initialConfig }: Props) {
  return (
    <>
      <Head>
        <title>Checkout – {initialConfig.header.logoText}</title>
      </Head>
      <StorefrontConfigProvider botId={botId} initialConfig={initialConfig}>
        <StorefrontShell>
          <CheckoutContent />
        </StorefrontShell>
      </StorefrontConfigProvider>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const botId   = (ctx.query.botId as string) ?? "default";
  const baseUrl = process.env.INTERNAL_API_URL ?? "http://localhost:3000";

  const configRes     = await fetch(`${baseUrl}/api/storefront/${botId}/config`);
  const rawConfig     = await configRes.json();
  const initialConfig = StorefrontConfigSchema.parse(rawConfig.data);

  return { props: { botId, initialConfig } };
};
