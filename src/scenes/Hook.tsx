import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Flag, Fmt, Icon, P, SceneProps, fmt } from "./common";

/**
 * Openingsbeeld: de schokkende claim staat er vanaf het eerste frame.
 * props: { kicker, big, format?, sub?, flag?, icon? }
 * Het getal telt in 0,4 s op en blijft daarna staan; een zachte zoom houdt het levendig.
 */
export const Hook: React.FC<SceneProps> = ({ segs, fps }) => {
  const f = useCurrentFrame();
  const p = P(segs[0]);
  const format: Fmt = p.format ?? {};
  const v = interpolate(f, [0, fps * 0.4], [p.big * 0.6, p.big], { extrapolateRight: "clamp" });
  const text = fmt(f >= fps * 0.4 ? p.big : v, format);
  const size = Math.min(260, 1700 / Math.max(4, text.length));
  const glow = 0.5 + 0.5 * Math.sin(f / 8);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34, textAlign: "center" }}>
      {(p.flag || p.icon) && (
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {p.flag && <Flag code={p.flag} h={120} />}
          {p.icon && !p.flag && <Icon name={p.icon} size={200} />}
        </div>
      )}
      <div style={{ color: theme.text, fontSize: 62, fontWeight: 900, letterSpacing: -1, lineHeight: 1.08, maxWidth: 940, textTransform: "uppercase" }}>{p.kicker}</div>
      <div style={{
        color: theme.accent, fontSize: size, fontWeight: 900, letterSpacing: -size / 22, lineHeight: 1, whiteSpace: "nowrap",
        textShadow: `0 0 ${40 + 40 * glow}px rgba(43,212,125,0.45)`,
      }}>{text}</div>
      {p.sub && <div style={{ color: theme.muted, fontSize: 50, fontWeight: 800, maxWidth: 900 }}>{p.sub}</div>}
    </div>
  );
};
