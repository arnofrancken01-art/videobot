import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { SceneProps, money } from "./common";

export const LineScene: React.FC<SceneProps> = ({ data }) => {
  const f = useCurrentFrame();
  const s = data.usSeries;
  const W = 900, H = 700, pad = 20;
  const maxV = 7, years = s.map((d) => +d.date.slice(0, 4) + (+d.date.slice(5, 7) - 1) / 12);
  const x = (y: number) => pad + ((y - years[0]) / (years[years.length - 1] - years[0])) * (W - 2 * pad);
  const y = (v: number) => H - pad - (v / maxV) * (H - 2 * pad);
  const pts = s.map((d, i) => `${x(years[i])},${y(d.value)}`).join(" ");
  const progress = interpolate(f, [5, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const first = s[0], last = s[s.length - 1];
  return (
    <AbsoluteFill style={{ padding: "220px 90px 0" }}>
      <div style={{ color: theme.text, fontSize: 58, fontWeight: 900 }}>Big Mac price in the US</div>
      <div style={{ color: theme.muted, fontSize: 36, fontWeight: 500, marginBottom: 30 }}>2000 to 2026, in dollars</div>
      <svg width={W} height={H + 80} style={{ overflow: "visible" }}>
        {[0, 2, 4, 6].map((v) => (
          <g key={v}>
            <line x1={0} x2={W} y1={y(v)} y2={y(v)} stroke={theme.bar} strokeWidth={2} />
            <text x={0} y={y(v) - 10} fill={theme.muted} fontSize={30} fontFamily="Inter">${v}</text>
          </g>
        ))}
        <polyline points={pts} fill="none" stroke={theme.accent} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />
        <circle cx={x(years[0])} cy={y(first.value)} r={14} fill={theme.text} />
        <text x={x(years[0])} y={y(first.value) + 70} fill={theme.text} fontSize={48} fontWeight={900} fontFamily="Inter">{money(first.value)}</text>
        <text x={x(years[0])} y={y(first.value) + 115} fill={theme.muted} fontSize={30} fontFamily="Inter">{first.date.slice(0, 4)}</text>
        <g opacity={progress > 0.97 ? 1 : 0}>
          <circle cx={x(years[years.length - 1])} cy={y(last.value)} r={16} fill={theme.accent} />
          <text x={x(years[years.length - 1])} y={y(last.value) - 40} textAnchor="end" fill={theme.accent} fontSize={64} fontWeight={900} fontFamily="Inter">{money(last.value)}</text>
        </g>
        <text x={W} y={H + 60} textAnchor="end" fill={theme.muted} fontSize={30} fontFamily="Inter">{last.date.slice(0, 4)}</text>
      </svg>
    </AbsoluteFill>
  );
};
