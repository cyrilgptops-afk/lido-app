import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Typography,
  Chip,
  Divider,
  Box,
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import type { ListComponent, AppActionContext } from './types';

export default function ListBlock({
  component,
  onAction,
}: { component: ListComponent } & AppActionContext) {
  const { title, items, dense = false, dividers = false } = component;

  return (
    <Box>
      {title && (
        <Typography variant="subtitle1" fontWeight={600} px={2} pt={1} pb={0.5}>
          {title}
        </Typography>
      )}

      <List dense={dense} disablePadding>
        {items.map((item, idx) => {
          const IconComp = item.icon ? (MuiIcons as any)[item.icon] : null;
          const clickable = Boolean(item.intent);

          const content = (
            <>
              {IconComp && (
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <IconComp fontSize="small" />
                </ListItemIcon>
              )}
              <ListItemText
                primary={item.primary ?? item.label}
                secondary={item.secondary ?? item.description}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              {item.badge !== undefined && (
                <Chip
                  label={item.badge}
                  size="small"
                  sx={{ height: 20, fontSize: 11, ml: 1 }}
                />
              )}
            </>
          );

          return (
            <React.Fragment key={idx}>
              {clickable ? (
                <ListItemButton
                  onClick={() => onAction(item.intent!, item.params)}
                  sx={{ borderRadius: 1 }}
                >
                  {content}
                </ListItemButton>
              ) : (
                <ListItem>{content}</ListItem>
              )}
              {dividers && idx < items.length - 1 && <Divider component="li" />}
            </React.Fragment>
          );
        })}
      </List>
    </Box>
  );
}
