import { Easing, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Fmt, P, SceneProps, fmt, rise, slam, usePop } from "./common";

/**
 * Lijn die zich tekent, met een punt en waardelabel dat meerijdt.
 * props: { title, subtitle?, format?, series: [[x, y], ...], badge? }
 */
export const LineScene: React.FC<SceneProps> = ({ segs, fps }) => {
  const f = useCurrentFrame();
  const p = P(segs[0]);
  const format: Fmt = p.format ?? {};
  const s: [number, number][] = p.series;
  const W = 880, H = 600;
  const xs = s.map((d) => d[0]), ys = s.map((d) => d[1]);
  const minY = Math.min(0, ...ys), maxY = Math.max(...ys) * 1.12;
  const x = (v: number) => ((v - xs[0]) / (xs[xs.length - 1] - xs[0])) * W;
  const y = (v: number) => H - ((v - minY) / (maxY - minY)) * H;
  const total = segs[segs.length - 1].end - segs[0].start;
  const dur = Math.round(total * fps * 0.8);
  const prog = interpolate(f, [4, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const idx = prog * (s.length - 1);
  const i0 = Math.floor(idx), i1 = Math.min(s.length - 1, i0 + 1), fr = idx - i0;
  const cx = x(xs[i0] + (xs[i1] - xs[i0]) * fr);
  const cv = ys[i0] + (ys[i1] - ys[i0]) * fr;
  const pts = s.slice(0, i0 + 1).map((d) => `${x(d[0])},${y(d[1])}`).concat(`${cx},${y(cv)}`).join(" ");
  const area = `0,${y(minY)} ${pts} ${cx},${y(minY)}`;
  const title = usePop(0);
  const badge = usePop(dur, 240);
  const ticks = [0, 1, 2, 3].map((k) => minY + ((maxY - minY) * k) / 3);
  const label = (v: number) => String(Math.floor(v));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ ...rise(title), color: theme.text, fontSize: 62, fontWeight: 900, letterSpacing: -1, textAlign: "center", lineHeight: 1.05, maxWidth: 940 }}>{p.title}</div>
      {p.subtitle && <div style={{ ...rise(title), color: theme.muted, fontSize: 36, fontWeight: 500 }}>{p.subtitle}</div>}
      <div style={{ height: 70 }} />
      <svg width={W} height={H + 70} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={theme.accent} stopOpacity={0.35} />
            <stop offset="1" stopColor={theme.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((v, k) => (
          <g key={k}>
            <line x1={0} x2={W} y1={y(v)} y2={y(v)} stroke={theme.border} strokeWidth={2} />
            <text x={W} y={y(v) - 10} textAnchor="end" fill={theme.muted} fontSize={28} fontFamily="Inter">{fmt(v, { ...format, decimals: 0 })}</text>
          </g>
        ))}
        <polygon points={area} fill="url(#area)" />
        <polyline points={pts} fill="none" stroke={theme.accent} strokeWidth={10} strokeLinejoin="round" strokeLinecap="round" />
        <text x={0} y={H + 50} fill={theme.muted} fontSize={30} fontFamily="Inter">{label(xs[0])}</text>
        <text x={W} y={H + 50} textAnchor="end" fill={theme.muted} fontSize={30} fontFamily="Inter">{label(xs[xs.length - 1])}</text>
        <circle cx={cx} cy={y(cv)} r={18} fill={theme.accent} />
        <circle cx={cx} cy={y(cv)} r={34} fill={theme.accent} opacity={0.25} />
        <text x={Math.min(cx, W - 10)} y={y(cv) - 50} textAnchor={cx > W / 2 ? "end" : "start"} fill={theme.text} fontSize={60} fontWeight={900} fontFamily="Inter">{fmt(cv, format)}</text>
      </svg>
      {p.badge && (
        <div style={{ ...slam(badge), marginTop: 30, padding: "16px 40px", borderRadius: 999, background: theme.accent, color: theme.bg, fontSize: 56, fontWeight: 900 }}>
          {p.badge}
        </div>
      )}
    </div>
  );
};
