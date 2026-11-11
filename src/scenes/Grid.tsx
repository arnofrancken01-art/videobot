import { interpolate, spring, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Flag, Icon, P, SceneProps, rise, usePop, wordFrame } from "./common";

/**
 * Pictogram: per land een rij icoontjes die een voor een inploppen ("zoveel krijg je voor ...").
 * props (eerste segment): { title, icon }
 * props (elk segment):    { row: {label, flag, count}, at?: "woord" }
 */
const COLORS = [theme.warm, "#6EA8FE", theme.accent, "#F778BA"];
export const Grid: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const base = P(segs[0]);
  const title = usePop(0);
  const rows = segs.filter((s) => P(s).row);
  const maxCount = Math.max(...rows.map((s) => P(s).row.count));
  const perLine = maxCount > 24 ? 12 : maxCount > 10 ? 8 : Math.max(5, maxCount);
  const size = Math.min(120, Math.floor(690 / perLine));
  return (
    <div style={{ width: 960, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <div style={{ ...rise(title), color: theme.text, fontSize: 68, fontWeight: 900, letterSpacing: -2, textAlign: "center", lineHeight: 1.04, textTransform: "uppercase" }}>{base.title}</div>
      {rows.map((s, ri) => {
        const { row, at } = P(s);
        const start = Math.min(wordFrame(s, at, fps, offset), Math.round((s.start - offset) * fps) + Math.round(fps * 1.2));
        const p = spring({ frame: f - start, fps, config: { damping: 15, stiffness: 190, mass: 0.6 } });
        const color = COLORS[ri % COLORS.length];
        if (f < start)
          return (
            <div key={ri} style={{ ...rise(title), width: 960, background: theme.bgSoft, border: "4px dashed rgba(255,255,255,0.16)", borderRadius: 36, padding: "22px 30px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, opacity: 0.55 }}>
                <Flag code={row.flag} h={48} />
                <div style={{ color: theme.text, fontSize: 50, fontWeight: 900, letterSpacing: -1 }}>{row.label}</div>
              </div>
              <div style={{ color: theme.warm, fontSize: 90, fontWeight: 900, lineHeight: 1, opacity: 0.5 + 0.4 * Math.sin(f / 5 + ri) }}>?</div>
            </div>
          );
        const step = Math.max(1, Math.min(3, Math.round((fps * 0.9) / row.count)));
        const shown = Math.min(row.count, Math.max(0, Math.floor((f - start) / step) + 1));
        return (
          <div key={ri} style={{ width: 960, background: theme.bgSoft, border: `4px solid ${color}`, borderRadius: 36, padding: "22px 30px", display: "flex", alignItems: "center", gap: 20, opacity: Math.min(1, p * 2), transform: `scale(${interpolate(p, [0, 1], [1.2, 1])})`, boxShadow: `0 0 60px ${color}22` }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                <Flag code={row.flag} h={48} />
                <div style={{ color: theme.text, fontSize: 50, fontWeight: 900, letterSpacing: -1 }}>{row.label}</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, width: perLine * (size + 4) }}>
                {Array.from({ length: row.count }).map((_, k) => {
                  const ip = spring({ frame: f - start - k * step, fps, config: { damping: 11, stiffness: 260, mass: 0.5 } });
                  return <div key={k} style={{ width: size, height: size, transform: `scale(${ip})` }}><Icon name={base.icon} size={size} /></div>;
                })}
              </div>
            </div>
            <div style={{ color, fontSize: 150, fontWeight: 900, letterSpacing: -6, lineHeight: 1, minWidth: 190, textAlign: "right" }}>{shown}</div>
          </div>
        );
      })}
    </div>
  );
};
