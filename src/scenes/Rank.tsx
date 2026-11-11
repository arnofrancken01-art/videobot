import { interpolate, spring, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Flag, Fmt, P, SceneProps, fmt, wordFrame } from "./common";
import { MapKey, WorldMap } from "./WorldMap";

/**
 * Top 5 aftelling: één doorlopende scene over alle opeenvolgende "rank"-segmenten.
 * Eerste segment: { title, format, map?: true, rank: 5, label, value, flag, note? }
 * Volgende: { rank: 4..1, label, value, flag, note? }. Een segment zonder rank laat het huidige land staan.
 * Bovenaan het land dat nu genoemd wordt, onderaan de ladder 1..5 waarin onthulde landen verschijnen
 * en de rest als "?" wacht (houdt de kijker vast tot nummer 1).
 */
type Item = { rank: number; label: string; value: number; flag?: string; note?: string };

export const Rank: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const first = P(segs[0]);
  const format: Fmt = first.format ?? {};
  const total: number = first.of ?? first.rank ?? 5;

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

  // Kaart: bij elk nieuw nummer zoomt ze uit naar de wereld, op de landnaam vliegt ze naar het land.
  const keys: MapKey[] = ranked.flatMap((s, i) => [
    ...(i > 0 ? [{ at: s.start, code: null }] : []),
    { at: s.reveal, code: (s.item as Item).flag ?? null },
  ]);
  const useMap = !!first.map; // kaart alleen als de episode erom vraagt (af en toe)
  const done = ranked.filter((s) => s.reveal <= f && s !== cur).map((s) => (s.item as Item).flag ?? "");

  return (
    <div style={{ width: 940, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
      {useMap ? (<>
      <WorldMap keys={keys} done={done} current={shown ? it.flag ?? null : null} color={color} />

      {/* Huidig land */}
      <div style={{ height: 170, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 34 }}>
        <div style={{
          color, fontSize: 170, fontWeight: 900, letterSpacing: -8, lineHeight: 1,
          transform: `translateX(${interpolate(numIn, [0, 1], [-160, 0])}px) scale(${interpolate(numIn, [0, 1], [1.5, 1])}) rotate(${interpolate(numIn, [0, 1], [-8, 0])}deg)`, opacity: Math.min(1, numIn * 2),
          textShadow: isOne ? `0 0 ${50 + 50 * glow}px rgba(255,176,32,0.55)` : undefined,
        }}>#{it.rank}</div>
        <div style={{ minWidth: 520 }}>
          {shown ? (
            <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: Math.min(1, nameIn * 2), transform: `translateX(${interpolate(nameIn, [0, 1], [140, 0])}px) scale(${interpolate(nameIn, [0, 1], [1.25, 1])})` }}>
              <Flag code={it.flag} h={96} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ color: theme.text, fontSize: it.label.length > 10 ? 54 : 68, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>{it.label}</div>
                <div style={{ color, fontSize: 80, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>{fmt(count, format)}</div>
              </div>
            </div>
          ) : (
            <div style={{ color: theme.muted, fontSize: 150, fontWeight: 900, lineHeight: 1 }}>?</div>
          )}
        </div>
      </div>

      </>) : (<>
      {/* Huidig land, groot (zonder kaart) */}
      <div style={{ height: 480, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 40 }}>
        <div style={{
          color, fontSize: 250, fontWeight: 900, letterSpacing: -12, lineHeight: 1,
          transform: `translateX(${interpolate(numIn, [0, 1], [-160, 0])}px) scale(${interpolate(numIn, [0, 1], [1.5, 1])}) rotate(${interpolate(numIn, [0, 1], [-8, 0])}deg)`, opacity: Math.min(1, numIn * 2),
          textShadow: isOne ? `0 0 ${50 + 50 * glow}px rgba(255,176,32,0.55)` : undefined,
        }}>#{it.rank}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 460 }}>
          {shown ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: Math.min(1, nameIn * 2), transform: `translateX(${interpolate(nameIn, [0, 1], [140, 0])}px) scale(${interpolate(nameIn, [0, 1], [1.25, 1])})` }}>
              <Flag code={it.flag} h={110} />
              <div style={{ color: theme.text, fontSize: it.label.length > 12 ? 62 : 78, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>{it.label}</div>
              <div style={{ color, fontSize: 92, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>{fmt(count, format)}</div>
            </div>
          ) : (
            <div style={{ color: theme.muted, fontSize: 200, fontWeight: 900, lineHeight: 1 }}>?</div>
          )}
        </div>
      </div>
      </>)}

      {/* Ladder 1..5 */}
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        {Array.from({ length: total }, (_, k) => k + 1).map((r) => {
          const st = ranked.find((s) => (s.item as Item).rank === r);
          const open = st && f >= st.reveal;
          const active = st === cur;
          const g = st ? spring({ frame: f - st.reveal, fps, config: { damping: 20, stiffness: 120 } }) : 0;
          const x = st?.item as Item | undefined;
          const c = r === 1 ? theme.warm : theme.accent;
          return (
            <div key={r} style={{
              height: 62, borderRadius: 14, display: "flex", alignItems: "center", gap: 18, padding: "0 22px", position: "relative", overflow: "hidden",
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
