import React from 'react';
import {
  Box, Card, CardContent, Typography, Avatar, Chip, LinearProgress,
} from '@mui/material';
import TrendingUpIcon    from '@mui/icons-material/TrendingUp';
import TrendingDownIcon  from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon  from '@mui/icons-material/TrendingFlat';
import * as MuiIcons     from '@mui/icons-material';
import type { StatCardComponent, AppActionContext } from './types';

const COLOR_MAP: Record<string, { bg: string; text: string; iconBg: string }> = {
  primary : { bg: '#f0f0ff', text: '#696cff', iconBg: '#696cff' },
  success : { bg: '#e8fcd4', text: '#71dd37', iconBg: '#71dd37' },
  warning : { bg: '#fff6e0', text: '#ffab00', iconBg: '#ffab00' },
  error   : { bg: '#ffe0e0', text: '#ff3e1d', iconBg: '#ff3e1d' },
  info    : { bg: '#e0f3ff', text: '#03c3ec', iconBg: '#03c3ec' },
};

function DynamicIcon({ name, sx }: { name: string; sx?: any }) {
  const Icon = (MuiIcons as any)[name];
  return Icon ? <Icon sx={sx} /> : null;
}

export default function StatCard({
  component,
  onAction,
}: { component: StatCardComponent } & AppActionContext) {
  const { title, value, subtitle, icon, color = 'primary', trend, action } = component;
  const palette = COLOR_MAP[color] ?? COLOR_MAP.primary;

  const TrendIcon =
    trend?.direction === 'up'   ? TrendingUpIcon   :
    trend?.direction === 'down' ? TrendingDownIcon  :
    TrendingFlatIcon;

  const trendColor =
    trend?.direction === 'up'   ? '#71dd37' :
    trend?.direction === 'down' ? '#ff3e1d' : '#a8b0b9';

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #e7e7ff',
        borderRadius: 3,
        transition: 'box-shadow .2s',
        '&:hover': { boxShadow: '0 4px 16px #696cff14' },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
          {icon && (
            <Avatar sx={{ bgcolor: palette.iconBg, width: 36, height: 36 }}>
              <DynamicIcon name={icon} sx={{ fontSize: 18, color: '#fff' }} />
            </Avatar>
          )}
        </Box>

        <Typography variant="h4" fontWeight={700} sx={{ color: '#566a7f', mb: 0.5 }}>
          {value}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <TrendIcon sx={{ fontSize: 14, color: trendColor }} />
              <Typography variant="caption" sx={{ color: trendColor, fontWeight: 600 }}>
                {trend.value}
              </Typography>
            </Box>
          )}
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {action && (
          <Chip
            label={action.label}
            size="small"
            onClick={() => onAction(action.intent, action.params)}
            sx={{
              mt: 1.5, cursor: 'pointer', bgcolor: palette.bg,
              color: palette.text, fontWeight: 600, fontSize: '0.72rem',
              '&:hover': { opacity: 0.85 },
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
