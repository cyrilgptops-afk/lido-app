import React from 'react';
import { Box, Divider, Paper } from '@mui/material';
import type { AppComponent, AppActionContext } from './types';

import StatCard     from './StatCard';
import DataTable    from './DataTable';
import ChartCard    from './ChartCard';
import FormPanel    from './FormPanel';
import AlertBanner  from './AlertBanner';
import TextBlock    from './TextBlock';
import ActionButton from './ActionButton';
import Timeline     from './Timeline';
import ListBlock    from './ListBlock';
import GridLayout   from './GridLayout';
import TabsLayout   from './TabsLayout';

export interface AppRendererProps extends AppActionContext {
  layout    : AppComponent[];
  /** If true wraps each top-level component in a Paper card (used at the page level) */
  cardWrap? : boolean;
}

function ComponentRenderer({
  component,
  onAction,
}: { component: AppComponent } & AppActionContext): React.ReactElement | null {
  switch (component.type) {
    case 'stat_card':
      return <StatCard component={component} onAction={onAction} />;

    case 'data_table':
      return <DataTable component={component} onAction={onAction} />;

    case 'chart':
      return <ChartCard component={component} />;

    case 'form':
      return <FormPanel component={component} onAction={onAction} />;

    case 'alert':
      return <AlertBanner component={component} onAction={onAction} />;

    case 'text':
      return <TextBlock component={component} />;

    case 'divider':
      return (
        <Divider
          sx={{
            my : component.spacing ?? component.mb ?? 2,
          }}
        >
          {component.label ?? undefined}
        </Divider>
      );

    case 'action_button':
      return <ActionButton component={component} onAction={onAction} />;

    case 'timeline':
      return <Timeline component={component} />;

    case 'list':
      return <ListBlock component={component} onAction={onAction} />;

    case 'grid':
      return <GridLayout component={component} onAction={onAction} />;

    case 'tabs':
      return <TabsLayout component={component} onAction={onAction} />;

    case 'image':
      return (
        <Box
          component="img"
          src={component.src}
          alt={component.alt ?? ''}
          sx={{
            maxWidth : component.maxWidth ?? '100%',
            width    : component.width   ?? 'auto',
            height   : component.height  ?? 'auto',
            display  : 'block',
            mx       : component.center ? 'auto' : undefined,
            borderRadius: component.rounded ? 2 : 0,
          }}
        />
      );

    default:
      return null;
  }
}

export default function AppRenderer({ layout, onAction, cardWrap = false }: AppRendererProps) {
  if (!layout || layout.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {layout.map((component, idx) => {
        const rendered = (
          <ComponentRenderer key={idx} component={component} onAction={onAction} />
        );

        if (!cardWrap || component.type === 'divider' || component.type === 'grid') {
          return rendered;
        }

        return (
          <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            {rendered}
          </Paper>
        );
      })}
    </Box>
  );
}
