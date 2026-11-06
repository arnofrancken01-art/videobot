import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { SceneProps, money } from "./common";

export const Bars: React.FC<SceneProps> = ({ segs, data, fps, offset }) => {
  const f = useCurrentFrame();
  const t = f / fps + offset;
  // actief segment bepaalt hoeveel balken zichtbaar zijn en welke oplichten
  let active = segs[0];
  for (const s of segs) if (t >= s.start - 0.05) active = s;
  const props = active.props as { reveal: number; highlight?: string[] };
  const max = Math.max(...data.bars.map((b) => b.value));
  const rowH = 90;
  const titleP = spring({ frame: f, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ padding: "220px 70px 0" }}>
      <div style={{ opacity: titleP, color: theme.text, fontSize: 58, fontWeight: 900, lineHeight: 1.1 }}>One Big Mac, in US dollars</div>
      <div style={{ opacity: titleP, color: theme.muted, fontSize: 36, fontWeight: 500, marginBottom: 40 }}>July 2026</div>
      {data.bars.map((b, i) => {
        // tijdstip waarop deze balk verschijnt: in het segment dat hem onthult, gespreid over het segment
        const seg = segs.find((s) => (s.props as { reveal: number }).reveal > i)!;
        const prevReveal = segs.indexOf(seg) > 0 ? (segs[segs.indexOf(seg) - 1].props as { reveal: number }).reveal : 0;
        const n = (seg.props as { reveal: number }).reveal - prevReveal;
        const appear = seg.start + ((i - prevReveal) / Math.max(n, 1)) * (seg.end - seg.start) * 0.8;
        const p = spring({ frame: f - Math.round((appear - offset) * fps), fps, config: { damping: 18, stiffness: 90 } });
        const hl = props.highlight?.includes(b.code);
        const w = interpolate(p, [0, 1], [0, (b.value / max) * 640]);
        return (
          <div key={b.code} style={{ display: "flex", alignItems: "center", height: rowH, opacity: Math.min(1, p * 1.5) }}>
            <div style={{ width: 300, color: hl ? theme.text : theme.muted, fontSize: 38, fontWeight: hl ? 900 : 700 }}>{b.label}</div>
            <div style={{ width: w, height: 52, borderRadius: 10, background: hl ? theme.accent : theme.bar }} />
            <div style={{ marginLeft: 16, color: hl ? theme.accent : theme.text, fontSize: 40, fontWeight: 900 }}>{money(b.value)}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
