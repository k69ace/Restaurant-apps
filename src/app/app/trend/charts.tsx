// Small, dependency-free SVG charts — avoids pulling in a charting library
// for three chart types. Not virtualized/animated; fine at weekly/period
// scale (a handful to a few dozen points).

interface LinePoint {
  label: string;
  value: number | null;
}

interface LineChartProps {
  series: { name: string; color: string; points: LinePoint[] }[];
  height?: number;
  formatValue?: (v: number) => string;
}

const WIDTH = 640;

export function LineChart({ series, height = 200, formatValue }: LineChartProps) {
  const allValues = series.flatMap((s) => s.points.map((p) => p.value)).filter((v): v is number => v !== null);
  if (allValues.length === 0) {
    return <p className="text-sm text-muted">Not enough data yet to chart.</p>;
  }

  const max = Math.max(...allValues, 0);
  const min = Math.min(...allValues, 0);
  const range = max - min || 1;
  const pointCount = series[0]?.points.length ?? 1;
  const stepX = pointCount > 1 ? WIDTH / (pointCount - 1) : 0;

  function y(value: number): number {
    return height - ((value - min) / range) * (height - 20) - 10;
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label={series.map((s) => s.name).join(", ") + " trend chart"}
        className="w-full min-w-[480px]"
      >
        {series.map((s) => {
          const pathPoints = s.points
            .map((p, i) => (p.value === null ? null : `${i * stepX},${y(p.value)}`))
            .filter((p): p is string => p !== null);
          return (
            <g key={s.name}>
              <polyline
                points={pathPoints.join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
              />
              {s.points.map(
                (p, i) =>
                  p.value !== null && (
                    <circle key={i} cx={i * stepX} cy={y(p.value)} r={3} fill={s.color} />
                  ),
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        {series[0]?.points.map((p, i) => (
          <span key={i}>{p.label}</span>
        ))}
      </div>
      {formatValue && (
        <p className="mt-1 text-xs text-muted">
          Range: {formatValue(min)} – {formatValue(max)}
        </p>
      )}
    </div>
  );
}

interface StackedBarPoint {
  label: string;
  segments: { name: string; color: string; value: number }[];
}

export function StackedBarChart({ points, height = 200 }: { points: StackedBarPoint[]; height?: number }) {
  const totals = points.map((p) => p.segments.reduce((sum, s) => sum + s.value, 0));
  const max = Math.max(...totals, 1);
  const barWidth = points.length > 0 ? Math.min(48, (WIDTH / points.length) * 0.6) : 0;
  const stepX = points.length > 0 ? WIDTH / points.length : 0;

  const segmentNames = points[0]?.segments.map((s) => ({ name: s.name, color: s.color })) ?? [];

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        role="img"
        aria-label="Labor dollars by role, stacked by day"
        className="w-full min-w-[480px]"
      >
        {points.map((point, i) => {
          let yOffset = height - 10;
          const x = i * stepX + (stepX - barWidth) / 2;
          return (
            <g key={point.label}>
              {point.segments.map((seg) => {
                const barHeight = (seg.value / max) * (height - 20);
                yOffset -= barHeight;
                return (
                  <rect
                    key={seg.name}
                    x={x}
                    y={yOffset}
                    width={barWidth}
                    height={barHeight}
                    fill={seg.color}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs">
        {segmentNames.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        {points.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </div>
    </div>
  );
}
