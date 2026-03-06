import { useMemo, useState } from "react";
import Head from "next/head";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  FormControlLabel,
  Switch,
  Slider,
  Autocomplete,
  InputAdornment,
  LinearProgress,
  Stepper,
  Step,
  StepLabel
} from "@mui/material";
import DashboardLayout from "../components/layouts/DashboardLayout";
import { useSnackbar } from "../components/feedback/SnackbarProvider";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SettingsSuggestRoundedIcon from "@mui/icons-material/SettingsSuggestRounded";
import { DataGrid, GridActionsCellItem, GridColDef, GridRowModel } from "@mui/x-data-grid";

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

const METRICS = [
  { label: "Active automations", value: "48", delta: "+8%", tone: "success" },
  { label: "Avg. execution time", value: "2.6s", delta: "-12%", tone: "info" },
  { label: "Alerts today", value: "5", delta: "+2", tone: "warning" },
  { label: "Uptime", value: "99.98%", delta: "+0.02%", tone: "success" }
] as const;

const QUICK_ACTIONS = [
  { label: "Create bot", icon: <BoltRoundedIcon fontSize="small" /> },
  { label: "View logs", icon: <AssignmentRoundedIcon fontSize="small" /> },
  { label: "Run health check", icon: <AutoGraphRoundedIcon fontSize="small" /> }
];

const CARD_MEDIA = [
  {
    title: "Inventory Sync",
    description: "Sync orders, update stock, and notify on low inventory in real time.",
    badge: "Retail"
  },
  {
    title: "Customer Insights",
    description: "Analyze engagement funnels and export a daily performance report.",
    badge: "Analytics"
  },
  {
    title: "Ops Monitoring",
    description: "Trigger alerts when SLAs dip, with auto-remediation playbooks.",
    badge: "SRE"
  }
];

const SEARCH_OPTIONS = [
  "Create a new automation",
  "Analyze failed runs",
  "Invite collaborators",
  "Switch environment",
  "Generate weekly report"
];

const INITIAL_ROWS = [
  { id: 1, name: "Inventory sync", owner: "Lena K.", status: "Healthy", lastRun: "2 min ago", cost: 12.4 },
  { id: 2, name: "Support digest", owner: "Ari M.", status: "Warning", lastRun: "14 min ago", cost: 8.1 },
  { id: 3, name: "Billing audit", owner: "Jules P.", status: "Paused", lastRun: "2 days ago", cost: 5.9 },
  { id: 4, name: "Data pipeline", owner: "Noah R.", status: "Healthy", lastRun: "40 sec ago", cost: 18.2 }
];

