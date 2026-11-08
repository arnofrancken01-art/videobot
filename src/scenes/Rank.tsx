import { interpolate, spring, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Flag, Fmt, P, SceneProps, fmt, wordFrame } from "./common";

/**
 * Top 5 aftelling: één doorlopende scene over alle opeenvolgende "rank"-segmenten.
 * Eerste segment: { title, format, rank: 5, label, value, flag, note? }
 * Volgende: { rank: 4..1, label, value, flag, note? }. Een segment zonder rank laat het huidige land staan.
 * Bovenaan het land dat nu genoemd wordt, onderaan de ladder 1..5 waarin onthulde landen verschijnen
 * en de rest als "?" wacht (houdt de kijker vast tot nummer 1).
 */
type Item = { rank: number; label: string; value: number; flag?: string; note?: string };

export const Rank: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const first = P(segs[0]);
  const format: Fmt = first.format ?? {};
  const total: number = first.of ?? 5;

  // Per segment: wanneer begint het en wanneer valt de landnaam (= onthulling).
  const steps = segs.map((s) => {
    const p = P(s);
    const start = Math.round((s.start - offset) * fps);
    const said = p.label ? wordFrame(s, String(p.label).split(/[\s-]/)[0], fps, offset) : start;
    const reveal = Math.max(start, Math.min(said, start + Math.round(fps * 1.2)));
    return { start, reveal, item: p.rank ? ({ rank: p.rank, label: p.label, value: p.value, flag: p.flag, note: p.note } as Item) : null };
  });
  const ranked = steps.filter((s) => s.item);
  const cur = [...ranked].reverse().find((s) => s.start <= f) ?? ranked[0];
  const it = cur.item as Item;
  const isOne = it.rank === 1;
  const color = isOne ? theme.warm : theme.accent;

  const numIn = spring({ frame: f - cur.start, fps, config: { damping: 14, stiffness: 220, mass: 0.6 } });
  const nameIn = spring({ frame: f - cur.reveal, fps, config: { damping: 14, stiffness: 200, mass: 0.6 } });
  const shown = f >= cur.reveal;
  const count = interpolate(f, [cur.reveal, cur.reveal + 12], [0, it.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const max = Math.max(...ranked.map((s) => Math.abs((s.item as Item).value)));
  const glow = 0.5 + 0.5 * Math.sin(f / 7);

  return (
    <div style={{ width: 940, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ color: theme.muted, fontSize: 40, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, textAlign: "center" }}>{first.title}</div>

      {/* Huidig land */}
      <div style={{ height: 430, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 40 }}>
        <div style={{
          color, fontSize: 250, fontWeight: 900, letterSpacing: -12, lineHeight: 1,
          transform: `scale(${interpolate(numIn, [0, 1], [1.7, 1])})`, opacity: Math.min(1, numIn * 2),
          textShadow: isOne ? `0 0 ${50 + 50 * glow}px rgba(255,176,32,0.55)` : undefined,
        }}>#{it.rank}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 460 }}>
          {shown ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: Math.min(1, nameIn * 2), transform: `translateX(${interpolate(nameIn, [0, 1], [60, 0])}px)` }}>
              <Flag code={it.flag} h={110} />
              <div style={{ color: theme.text, fontSize: it.label.length > 12 ? 62 : 78, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>{it.label}</div>
              <div style={{ color, fontSize: 92, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>{fmt(count, format)}</div>
            </div>
          ) : (
            <div style={{ color: theme.muted, fontSize: 200, fontWeight: 900, lineHeight: 1 }}>?</div>
          )}
        </div>
      </div>

      {/* Ladder 1..5 */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        {Array.from({ length: total }, (_, k) => k + 1).map((r) => {
          const st = ranked.find((s) => (s.item as Item).rank === r);
          const open = st && f >= st.reveal;
          const active = st === cur;
          const g = st ? spring({ frame: f - st.reveal, fps, config: { damping: 20, stiffness: 120 } }) : 0;
          const x = st?.item as Item | undefined;
          const c = r === 1 ? theme.warm : theme.accent;
          return (
            <div key={r} style={{
              height: 74, borderRadius: 16, display: "flex", alignItems: "center", gap: 18, padding: "0 22px", position: "relative", overflow: "hidden",
              background: theme.bgSoft, border: `2px solid ${active && open ? c : theme.border}`,
            }}>
              {open && x && (
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(Math.abs(x.value) / max) * 100 * g}%`, background: c, opacity: active ? 0.28 : 0.14 }} />
              )}
              <div style={{ width: 70, color: open ? c : theme.muted, fontSize: 40, fontWeight: 900, zIndex: 1 }}>#{r}</div>
              {open && x ? (
                <>
                  <Flag code={x.flag} h={44} />
                  <div style={{ flex: 1, color: theme.text, fontSize: 40, fontWeight: 800, zIndex: 1 }}>{x.label}</div>
                  <div style={{ color: theme.text, fontSize: 40, fontWeight: 900, zIndex: 1 }}>{fmt(x.value, format)}</div>
                </>
              ) : (
                <div style={{ flex: 1, color: theme.muted, fontSize: 40, fontWeight: 800, opacity: 0.6, zIndex: 1 }}>?</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
