import React from 'react';
import { Grid } from '@mui/material';
import type { GridComponent, AppActionContext } from './types';

// Forward-declared — AppRenderer imports GridLayout, and GridLayout imports AppRenderer.
// We lazy-import AppRenderer to avoid the circular dependency at module-eval time.
const AppRenderer = React.lazy(() => import('./AppRenderer'));

export default function GridLayout({
  component,
  onAction,
}: { component: GridComponent } & AppActionContext) {
  const { spacing = 3, columns } = component;

  return (
    <Grid container spacing={spacing}>
      {columns.map((col, i) => (
        <Grid item key={i} xs={col.xs ?? 12} sm={col.sm} md={col.md} lg={col.lg}>
          <React.Suspense fallback={null}>
            <AppRenderer layout={col.components} onAction={onAction} />
          </React.Suspense>
        </Grid>
      ))}
    </Grid>
  );
}
