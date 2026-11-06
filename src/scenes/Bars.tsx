import { interpolate, interpolateColors, spring, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { SceneProps, money, rise } from "./common";

type P = { reveal: number; highlight?: string[] };

export const Bars: React.FC<SceneProps> = ({ segs, data, fps, offset }) => {
  const f = useCurrentFrame();
  const t = f / fps + offset;
  let ai = 0;
  segs.forEach((s, i) => { if (t >= s.start - 0.05) ai = i; });
  const active = segs[ai];
  const hl = (active.props as P).highlight ?? [];
  const hlP = interpolate(t, [active.start, active.start + 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const max = Math.max(...data.bars.map((b) => b.value));
  const titleP = spring({ frame: f, fps, config: { damping: 16, stiffness: 160 } });

  return (
    <div style={{ width: 940 }}>
      <div style={{ ...rise(titleP), color: theme.text, fontSize: 64, fontWeight: 900, letterSpacing: -1, textAlign: "center" }}>
        One Big Mac, in <span style={{ color: theme.accent }}>US dollars</span>
      </div>
      <div style={{ ...rise(titleP), color: theme.muted, fontSize: 36, fontWeight: 500, textAlign: "center", marginBottom: 36 }}>July 2026</div>
      {data.bars.map((b, i) => {
        // balk verschijnt gespreid binnen het segment dat hem onthult
        const si = segs.findIndex((s) => (s.props as P).reveal > i);
        const seg = segs[si];
        const prev = si > 0 ? (segs[si - 1].props as P).reveal : 0;
        const n = (seg.props as P).reveal - prev;
        const appear = seg.start + ((i - prev) / Math.max(n, 1)) * (seg.end - seg.start) * 0.7;
        const p = spring({ frame: f - Math.round((appear - offset) * fps), fps, config: { damping: 18, stiffness: 140 } });
        const isHl = hl.includes(b.code);
        const wasHl = si <= ai && hl.length > 0;
        const dim = hl.length && !isHl ? interpolate(hlP, [0, 1], [1, 0.4]) : 1;
        const color = isHl ? interpolateColors(hlP, [0, 1], [theme.bar, theme.accent]) : theme.bar;
        const w = p * (b.value / max) * 470;
        return (
          <div key={b.code} style={{ display: "flex", alignItems: "center", height: 80, opacity: Math.min(1, p * 2) * (wasHl ? dim : 1) }}>
            <div style={{ width: 320, whiteSpace: "nowrap", textAlign: "right", paddingRight: 24, color: isHl ? theme.text : "#C3CAD6", fontSize: 40, fontWeight: isHl ? 900 : 700 }}>{b.label}</div>
            <div style={{ width: w, height: 54, borderRadius: 12, background: color, boxShadow: isHl ? `0 0 40px ${theme.accent}55` : "none" }} />
            <div style={{ marginLeft: 18, color: isHl ? theme.accent : theme.text, fontSize: 42, fontWeight: 900 }}>{money(b.value * p)}</div>
          </div>
        );
      })}
    </div>
  );
};
