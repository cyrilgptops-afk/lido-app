import React from 'react';
import { Typography, Box } from '@mui/material';
import type { TextComponent } from './types';

/** Minimal markdown: **bold**, *italic*, `code`, newlines → <br /> */
function parseMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\n)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`'))
      return (
        <Box
          key={i}
          component="code"
          sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5, borderRadius: 0.5 }}
        >
          {part.slice(1, -1)}
        </Box>
      );
    if (part === '\n') return <br key={i} />;
    return part;
  });
}

export default function TextBlock({ component }: { component: TextComponent }) {
  const { content, variant = 'body1', align = 'left', color, markdown } = component;

  return (
    <Typography
      variant={variant as any}
      align={align as any}
      sx={{ color: color ?? 'text.primary', whiteSpace: markdown ? undefined : 'pre-wrap' }}
    >
      {markdown ? parseMarkdown(content) : content}
    </Typography>
  );
}
