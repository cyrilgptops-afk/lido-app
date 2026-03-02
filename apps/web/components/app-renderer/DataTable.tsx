import React, { useState } from 'react';
import {
  Box, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, IconButton, Tooltip, TablePagination, Paper,
} from '@mui/material';
import type { DataTableComponent, AppActionContext } from './types';

const CHIP_COLORS: Record<string, { bg: string; color: string }> = {
  success : { bg: '#e8fcd4', color: '#71dd37' },
  warning : { bg: '#fff6e0', color: '#ffab00' },
  error   : { bg: '#ffe0e0', color: '#ff3e1d' },
  info    : { bg: '#e0f3ff', color: '#03c3ec' },
  default : { bg: '#f5f5f9', color: '#566a7f' },
};

function resolveRowAction(template: string, row: Record<string, any>): string {
  return template.replace(/\{\{row\.(\w+)\}\}/g, (_, key) => String(row[key] ?? ''));
}

export default function DataTable({
  component,
  onAction,
}: { component: DataTableComponent } & AppActionContext) {
  const { title, columns, rows, pagination, emptyMessage } = component;
  const [page, setPage] = useState(0);

  const displayRows = pagination ? rows : rows;

  return (
    <Box>
      {title && (
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#566a7f' }}>
          {title}
        </Typography>
      )}

      <Paper elevation={0} sx={{ border: '1px solid #e7e7ff', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8f8ff' }}>
                {columns.map((col) => (
                  <TableCell
                    key={col.field}
                    align={col.align ?? 'left'}
                    sx={{ fontWeight: 700, fontSize: '0.78rem', color: '#566a7f', borderBottom: '1px solid #e7e7ff', whiteSpace: 'nowrap' }}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {displayRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center" sx={{ py: 4, color: '#a8b0b9' }}>
                    {emptyMessage ?? 'No data.'}
                  </TableCell>
                </TableRow>
              ) : (
                displayRows.map((row, rowIdx) => (
                  <TableRow
                    key={rowIdx}
                    sx={{ '&:last-child td': { borderBottom: 0 }, '&:hover': { bgcolor: '#f8f8ff' } }}
                  >
                    {columns.map((col) => {
                      // Row actions column
                      if (col.field === '_actions' && col.actions?.length) {
                        return (
                          <TableCell key={col.field} align="right" sx={{ borderBottom: '1px solid #f0f0ff' }}>
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                              {col.actions.map((act, i) => {
                                // Resolve {{row.id}} placeholders in params
                                const resolvedParams = act.params
                                  ? Object.fromEntries(
                                      Object.entries(act.params).map(([k, v]) => [
                                        k,
                                        typeof v === 'string' ? resolveRowAction(v, row) : v,
                                      ]),
                                    )
                                  : undefined;
                                return (
                                  <Chip
                                    key={i}
                                    label={act.label}
                                    size="small"
                                    variant="outlined"
                                    onClick={() => onAction(act.intent, resolvedParams)}
                                    sx={{
                                      cursor: 'pointer', fontSize: '0.7rem',
                                      borderColor: '#696cff', color: '#696cff',
                                      '&:hover': { bgcolor: '#696cff', color: '#fff' },
                                    }}
                                  />
                                );
                              })}
                            </Box>
                          </TableCell>
                        );
                      }

                      const cellVal = row[col.field];

                      // Chip column
                      if (col.chip && cellVal !== undefined) {
                        const chipColorKey = col.chip.colorMap[String(cellVal)] ?? 'default';
                        const chipStyle    = CHIP_COLORS[chipColorKey] ?? CHIP_COLORS.default;
                        return (
                          <TableCell key={col.field} align={col.align} sx={{ borderBottom: '1px solid #f0f0ff' }}>
                            <Chip
                              label={String(cellVal)}
                              size="small"
                              sx={{ bgcolor: chipStyle.bg, color: chipStyle.color, fontWeight: 600, fontSize: '0.72rem' }}
                            />
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell
                          key={col.field}
                          align={col.align}
                          sx={{ fontSize: '0.82rem', color: '#566a7f', borderBottom: '1px solid #f0f0ff' }}
                        >
                          {cellVal !== undefined && cellVal !== null ? String(cellVal) : '—'}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>

        {pagination && (
          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page - 1}
            rowsPerPage={pagination.pageSize}
            rowsPerPageOptions={[pagination.pageSize]}
            onPageChange={(_e, p) => onAction(pagination.intent, { page: p + 1 })}
            sx={{ borderTop: '1px solid #e7e7ff' }}
          />
        )}
      </Paper>
    </Box>
  );
}
