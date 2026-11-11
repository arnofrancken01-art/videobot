import { interpolate, spring, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Flag, Fmt, P, SceneProps, fmt } from "./common";

/**
 * Balkenrace door de tijd: de balken groeien en halen elkaar in terwijl het jaartal oploopt.
 * props (eerste segment): { title, format?, years: [..], items: [{label, flag, values: [..]}], show?: 6, focus?: "China" }
 * props (elk segment, optioneel): { to: 2010 }  -> aan het einde van dit segment staat de race op dat jaar.
 */
type Item = { label: string; flag?: string; values: number[] };
const PALETTE = ["#6EA8FE", "#F778BA", "#FFB020", "#B18CFF", "#3DD6D0", "#FF7A59", "#9BE564", "#E8C547", "#7FD1FF", "#FF9EC4"];

export const Race: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const base = P(segs[0]);
  const years: number[] = base.years;
  const items: Item[] = base.items;
  const format: Fmt = base.format ?? {};
  const show: number = base.show ?? 6;
  const y0 = years[0], y1 = years[years.length - 1];
  // Tijd -> jaar: per segment een doeljaar (to), anders gelijk verdeeld.
  const kf: [number, number][] = [[Math.round(fps * 0.5), y0]];
  segs.forEach((s, i) => {
    const to = P(s).to ?? y0 + ((y1 - y0) * (i + 1)) / segs.length;
    const fr = Math.round((s.end - offset) * fps) - (i === segs.length - 1 ? Math.round(fps * 0.9) : 0);
    kf.push([Math.max(fr, kf[kf.length - 1][0] + 1), Math.max(to, kf[kf.length - 1][1])]);
  });
  const yearAt = (fr: number) => interpolate(fr, kf.map((k) => k[0]), kf.map((k) => k[1]), { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const valAt = (it: Item, yr: number) => interpolate(yr, years, it.values, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ranksAt = (fr: number) => {
    const yr = yearAt(fr);
    const order = items.map((it, i) => ({ i, v: valAt(it, yr) })).sort((a, b) => b.v - a.v);
    const rk: number[] = [];
    order.forEach((o, r) => { rk[o.i] = r; });
    return rk;
  };
  // Vloeiend wisselen van plaats: gemiddelde rang over de laatste frames.
  const SM = 10;
  const smooth = items.map(() => 0);
  for (let k = 0; k < SM; k++) ranksAt(f - k).forEach((r, i) => { smooth[i] += r / SM; });
  const yr = yearAt(f);
  const vals = items.map((it) => valAt(it, yr));
  const max = Math.max(...vals);
  const rowH = Math.min(128, 780 / show);
  const intro = spring({ frame: f, fps, config: { damping: 16, stiffness: 150 } });
  const done = f >= kf[kf.length - 1][0];
  const pulse = done ? spring({ frame: f - kf[kf.length - 1][0], fps, config: { damping: 9, stiffness: 200 } }) : 0;
  return (
    <div style={{ width: 980, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ color: theme.text, fontSize: 60, fontWeight: 900, letterSpacing: -1.5, textAlign: "center", lineHeight: 1.05, textTransform: "uppercase", opacity: intro }}>{base.title}</div>
      <div style={{ position: "relative", width: 980, height: rowH * show + 10, marginTop: 36, overflow: "hidden" }}>
        <div style={{ position: "absolute", right: 6, bottom: -18, color: "rgba(255,255,255,0.13)", fontSize: 270, fontWeight: 900, letterSpacing: -12, lineHeight: 1, transform: `scale(${1 + 0.06 * pulse})`, transformOrigin: "right bottom" }}>{Math.floor(yr)}</div>
        {items.map((it, i) => {
          const isFocus = base.focus === it.label;
          const color = isFocus ? theme.accent : PALETTE[i % PALETTE.length];
          const w = 90 + (vals[i] / max) * 560 * intro;
          const top = smooth[i] * rowH;
          return (
            <div key={it.label} style={{ position: "absolute", left: 0, top, height: rowH, display: "flex", alignItems: "center", opacity: interpolate(smooth[i], [show - 0.6, show], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), zIndex: isFocus ? 2 : 1 }}>
              <div style={{ width: w, height: rowH * 0.78, borderRadius: 18, background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: isFocus ? `0 0 50px ${theme.accent}77` : "none", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 12 }}>
                <Flag code={it.flag} h={rowH * 0.52} />
              </div>
              <div style={{ marginLeft: 18, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ color: theme.text, fontSize: rowH * 0.3, fontWeight: 800, lineHeight: 1.05, whiteSpace: "nowrap" }}>{it.label}</div>
                <div style={{ color: isFocus ? theme.accent : "#DDE3EE", fontSize: rowH * 0.4, fontWeight: 900, lineHeight: 1.05, letterSpacing: -1, whiteSpace: "nowrap" }}>{fmt(vals[i], format)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