export default function UiKitPage() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [profileTab, setProfileTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState(INITIAL_ROWS);

  const columns = useMemo<GridColDef[]>(() => [
    { field: "name", headerName: "Automation", flex: 1, minWidth: 160, editable: true },
    { field: "owner", headerName: "Owner", width: 140, editable: true },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      type: "singleSelect",
      valueOptions: ["Healthy", "Warning", "Paused"],
      editable: true
    },
    { field: "lastRun", headerName: "Last run", width: 140 },
    {
      field: "cost",
      headerName: "Cost / mo",
      width: 120,
      type: "number",
      editable: true,
      valueFormatter: (value) => `$${Number(value).toFixed(1)}`
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 110,
      getActions: (params) => [
        <GridActionsCellItem
          key="open"
          icon={<OpenInNewRoundedIcon fontSize="small" />}
          label="Open"
          onClick={() => showSnackbar({ message: `Opening ${params.row.name}`, severity: "info" })}
          showInMenu
        />,
        <GridActionsCellItem
          key="delete"
          icon={<DeleteRoundedIcon fontSize="small" />}
          label="Delete"
          onClick={() => setRows((prev) => prev.filter((row) => row.id !== params.id))}
          showInMenu
        />
      ]
    }
  ], [showSnackbar]);

  const handleRowUpdate = (newRow: GridRowModel) => {
    setRows((prev) => prev.map((row) => (row.id === newRow.id ? { ...row, ...newRow } : row)));
    return newRow;
  };

  return (
    <>
      <Head>
        <title>UI Kit – Lido</title>
      </Head>
      <DashboardLayout>
        <Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h3" fontWeight={700} gutterBottom>
              Lido UI Kit
            </Typography>
            <Typography variant="body2" color="text.secondary">
              A living playground for layout, data, and interaction patterns.
            </Typography>
          </Box>

          <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
            <Tab label="Overview" />
            <Tab label="Forms" />
            <Tab label="Data" />
            <Tab label="Profile" />
            <Tab label="Onboarding" />
          </Tabs>

          <TabPanel value={tab} index={0}>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {METRICS.map((metric) => (
                <Grid item xs={12} sm={6} lg={3} key={metric.label}>
                  <Card variant="outlined" sx={{ height: "100%" }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {metric.label}
                      </Typography>
                      <Stack direction="row" alignItems="baseline" spacing={1}>
                        <Typography variant="h4" fontWeight={700}>
                          {metric.value}
                        </Typography>
                        <Chip size="small" label={metric.delta} color={metric.tone} variant="outlined" />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={metric.tone === "warning" ? 45 : 78}
                        sx={{ mt: 2, height: 6, borderRadius: 999 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={7}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <InsightsRoundedIcon color="primary" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        Automation velocity
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Rolling execution volume over the last 14 days.
                    </Typography>
                    <Box
                      component="svg"
                      viewBox="0 0 400 160"
                      sx={{ width: "100%", height: 160, display: "block" }}
                    >
                      <defs>
                        <linearGradient id="line" x1="0" x2="1" y1="0" y2="1">
                          <stop offset="0%" stopColor="#38BDF8" />
                          <stop offset="100%" stopColor="#2362E8" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M20 120 C60 40 120 30 170 80 C220 130 280 100 320 60 C350 30 370 40 380 70"
                        fill="none"
                        stroke="url(#line)"
                        strokeWidth="4"
                      />
                      <circle cx="20" cy="120" r="4" fill="#38BDF8" />
                      <circle cx="170" cy="80" r="4" fill="#38BDF8" />
                      <circle cx="320" cy="60" r="4" fill="#38BDF8" />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={5}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Quick actions
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Launch a workflow or review key alerts with one click.
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

            <Grid container spacing={3}>
              {CARD_MEDIA.map((card) => (
                <Grid item xs={12} md={4} key={card.title}>
                  <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                    <CardMedia
                      component="div"
                      sx={{
                        height: 140,
                        background: "linear-gradient(135deg, rgba(35,98,232,0.35), rgba(56,189,248,0.15))",
                        position: "relative"
                      }}
                    >
                      <Chip
                        label={card.badge}
                        size="small"
                        color="primary"
                        sx={{ position: "absolute", top: 12, left: 12 }}
                      />
                    </CardMedia>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        {card.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {card.description}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button variant="contained" size="small">
                        Deploy
                      </Button>
                      <Button variant="outlined" color="inherit" size="small">
                        Preview
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          <TabPanel value={tab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Settings form
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={2}>
                      <TextField label="Workspace" defaultValue="Lido Labs" fullWidth size="small" />
                      <FormControl fullWidth size="small">
                        <InputLabel id="env-label">Environment</InputLabel>
                        <Select labelId="env-label" label="Environment" defaultValue="prod">
                          <MenuItem value="prod">Production</MenuItem>
                          <MenuItem value="staging">Staging</MenuItem>
                          <MenuItem value="dev">Development</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControlLabel control={<Switch defaultChecked />} label="Enable auto-healing" />
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Cost guardrail
                        </Typography>
                        <Slider defaultValue={35} min={5} max={100} valueLabelDisplay="auto" />
                      </Box>
                      <Button variant="contained">Save settings</Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Search with autocomplete
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Autocomplete
                      freeSolo
                      options={SEARCH_OPTIONS}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Search commands"
                          placeholder="Try: Create a new automation"
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchRoundedIcon fontSize="small" />
                              </InputAdornment>
                            )
                          }}
                        />
                      )}
                    />
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                        Login form sample
                      </Typography>
                      <Stack spacing={2}>
                        <TextField label="Email" placeholder="name@company.com" fullWidth size="small" />
                        <TextField label="Password" type="password" fullWidth size="small" helperText="Minimum 6 characters" />
                        <Button variant="contained">Sign in</Button>
                      </Stack>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tab} index={2}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  Active automations
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ height: 420 }}>
                  <DataGrid
                    rows={rows}
                    columns={columns}
                    disableRowSelectionOnClick
                    processRowUpdate={handleRowUpdate}
                    pageSizeOptions={[5, 10]}
                    initialState={{
                      pagination: { paginationModel: { pageSize: 5, page: 0 } },
                      sorting: { sortModel: [{ field: "status", sort: "asc" }] }
                    }}
                    sx={{
                      border: "none",
                      "& .MuiDataGrid-columnHeaders": { borderBottom: "1px solid rgba(255,255,255,0.08)" },
                      "& .MuiDataGrid-row": { borderBottom: "1px solid rgba(255,255,255,0.05)" }
                    }}
                  />
                </Box>
              </CardContent>
            </Card>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Data cards
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={2}>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <AutoGraphRoundedIcon color="primary" />
                            <Typography fontWeight={600}>Pipeline throughput</Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            1.24M events / day, 99.9% success rate
                          </Typography>
                        </CardContent>
                      </Card>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <BoltRoundedIcon color="primary" />
                            <Typography fontWeight={600}>Incident response</Typography>
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Mean time to recovery: 4m 12s
                          </Typography>
                        </CardContent>
                      </Card>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Feedback & dialogs
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={2}>
                      <Button
                        variant="contained"
                        onClick={() => showSnackbar({ message: "Automation published", severity: "success" })}
                      >
                        Trigger success snackbar
                      </Button>
                      <Button
                        variant="outlined"
                        color="inherit"
                        onClick={() => showSnackbar({ message: "Something went wrong", severity: "error" })}
                      >
                        Trigger error snackbar
                      </Button>
                      <Button variant="outlined" color="inherit" onClick={() => setDialogOpen(true)}>
                        Open confirmation dialog
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tab} index={3}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack spacing={2} alignItems="center">
                      <Avatar sx={{ width: 84, height: 84 }}>AK</Avatar>
                      <Box textAlign="center">
                        <Typography variant="h6" fontWeight={700}>
                          Amina K.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Head of Automation
                        </Typography>
                      </Box>
                      <Button variant="contained" size="small">
                        Edit profile
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={8}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Profile details
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Full name" defaultValue="Amina K." fullWidth size="small" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Role" defaultValue="Head of Automation" fullWidth size="small" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Email" defaultValue="amina@lido.com" fullWidth size="small" />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField label="Time zone" defaultValue="UTC" fullWidth size="small" />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Card variant="outlined" sx={{ mt: 3 }}>
              <CardContent>
                <Tabs value={profileTab} onChange={(_, value) => setProfileTab(value)} variant="scrollable" allowScrollButtonsMobile>
                  <Tab icon={<TimelineRoundedIcon />} iconPosition="start" label="Activity" />
                  <Tab icon={<HistoryRoundedIcon />} iconPosition="start" label="History" />
                </Tabs>
                <Divider sx={{ mb: 2 }} />
                {profileTab === 0 && (
                  <Stack spacing={2}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography fontWeight={600}>Workflow updated</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Inventory sync now pushes alerts to Slack. 2 hours ago.
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography fontWeight={600}>New integration connected</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Added Segment data source. Yesterday.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Stack>
                )}
                {profileTab === 1 && (
                  <Stack spacing={2}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography fontWeight={600}>Workflow archived</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Q1 Billing audit moved to archive. 3 days ago.
                        </Typography>
                      </CardContent>
                    </Card>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography fontWeight={600}>Policy changed</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Cost guardrails adjusted for analytics. Last week.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={tab} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Onboarding flow
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={3}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <SettingsSuggestRoundedIcon color="primary" />
                        <Typography variant="body2" color="text.secondary">
                          Guide new teams through setup in three steps.
                        </Typography>
                      </Stack>
                      <Box>
                        <Stepper activeStep={step} alternativeLabel>
                          <Step>
                            <StepLabel>Connect data</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>Configure rules</StepLabel>
                          </Step>
                          <Step>
                            <StepLabel>Launch</StepLabel>
                          </Step>
                        </Stepper>
                        <Divider sx={{ mb: 2 }} />
                        {step === 0 && (
                          <Stack spacing={2}>
                            <TextField label="Primary data source" defaultValue="Postgres" fullWidth size="small" />
                            <TextField label="API key" placeholder="sk_live_..." fullWidth size="small" />
                          </Stack>
                        )}
                        {step === 1 && (
                          <Stack spacing={2}>
                            <FormControl fullWidth size="small">
                              <InputLabel id="policy-label">Policy</InputLabel>
                              <Select labelId="policy-label" label="Policy" defaultValue="balanced">
                                <MenuItem value="balanced">Balanced</MenuItem>
                                <MenuItem value="aggressive">Aggressive</MenuItem>
                                <MenuItem value="custom">Custom</MenuItem>
                              </Select>
                            </FormControl>
                            <Slider defaultValue={40} min={0} max={100} valueLabelDisplay="auto" />
                          </Stack>
                        )}
                        {step === 2 && (
                          <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                              You are ready to deploy the first automation bundle.
                            </Typography>
                            <Button variant="contained">Launch workspace</Button>
                          </Stack>
                        )}
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button
                          variant="outlined"
                          color="inherit"
                          disabled={step === 0}
                          onClick={() => setStep((prev) => Math.max(prev - 1, 0))}
                        >
                          Back
                        </Button>
                        <Button
                          variant="contained"
                          disabled={step === 2}
                          onClick={() => setStep((prev) => Math.min(prev + 1, 2))}
                        >
                          Next
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={5}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      Confirmation dialog
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Use this dialog to confirm destructive or high-impact actions.
                    </Typography>
                    <Button variant="outlined" color="inherit" onClick={() => setDialogOpen(true)}>
                      Preview dialog
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Archive this automation?</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              The automation will stop running and move to archived state. You can restore it later.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
            <Button
              variant="contained"
              onClick={() => {
                setDialogOpen(false);
                showSnackbar({ message: "Automation archived", severity: "success" });
              }}
            >
              Archive
            </Button>
          </DialogActions>
        </Dialog>
      </DashboardLayout>
    </>
  );
}

