import React, { useState } from 'react';
import { Alert, AlertTitle, Button } from '@mui/material';
import type { AlertComponent, AppActionContext } from './types';

export default function AlertBanner({
  component,
  onAction,
}: { component: AlertComponent } & AppActionContext) {
  const { severity = 'info', title, message, dismissible, action } = component;
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <Alert
      severity={severity}
      onClose={dismissible ? () => setDismissed(true) : undefined}
      action={
        action ? (
          <Button
            color="inherit"
            size="small"
            onClick={() => onAction(action.intent, action.params)}
          >
            {action.label}
          </Button>
        ) : undefined
      }
      sx={{ width: '100%' }}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {message}
    </Alert>
  );
}
