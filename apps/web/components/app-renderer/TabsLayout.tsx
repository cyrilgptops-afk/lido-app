import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import type { TabsComponent, AppActionContext } from './types';

// Lazy to break circular dependency with AppRenderer
const AppRenderer = React.lazy(() => import('./AppRenderer'));

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} pt={2}>
      {value === index && children}
    </Box>
  );
}

export default function TabsLayout({
  component,
  onAction,
}: { component: TabsComponent } & AppActionContext) {
  const { tabs, defaultTab = 0, variant = 'standard', scrollable } = component;
  const [active, setActive] = useState(defaultTab);

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={active}
          onChange={(_, v) => setActive(v)}
          variant={scrollable ? 'scrollable' : (variant as any)}
          scrollButtons={scrollable ? 'auto' : undefined}
          allowScrollButtonsMobile={scrollable}
        >
          {tabs.map((tab, i) => (
            <Tab key={i} label={tab.label} id={`tab-${i}`} aria-controls={`tabpanel-${i}`} />
          ))}
        </Tabs>
      </Box>

      {tabs.map((tab, i) => (
        <TabPanel key={i} value={active} index={i}>
          <React.Suspense fallback={null}>
            <AppRenderer layout={tab.components} onAction={onAction} />
          </React.Suspense>
        </TabPanel>
      ))}
    </Box>
  );
}
