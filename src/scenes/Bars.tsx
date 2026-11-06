import { interpolate, interpolateColors, spring, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Fmt, P, SceneProps, fmt, rise } from "./common";

/**
 * Gerangschikte balken. Het eerste segment van de groep bevat de data; latere
 * segmenten zetten alleen andere balken in de kijker.
 * props (eerste segment): { title, subtitle?, format?, items: [{label, value}], highlight? }
 * props (volgende):       { highlight: [labels] }
 */
export const Bars: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const t = f / fps + offset;
  const base = P(segs[0]);
  const items: { label: string; value: number }[] = base.items;
  const format: Fmt = base.format ?? {};
  let ai = 0;
  segs.forEach((s, i) => { if (t >= s.start - 0.05) ai = i; });
  const active = segs[ai];
  const hl: string[] = P(active).highlight ?? [];
  const hlP = interpolate(t, [active.start, active.start + 0.25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const max = Math.max(...items.map((b) => Math.abs(b.value)));
  const titleP = spring({ frame: f, fps, config: { damping: 16, stiffness: 160 } });
  const rowH = Math.min(84, 820 / items.length);
  // balken lopen binnen in de eerste helft van het eerste segment
  const span = (segs[0].end - segs[0].start) * 0.6;

  return (
    <div style={{ width: 960 }}>
      <div style={{ ...rise(titleP), color: theme.text, fontSize: 62, fontWeight: 900, letterSpacing: -1, textAlign: "center", lineHeight: 1.05 }}>{base.title}</div>
      {base.subtitle && <div style={{ ...rise(titleP), color: theme.muted, fontSize: 36, fontWeight: 500, textAlign: "center", marginTop: 6 }}>{base.subtitle}</div>}
      <div style={{ height: 36 }} />
      {items.map((b, i) => {
        const appear = segs[0].start + (i / items.length) * span;
        const p = spring({ frame: f - Math.round((appear - offset) * fps), fps, config: { damping: 18, stiffness: 140 } });
        const isHl = hl.includes(b.label);
        const dim = hl.length && !isHl ? interpolate(hlP, [0, 1], [1, 0.4]) : 1;
        const color = isHl ? interpolateColors(hlP, [0, 1], [theme.bar, theme.accent]) : theme.bar;
        const w = p * (Math.abs(b.value) / max) * 450;
        return (
          <div key={b.label} style={{ display: "flex", alignItems: "center", height: rowH, opacity: Math.min(1, p * 2) * dim }}>
            <div style={{ width: 330, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "right", paddingRight: 24, color: isHl ? theme.text : "#C3CAD6", fontSize: Math.min(40, rowH * 0.5), fontWeight: isHl ? 900 : 700 }}>{b.label}</div>
            <div style={{ width: w, height: rowH * 0.66, borderRadius: 12, background: color, boxShadow: isHl ? `0 0 40px ${theme.accent}55` : "none" }} />
            <div style={{ marginLeft: 18, color: isHl ? theme.accent : theme.text, fontSize: Math.min(42, rowH * 0.52), fontWeight: 900, whiteSpace: "nowrap" }}>{fmt(b.value * Math.min(p, 1), format)}</div>
          </div>
        );
      })}
    </div>
  );
};
