import React from 'react';
import { Button, Box } from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import type { ActionButtonComponent, AppActionContext } from './types';

export default function ActionButton({
  component,
  onAction,
}: { component: ActionButtonComponent } & AppActionContext) {
  const { label, intent, params, variant = 'contained', color = 'primary', icon, fullWidth, disabled } =
    component;

  const IconComp = icon ? (MuiIcons as any)[icon] : null;

  return (
    <Box sx={{ display: 'flex', justifyContent: fullWidth ? 'stretch' : 'flex-start' }}>
      <Button
        variant={variant as any}
        color={color as any}
        fullWidth={fullWidth}
        disabled={disabled}
        startIcon={IconComp ? <IconComp fontSize="small" /> : undefined}
        onClick={() => onAction(intent, params)}
      >
        {label}
      </Button>
    </Box>
  );
}
