import React from 'react';
import { Box, Typography, Avatar, Chip } from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import type { TimelineComponent } from './types';

const severityColor: Record<string, string> = {
  success : '#4caf50',
  warning : '#ff9800',
  error   : '#f44336',
  info    : '#2196f3',
  default : '#9e9e9e',
};

export default function Timeline({ component }: { component: TimelineComponent }) {
  const { title, items = [] } = component;

  return (
    <Box>
      {title && (
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          {title}
        </Typography>
      )}

      {(items ?? []).map((item, idx) => {
        const IconComp = item.icon ? (MuiIcons as any)[item.icon] : null;
        const dotColor = severityColor[item.color ?? 'default'];
        const isLast = idx === items.length - 1;

        return (
          <Box key={idx} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
            {/* vertical line */}
            {!isLast && (
              <Box
                sx={{
                  position : 'absolute',
                  left     : 19,
                  top      : 40,
                  bottom   : 0,
                  width    : 2,
                  bgcolor  : 'divider',
                }}
              />
            )}

            {/* dot / icon */}
            <Avatar
              sx={{
                width  : 40,
                height : 40,
                bgcolor: dotColor,
                flexShrink: 0,
                zIndex : 1,
              }}
            >
              {IconComp ? <IconComp fontSize="small" /> : null}
            </Avatar>

            {/* content */}
            <Box pb={isLast ? 0 : 3} flex={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="body2" fontWeight={600}>
                  {item.title ?? item.label}
                </Typography>
                {item.badge && (
                  <Chip label={item.badge} size="small" sx={{ height: 18, fontSize: 10 }} />
                )}
              </Box>
              {(item.description ?? item.sublabel) && (
                <Typography variant="caption" color="text.secondary">
                  {item.description ?? item.sublabel}
                </Typography>
              )}
              {item.timestamp && (
                <Typography variant="caption" color="text.disabled" display="block">
                  {item.timestamp}
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

