import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Snackbar } from "@mui/material";

export type SnackbarSeverity = "success" | "error" | "info" | "warning";

interface SnackbarPayload {
  message: string;
  severity?: SnackbarSeverity;
  autoHideDuration?: number;
}

interface SnackbarContextValue {
  showSnackbar: (payload: SnackbarPayload) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function useSnackbar() {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error("useSnackbar must be used within SnackbarProvider");
  }
  return ctx;
}

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<SnackbarSeverity>("info");
  const [autoHideDuration, setAutoHideDuration] = useState(3500);

  const showSnackbar = useCallback((payload: SnackbarPayload) => {
    setMessage(payload.message);
    setSeverity(payload.severity ?? "info");
    setAutoHideDuration(payload.autoHideDuration ?? 3500);
    setOpen(true);
  }, []);

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={autoHideDuration}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}
