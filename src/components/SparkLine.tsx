interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
}

export function SparkLine({ data, width = 80, height = 24 }: SparkLineProps) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(" ");

  const trend = data[data.length - 1] - data[0];
  const stroke = trend > 0 ? "hsl(var(--success))" : trend < 0 ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} />
    </svg>
  );
}
