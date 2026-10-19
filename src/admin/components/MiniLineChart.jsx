function makePoints(data, key, width, height) {
  const values = data.map((item) => Number(item[key] || 0));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function MiniLineChart({
  data,
  primaryKey = "revenue",
  secondaryKey,
  labels = [],
}) {
  const width = 620;
  const height = 190;
  const primary = makePoints(data, primaryKey, width, height);
  const secondary = secondaryKey
    ? makePoints(data, secondaryKey, width, height)
    : "";

  return (
    <div className="miniChart">
      <svg
        viewBox={`0 0 ${width} ${height + 20}`}
        role="img"
        aria-label="Gráfico"
      >
        <defs>
          <linearGradient id="adminChartFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,190,0,.24)" />
            <stop offset="100%" stopColor="rgba(255,190,0,0)" />
          </linearGradient>
        </defs>

        <polyline
          points={primary}
          fill="none"
          stroke="#f5b800"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {secondary && (
          <polyline
            points={secondary}
            fill="none"
            stroke="#191919"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>

      <div className="miniChartLabels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
