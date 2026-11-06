import { spring, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { SceneProps, money, rise, slam, usePop, wordFrame } from "./common";

// Big Mac Index: de "eerlijke" prijs (VS) tegenover de echte prijs, het gat is de onderwaardering.
export const Undervalued: React.FC<SceneProps> = ({ segs, data, fps, offset }) => {
  const f = useCurrentFrame();
  const { value, code, base } = segs[0].props as { value: number; code: string; base: string };
  const c = data.bars.find((b) => b.code === code)!;
  const us = data.bars.find((b) => b.code === base)!;
  const title = usePop(0);
  const gapAt = wordFrame(segs[0], "sixty", fps, offset);
  const gap = usePop(gapAt, 260);
  const grow = (d: number) => spring({ frame: f - d, fps, config: { damping: 20, stiffness: 90 } });
  const W = 820;
  const bar = (label: string, v: number, color: string, d: number) => (
    <div style={{ marginBottom: 34 }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: W, color: theme.text, fontSize: 40, fontWeight: 800, marginBottom: 10 }}>
        <span>{label}</span><span style={{ color }}>{money(v)}</span>
      </div>
      <div style={{ width: W, height: 70, borderRadius: 14, background: theme.bgSoft, border: `2px solid ${theme.border}`, position: "relative" }}>
        <div style={{ width: (v / us.value) * W * grow(d), height: "100%", borderRadius: 12, background: color }} />
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ ...rise(title), color: theme.text, fontSize: 70, fontWeight: 900, letterSpacing: -1 }}>The Big Mac Index</div>
      <div style={{ ...rise(title), color: theme.muted, fontSize: 36, fontWeight: 500, marginBottom: 60 }}>Same burger should cost the same everywhere</div>
      {bar(`Fair price (${us.label})`, us.value, "#5B6A85", 4)}
      {bar(c.label, c.value, theme.accent, 12)}
      <div style={{ ...slam(gap), marginTop: 30, textAlign: "center" }}>
        <div style={{ color: theme.warm, fontSize: 220, fontWeight: 900, letterSpacing: -8, lineHeight: 1 }}>{value}%</div>
        <div style={{ color: theme.text, fontSize: 44, fontWeight: 800 }}>Indonesian rupiah, undervalued</div>
      </div>
    </div>
  );
};
