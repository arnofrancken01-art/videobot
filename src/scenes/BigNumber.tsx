import { interpolate, spring, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Fmt, P, SceneProps, fmt, rise, slam, usePop, wordFrame } from "./common";

/**
 * Eén groot getal dat optelt, met optioneel een vergelijking van twee balken eronder.
 * props: { value, format?, caption, at?: "woord", compare?: { format?, items: [{label, value}, {label, value}] } }
 */
export const BigNumber: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const p = P(segs[0]);
  const format: Fmt = p.format ?? {};
  const at = Math.min(wordFrame(segs[0], p.at, fps, offset), Math.round(fps * 0.5)); // nooit lang een leeg vak
  const big = usePop(at, 220);
  const intro = usePop(0, 180);
  const n: number = interpolate(f, [at, at + 18], [0, Number(p.value)], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const color = p.value < 0 ? theme.warm : theme.accent;
  const cmp = p.compare;
  const max = cmp ? Math.max(...cmp.items.map((x: { value: number }) => Math.abs(x.value))) : 1;
  const text = fmt(n, format);
  const size = Math.min(300, 1500 / Math.max(3, text.length));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <div style={{ ...slam(big), color, fontSize: size, fontWeight: 900, letterSpacing: -size / 25, lineHeight: 1, whiteSpace: "nowrap" }}>{text}</div>
      <div style={{ ...rise(intro), color: theme.text, fontSize: 48, fontWeight: 800, textAlign: "center", maxWidth: 900 }}>{p.caption}</div>
      {cmp && (
        <div style={{ marginTop: 50, width: 860 }}>
          {cmp.items.map((it: { label: string; value: number }, i: number) => {
            const g = spring({ frame: f - 4 - i * 6, fps, config: { damping: 20, stiffness: 100 } });
            return (
              <div key={i} style={{ marginBottom: 30, opacity: Math.min(1, g * 2) }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: theme.text, fontSize: 40, fontWeight: 800, marginBottom: 10 }}>
                  <span>{it.label}</span><span style={{ color: i === 0 ? "#A9B4C8" : color }}>{fmt(it.value, cmp.format ?? {})}</span>
                </div>
                <div style={{ height: 64, borderRadius: 14, background: theme.bgSoft, border: `2px solid ${theme.border}` }}>
                  <div style={{ width: `${(Math.abs(it.value) / max) * 100 * g}%`, height: "100%", borderRadius: 12, background: i === 0 ? "#5B6A85" : color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
