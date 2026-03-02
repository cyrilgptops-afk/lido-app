import React, { useMemo } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import type { ChartComponent } from './types';

// Pure SVG chart — no external dependencies.

const COLORS = ['#696cff', '#71dd37', '#ffab00', '#03c3ec', '#ff3e1d', '#8592a3'];

interface ChartDims {
  w: number; h: number;
  padL: number; padR: number; padT: number; padB: number;
}

function toPath(points: [number, number][]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
}

function BarChart({ datasets, labels, dims }: { datasets: ChartComponent['datasets']; labels: string[]; dims: ChartDims }) {
  const { w, h, padL, padR, padT, padB } = dims;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const allValues = datasets.flatMap(d => d.data);
  const maxVal    = Math.max(...allValues, 1);
  const minVal    = Math.min(0, ...allValues);
  const range     = maxVal - minVal;

  const groupW  = chartW / (labels.length || 1);
  const barW    = (groupW * 0.7) / (datasets.length || 1);
  const gap     = groupW * 0.15;

  const toY = (v: number) => padT + chartH * (1 - (v - minVal) / range);

  return (
    <g>
      {/* Y-axis gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padT + chartH * (1 - t);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#e7e7ff" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#a8b0b9">
              {Math.round(minVal + range * t)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {datasets.map((ds, di) =>
        ds.data.map((val, li) => {
          const barH  = Math.abs(toY(val) - toY(0));
          const x     = padL + groupW * li + gap + di * barW;
          const y     = val >= 0 ? toY(val) : toY(0);
          return (
            <rect
              key={`${di}-${li}`}
              x={x} y={y}
              width={barW - 2}
              height={Math.max(barH, 1)}
              fill={ds.color ?? COLORS[di % COLORS.length]}
              rx={2}
              opacity={0.9}
            />
          );
        })
      )}

      {/* X-axis labels */}
      {labels.map((label, li) => (
        <text
          key={li}
          x={padL + groupW * li + groupW / 2}
          y={h - padB + 14}
          textAnchor="middle"
          fontSize={10}
          fill="#8592a3"
        >
          {label}
        </text>
      ))}
    </g>
  );
}

function LineChart({ datasets, labels, dims, area }: { datasets: ChartComponent['datasets']; labels: string[]; dims: ChartDims; area?: boolean }) {
  const { w, h, padL, padR, padT, padB } = dims;
  const chartW = w - padL - padR;
  const chartH = h - padT - padB;

  const allValues = datasets.flatMap(d => d.data);
  const maxVal    = Math.max(...allValues, 1);
  const minVal    = Math.min(0, ...allValues);
  const range     = maxVal - minVal;
  const stepX     = chartW / Math.max(labels.length - 1, 1);
  const toY       = (v: number) => padT + chartH * (1 - (v - minVal) / range);

  return (
    <g>
      {/* Gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = padT + chartH * (1 - t);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="#e7e7ff" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#a8b0b9">
              {Math.round(minVal + range * t)}
            </text>
          </g>
        );
      })}

      {datasets.map((ds, di) => {
        const pts: [number, number][] = ds.data.map((v, li) => [padL + stepX * li, toY(v)]);
        const color = ds.color ?? COLORS[di % COLORS.length];
        const pathD = toPath(pts);
        const areaD = area
          ? `${pathD} L${pts[pts.length - 1][0]},${toY(0)} L${pts[0][0]},${toY(0)} Z`
          : undefined;
        return (
          <g key={di}>
            {area && areaD && (
              <path d={areaD} fill={ds.backgroundColor ?? color} opacity={0.15} />
            )}
            <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {pts.map(([x, y], li) => (
              <circle key={li} cx={x} cy={y} r={3} fill={color} stroke="#fff" strokeWidth={1.5} />
            ))}
          </g>
        );
      })}

      {labels.map((label, li) => (
        <text key={li} x={padL + stepX * li} y={h - padB + 14} textAnchor="middle" fontSize={10} fill="#8592a3">
          {label}
        </text>
      ))}
    </g>
  );
}

function PieChart({ datasets, labels, dims, donut }: { datasets: ChartComponent['datasets']; labels: string[]; dims: ChartDims; donut?: boolean }) {
  const { w, h, padT } = dims;
  const cx     = w / 2;
  const cy     = padT + (h - padT - 30) / 2;
  const r      = Math.min(cx, cy - padT) - 10;
  const inner  = donut ? r * 0.55 : 0;
  const values = datasets[0]?.data ?? [];
  const total  = values.reduce((s, v) => s + v, 0) || 1;

  let startAngle = -Math.PI / 2;
  const slices = values.map((v, i) => {
    const angle    = (v / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + inner * Math.cos(startAngle);
    const iy1 = cy + inner * Math.sin(startAngle);
    const ix2 = cx + inner * Math.cos(endAngle);
    const iy2 = cy + inner * Math.sin(endAngle);
    const large = angle > Math.PI ? 1 : 0;
    const d = donut
      ? `M${ix1},${iy1} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix2},${iy2} A${inner},${inner} 0 ${large} 0 ${ix1},${iy1} Z`
      : `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`;
    const slice = { d, color: COLORS[i % COLORS.length], label: labels[i] ?? '', angle: startAngle + angle / 2, pct: Math.round((v / total) * 100) };
    startAngle = endAngle;
    return slice;
  });

  return (
    <g>
      {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} stroke="#fff" strokeWidth={2} />)}
      {donut && (
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={16} fontWeight={700} fill="#566a7f">
          {total}
        </text>
      )}
    </g>
  );
}

export default function ChartCard({ component }: { component: ChartComponent }) {
  const { title, chartType, labels, datasets, height = 260, legend } = component;
  const dims: ChartDims = { w: 560, h: height, padL: 40, padR: 16, padT: 16, padB: 30 };

  return (
    <Box>
      {title && (
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: '#566a7f' }}>
          {title}
        </Typography>
      )}

      <Paper elevation={0} sx={{ border: '1px solid #e7e7ff', borderRadius: 2, p: 2, overflow: 'hidden' }}>
        <Box sx={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${dims.w} ${dims.h}`} style={{ width: '100%', height: height, display: 'block' }}>
            {chartType === 'bar'                             && <BarChart  datasets={datasets} labels={labels} dims={dims} />}
            {(chartType === 'line' || chartType === 'area')  && <LineChart datasets={datasets} labels={labels} dims={dims} area={chartType === 'area'} />}
            {(chartType === 'pie'  || chartType === 'doughnut') && <PieChart datasets={datasets} labels={labels} dims={dims} donut={chartType === 'doughnut'} />}
          </svg>
        </Box>

        {legend !== false && datasets.length > 1 && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1.5, justifyContent: 'center' }}>
            {datasets.map((ds, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ds.color ?? COLORS[i % COLORS.length] }} />
                <Typography variant="caption" color="text.secondary">{ds.label}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
