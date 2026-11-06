import { Easing, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { SceneProps, money, rise, slam, usePop } from "./common";

// Lijn tekent zich, een punt met prijslabel rijdt mee tot vandaag.
export const LineScene: React.FC<SceneProps> = ({ segs, data, fps }) => {
  const f = useCurrentFrame();
  const s = data.usSeries;
  const W = 880, H = 620;
  const years = s.map((d) => +d.date.slice(0, 4) + (+d.date.slice(5, 7) - 1) / 12);
  const maxV = 7;
  const x = (y: number) => ((y - years[0]) / (years[years.length - 1] - years[0])) * W;
  const y = (v: number) => H - (v / maxV) * H;
  const dur = Math.round((segs[0].end - segs[0].start) * fps * 0.85);
  const prog = interpolate(f, [4, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const idx = prog * (s.length - 1);
  const i0 = Math.floor(idx), i1 = Math.min(s.length - 1, i0 + 1), fr = idx - i0;
  const cx = x(years[i0] + (years[i1] - years[i0]) * fr);
  const cv = s[i0].value + (s[i1].value - s[i0].value) * fr;
  const pts = s.slice(0, i0 + 1).map((d, i) => `${x(years[i])},${y(d.value)}`).concat(`${cx},${y(cv)}`).join(" ");
  const area = `0,${H} ${pts} ${cx},${H}`;
  const title = usePop(0);
  const badge = usePop(dur, 240);
  const mult = s[s.length - 1].value / s[0].value;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ ...rise(title), color: theme.text, fontSize: 64, fontWeight: 900, letterSpacing: -1 }}>Big Mac price in the US</div>
      <div style={{ ...rise(title), color: theme.muted, fontSize: 36, fontWeight: 500, marginBottom: 70 }}>2000 to 2026</div>
      <svg width={W} height={H + 70} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={theme.accent} stopOpacity={0.35} />
            <stop offset="1" stopColor={theme.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 2, 4, 6].map((v) => (
          <g key={v}>
            <line x1={0} x2={W} y1={y(v)} y2={y(v)} stroke={theme.border} strokeWidth={2} />
            <text x={W} y={y(v) - 10} textAnchor="end" fill={theme.muted} fontSize={28} fontFamily="Inter">${v}</text>
          </g>
        ))}
        <polygon points={area} fill="url(#area)" />
        <polyline points={pts} fill="none" stroke={theme.accent} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
        <text x={0} y={H + 50} fill={theme.muted} fontSize={30} fontFamily="Inter">2000</text>
        <text x={W} y={H + 50} textAnchor="end" fill={theme.muted} fontSize={30} fontFamily="Inter">2026</text>
        <circle cx={cx} cy={y(cv)} r={18} fill={theme.accent} />
        <circle cx={cx} cy={y(cv)} r={34} fill={theme.accent} opacity={0.25} />
        <text x={Math.min(cx, W - 10)} y={y(cv) - 50} textAnchor={cx > W / 2 ? "end" : "start"} fill={theme.text} fontSize={60} fontWeight={900} fontFamily="Inter">{money(cv)}</text>
      </svg>
      <div style={{ ...slam(badge), marginTop: 30, padding: "16px 40px", borderRadius: 999, background: theme.accent, color: theme.bg, fontSize: 56, fontWeight: 900 }}>
        {mult.toFixed(1)}x since 2000
      </div>
    </div>
  );
};
