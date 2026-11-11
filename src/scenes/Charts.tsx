import { Img, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Flag, Fmt, P, RED, SceneProps, Title, buildRoundsFor, currentRound, fmt, wordFrame } from "./common";

const COLORS = ["#6EA8FE", "#F778BA", theme.warm, "#B18CFF", "#3DD6D0", "#FF7A59"];
const useSp = (fps: number) => {
  const f = useCurrentFrame();
  return (from: number, stiffness = 190, damping = 14) => spring({ frame: f - from, fps, config: { damping, stiffness, mass: 0.7 } });
};
/** Frame waarop een segment zijn ding onthult: het woord `at`, maar nooit later dan 1,2 s na de start. */
const revealAt = (s: SceneProps["segs"][number], fps: number, offset: number) =>
  Math.min(wordFrame(s, P(s).at, fps, offset), Math.round((s.start - offset) * fps) + Math.round(fps * 1.2));

/**
 * Toen en nu: twee zuilen naast elkaar, de tweede groeit bij de onthulling en toont het verschil.
 * props: { label, flag?, then: {year, value}, now: {year, value}, format?, caption? }  daarna { reveal: true }
 */
export const ThenNow: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const sp = useSp(fps);
  const rounds = buildRoundsFor(segs, fps, offset, "then");
  const ri = currentRound(rounds, f);
  const r = rounds[ri];
  const format: Fmt = r.p.format ?? P(segs[0]).format ?? {};
  const enter = ri === 0 ? spring({ frame: f, fps, config: { damping: 16, stiffness: 120 } }) : sp(r.start, 120, 16);
  const rev = f >= r.reveal ? sp(r.reveal, 110, 15) : 0;
  const a: number = r.p.then.value, b: number = r.p.now.value;
  const max = Math.max(a, b), H = 400;
  const ratio = b / a;
  const up = b >= a;
  const badge = ratio >= 2 ? `${ratio.toFixed(1)}x` : ratio <= 0.5 ? `${(a / b).toFixed(1)}x less` : `${up ? "+" : "-"}${Math.abs(Math.round((ratio - 1) * 100))}%`;
  const col = r.p.good === false ? RED : r.p.good === true ? theme.accent : up ? theme.accent : RED;
  const badgeP = f >= r.reveal + 10 ? sp(r.reveal + 10, 240, 10) : 0;
  const Col = ({ year, v, grow, color, hidden }: { year: number; v: number; grow: number; color: string; hidden: boolean }) => (
    <div style={{ width: 400, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ height: H + 120, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}>
        <div style={{ color: hidden ? theme.warm : color, fontSize: 86, fontWeight: 900, letterSpacing: -3, lineHeight: 1.1, whiteSpace: "nowrap", opacity: hidden ? 0.6 + 0.4 * Math.sin(f / 5) : 1 }}>{hidden ? "?" : fmt(v * Math.min(1, grow), format)}</div>
        <div style={{ width: 300, height: hidden ? H * 0.5 : Math.max(14, (v / max) * H * grow), borderRadius: "26px 26px 0 0", background: hidden ? "transparent" : `linear-gradient(180deg, ${color}, ${color}66)`, border: hidden ? "6px dashed rgba(255,255,255,0.25)" : "none", borderBottom: "none", boxSizing: "border-box", boxShadow: hidden ? "none" : `0 0 60px ${color}44` }} />
      </div>
      <div style={{ width: 400, height: 8, background: "rgba(255,255,255,0.25)", borderRadius: 4 }} />
      <div style={{ color: theme.text, fontSize: 100, fontWeight: 900, letterSpacing: -3, lineHeight: 1.15 }}>{year}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 960 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        {r.p.flag && <Flag code={r.p.flag} h={84} />}
        <Title size={String(r.p.label).length > 26 ? 58 : 70}>{r.p.label}</Title>
      </div>
      {r.p.caption && <div style={{ color: theme.muted, fontSize: 38, fontWeight: 700 }}>{r.p.caption}</div>}
      <div style={{ height: 130, marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {badgeP > 0.02 && (
          <div style={{ width: 400, textAlign: "center", padding: "14px 0", borderRadius: 999, background: col, color: theme.bg, fontSize: 88, fontWeight: 900, letterSpacing: -2, transform: `scale(${badgeP}) rotate(-4deg)`, boxShadow: `0 0 80px ${col}aa` }}>{badge}</div>
        )}
      </div>
      <div style={{ position: "relative", display: "flex", gap: 60, justifyContent: "center" }}>
        <Col year={r.p.then.year} v={a} grow={enter} color="#8FA3C4" hidden={false} />
        <Col year={r.p.now.year} v={b} grow={rev} color={col} hidden={rev < 0.02} />
      </div>
    </div>
  );
};

/**
 * 100 bolletjes: "van elke 100 ... zijn er zoveel ...". Elk segment kleurt een deel in.
 * props (eerste): { title, parts: [{label, count, flag?}] }  (som = 100)    props (elk segment): { part: "label", at? }
 */
export const Dots: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const base = P(segs[0]);
  const parts: { label: string; count: number; flag?: string }[] = base.parts;
  const at: Record<string, number> = {};
  segs.forEach((s) => { if (P(s).part) at[P(s).part] = revealAt(s, fps, offset); });
  let acc = 0;
  const ranges = parts.map((p, i) => { const r = { ...p, from: acc, color: COLORS[i % COLORS.length], at: at[p.label] ?? 99999 }; acc += p.count; return r; });
  const D = 50, G = 8;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, width: 960 }}>
      <Title size={60}>{base.title}</Title>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(10, ${D}px)`, gap: G }}>
        {Array.from({ length: 100 }).map((_, k) => {
          const r = ranges.find((x) => k >= x.from && k < x.from + x.count);
          const start = r ? r.at + (k - r.from) * (r.count > 30 ? 0.5 : 1) : 99999;
          const p = spring({ frame: f - start, fps, config: { damping: 10, stiffness: 260, mass: 0.5 } });
          const on = r && f >= start;
          const intro = spring({ frame: f - k * 0.15, fps, config: { damping: 14, stiffness: 200 } });
          return <div key={k} style={{ width: D, height: D, borderRadius: D / 2, background: on ? r.color : "rgba(255,255,255,0.11)", transform: `scale(${on ? interpolate(p, [0, 1], [0.3, 1]) : intro})`, boxShadow: on ? `0 0 16px ${r.color}88` : "none" }} />;
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", minHeight: 190, alignContent: "flex-start" }}>
        {ranges.map((r) => {
          const p = spring({ frame: f - r.at, fps, config: { damping: 13, stiffness: 220, mass: 0.6 } });
          if (f < r.at) return null;
          return (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 22px", borderRadius: 24, background: theme.bgSoft, border: `4px solid ${r.color}`, transform: `scale(${interpolate(p, [0, 1], [1.4, 1])})`, opacity: Math.min(1, p * 2) }}>
              {r.flag && <Flag code={r.flag} h={40} />}
              <div style={{ color: theme.text, fontSize: 40, fontWeight: 800 }}>{r.label}</div>
              <div style={{ color: r.color, fontSize: 58, fontWeight: 900, letterSpacing: -2 }}>{r.count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Podium: brons, zilver en goud stijgen op, elk met vlag en getal.
 * props (eerste): { title, format }   props (elk segment): { place: 3|2|1, label, flag, value, at? }
 */
export const Podium: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const base = P(segs[0]);
  const format: Fmt = base.format ?? {};
  const medal: Record<number, string> = { 1: "#FFD166", 2: "#C9D1DC", 3: "#E0935A" };
  const hgt: Record<number, number> = { 1: 440, 2: 320, 3: 230 };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: 980 }}>
      <Title size={62}>{base.title}</Title>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 800 }}>
        {[2, 1, 3].map((pl) => {
          const s = segs.find((x) => P(x).place === pl);
          const start = s ? Math.min(wordFrame(s, P(s).at ?? String(P(s).label).split(/[\s-]/)[0], fps, offset), Math.round((s.start - offset) * fps) + Math.round(fps * 1.4)) : 99999;
          const p = spring({ frame: f - start, fps, config: { damping: 13, stiffness: 120, mass: 0.8 } });
          const on = f >= start && s;
          const sp2 = on ? P(s) : null;
          return (
            <div key={pl} style={{ width: 310, display: "flex", flexDirection: "column", alignItems: "center" }}>
              {on && sp2 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 14, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 60}px) scale(${interpolate(p, [0, 1], [1.4, 1])})` }}>
                  <Flag code={sp2.flag} h={pl === 1 ? 130 : 104} />
                  <div style={{ color: theme.text, fontSize: String(sp2.label).length > 11 ? 38 : 50, fontWeight: 900, letterSpacing: -1, textAlign: "center", lineHeight: 1.05 }}>{sp2.label}</div>
                  <div style={{ color: medal[pl], fontSize: pl === 1 ? 76 : 62, fontWeight: 900, letterSpacing: -2, lineHeight: 1, whiteSpace: "nowrap" }}>{fmt(sp2.value, format)}</div>
                </div>
              )}
              <div style={{ width: 310, height: on ? hgt[pl] * p : 90, borderRadius: "26px 26px 0 0", boxSizing: "border-box", background: on ? `linear-gradient(180deg, ${medal[pl]}, ${medal[pl]}55)` : "transparent", border: on ? "none" : "5px dashed rgba(255,255,255,0.22)", borderBottom: "none", display: "flex", justifyContent: "center", paddingTop: 12, boxShadow: on && pl === 1 ? `0 0 90px ${medal[1]}66` : "none" }}>
                <div style={{ color: on ? theme.bg : theme.warm, fontSize: on ? 130 : 60, fontWeight: 900, lineHeight: 1, opacity: on ? 0.85 : 0.5 + 0.4 * Math.sin(f / 5 + pl) }}>{on ? pl : "?"}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ width: 980, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.3)", marginTop: -10 }} />
    </div>
  );
};

/**
 * Duel: twee landen, een paar rondes, het scorebord telt mee.
 * props (eerste): { a: {label, flag}, b: {label, flag} }   props (elk segment): { stat: {label, a, b, format?, pick?: "lower"}, at? }
 */
export const Battle: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const base = P(segs[0]);
  const stats = segs.filter((s) => P(s).stat).map((s) => {
    const st = P(s).stat;
    const aWins = st.pick === "lower" ? st.a < st.b : st.a > st.b;
    return { ...st, aWins, at: revealAt(s, fps, offset) };
  });
  const sa = stats.filter((s) => f >= s.at + 8 && s.aWins).length, sb = stats.filter((s) => f >= s.at + 8 && !s.aWins).length;
  const last = stats.filter((s) => f >= s.at + 8).pop();
  const bump = last ? spring({ frame: f - last.at - 8, fps, config: { damping: 8, stiffness: 240 } }) : 1;
  const Side = ({ c, score, right, hot }: { c: { label: string; flag: string }; score: number; right?: boolean; hot: boolean }) => (
    <div style={{ display: "flex", flexDirection: right ? "row-reverse" : "row", alignItems: "center", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Flag code={c.flag} h={150} />
        <div style={{ color: theme.text, fontSize: 44, fontWeight: 900 }}>{c.label}</div>
      </div>
      <div style={{ color: theme.accent, fontSize: 190, fontWeight: 900, letterSpacing: -6, lineHeight: 1, transform: `scale(${hot ? interpolate(bump, [0, 1], [1.7, 1]) : 1})` }}>{score}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, width: 960 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: 960 }}>
        <Side c={base.a} score={sa} hot={!!last && last.aWins} />
        <div style={{ color: theme.muted, fontSize: 60, fontWeight: 900 }}>VS</div>
        <Side c={base.b} score={sb} right hot={!!last && !last.aWins} />
      </div>
      {stats.map((st, i) => {
        const p = spring({ frame: f - st.at, fps, config: { damping: 15, stiffness: 150 } });
        const on = f >= st.at;
        const fm: Fmt = st.format ?? base.format ?? {};
        const max = Math.max(st.a, st.b);
        const Val = ({ v, win, right }: { v: number; win: boolean; right?: boolean }) => (
          <div style={{ flex: 1, display: "flex", flexDirection: right ? "row" : "row-reverse", alignItems: "center", gap: 14 }}>
            <div style={{ width: `${(v / max) * 46 * p}%`, minWidth: 10, height: 50, borderRadius: 12, background: win ? theme.accent : "#4A566C", boxShadow: win ? `0 0 30px ${theme.accent}77` : "none" }} />
            <div style={{ color: win ? theme.accent : "#C3CAD6", fontSize: 58, fontWeight: 900, letterSpacing: -2, whiteSpace: "nowrap" }}>{fmt(v * Math.min(1, p), fm)}</div>
          </div>
        );
        return (
          <div key={i} style={{ width: 960, borderRadius: 30, background: theme.bgSoft, border: `3px solid ${on ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)"}`, padding: "14px 26px 18px", boxSizing: "border-box", opacity: on ? 1 : 0.35, transform: `scale(${on ? interpolate(p, [0, 1], [1.12, 1]) : 1})` }}>
            <div style={{ color: theme.text, fontSize: 40, fontWeight: 800, textAlign: "center", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>{st.label}</div>
            {on ? (
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Val v={st.a} win={st.aWins} />
                <div style={{ width: 4, height: 70, background: "rgba(255,255,255,0.25)" }} />
                <Val v={st.b} win={!st.aWins} right />
              </div>
            ) : <div style={{ height: 70, color: theme.warm, fontSize: 60, fontWeight: 900, textAlign: "center", lineHeight: "70px" }}>?</div>}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Live teller: "terwijl je dit kijkt...". Elke teller loopt echt mee met de klok van de video.
 * props (eerste): { title }   props (elk segment): { item: {label, flag?, perSecond, format?}, at? }
 */
export const Ticker: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const base = P(segs[0]);
  const t = f / fps;
  const items = segs.filter((s) => P(s).item);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, width: 960 }}>
      <Title size={60}>{base.title}</Title>
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "10px 34px", borderRadius: 999, border: `4px solid ${RED}`, background: "rgba(255,92,92,0.1)" }}>
        <div style={{ width: 26, height: 26, borderRadius: 13, background: RED, opacity: 0.4 + 0.6 * Math.abs(Math.sin(f / 6)) }} />
        <div style={{ color: theme.text, fontSize: 64, fontWeight: 900, fontVariantNumeric: "tabular-nums", letterSpacing: -1 }}>{t.toFixed(1)} s</div>
      </div>
      {items.map((s, i) => {
        const it = P(s).item;
        const at = revealAt(s, fps, offset);
        const p = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 200, mass: 0.6 } });
        if (f < at) return null;
        const col = COLORS[(i + 2) % COLORS.length];
        const text = fmt(it.perSecond * t, it.format ?? base.format ?? {});
        return (
          <div key={i} style={{ width: 960, borderRadius: 36, background: theme.bgSoft, border: `5px solid ${col}`, padding: "20px 34px", boxSizing: "border-box", transform: `scale(${interpolate(p, [0, 1], [1.2, 1])})`, opacity: Math.min(1, p * 2), boxShadow: `0 0 60px ${col}22` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {it.flag && <Flag code={it.flag} h={50} />}
              <div style={{ color: "#DDE3EE", fontSize: 44, fontWeight: 800 }}>{it.label}</div>
            </div>
            <div style={{ color: col, fontSize: Math.min(150, 1560 / Math.max(7, text.length)), fontWeight: 900, letterSpacing: -4, lineHeight: 1.1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{text}</div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Kassabon: regels worden een voor een geprint op wit papier.
 * props (eerste): { title, format }   props (elk segment): { line: {label, value, flag?}, at? }  of  { total: {label, value}, at? }
 */
export const Receipt: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const base = P(segs[0]);
  const format: Fmt = base.format ?? {};
  const rows = segs.filter((s) => P(s).line || P(s).total).map((s) => ({ ...(P(s).line ?? P(s).total), total: !!P(s).total, at: revealAt(s, fps, offset) }));
  const ink = "#1B1F27";
  const shown = rows.filter((r) => f >= r.at).length;
  const hTarget = 250 + rows.slice(0, shown).reduce((n, r) => n + (r.total ? 150 : 104), 0);
  const lastAt = shown ? rows[shown - 1].at : 0;
  const prevH = 250 + rows.slice(0, Math.max(0, shown - 1)).reduce((n, r) => n + (r.total ? 150 : 104), 0);
  const grow = spring({ frame: f - lastAt, fps, config: { damping: 18, stiffness: 170 } });
  const h = shown ? prevH + (hTarget - prevH) * grow : 250;
  const zig = Array.from({ length: 21 }).map((_, i) => `${i * 41},${i % 2 ? 0 : 22}`).join(" ");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: 980, justifyContent: "flex-start" }}>
      <div style={{ width: 880, height: 30, borderRadius: 15, background: "#1E2634", border: "3px solid rgba(255,255,255,0.18)", boxShadow: "0 10px 30px rgba(0,0,0,0.6)", zIndex: 2 }} />
      <div style={{ width: 820, height: h, marginTop: -14, background: "#F6F2E7", overflow: "hidden", boxShadow: "0 30px 70px rgba(0,0,0,0.55)", transform: `rotate(${0.6 * Math.sin(f / 30)}deg)`, transformOrigin: "top center" }}>
        <div style={{ padding: "44px 46px 0" }}>
          <div style={{ color: ink, fontSize: 30, fontWeight: 800, letterSpacing: 8, textAlign: "center" }}>MONEY, MAPPED</div>
          <div style={{ color: ink, fontSize: 54, fontWeight: 900, textAlign: "center", lineHeight: 1.05, textTransform: "uppercase", letterSpacing: -1, marginTop: 6, height: 116, display: "flex", alignItems: "center", justifyContent: "center" }}>{base.title}</div>
          <div style={{ borderTop: `5px dashed ${ink}`, marginTop: 6 }} />
          {rows.map((r, i) => {
            if (f < r.at) return null;
            const p = spring({ frame: f - r.at, fps, config: { damping: 14, stiffness: 240, mass: 0.5 } });
            return r.total ? (
              <div key={i} style={{ height: 150, boxSizing: "border-box", borderTop: `5px dashed ${ink}`, marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: Math.min(1, p * 2) }}>
                <div style={{ color: ink, fontSize: 56, fontWeight: 900, textTransform: "uppercase" }}>{r.label}</div>
                <div style={{ color: "#0A8F4E", fontSize: 92, fontWeight: 900, letterSpacing: -3, transform: `scale(${interpolate(p, [0, 1], [1.5, 1])})`, transformOrigin: "right center" }}>{fmt(r.value, format)}</div>
              </div>
            ) : (
              <div key={i} style={{ height: 104, display: "flex", alignItems: "center", gap: 16, opacity: Math.min(1, p * 2), transform: `translateX(${(1 - p) * -40}px)` }}>
                {r.flag && <Flag code={r.flag} h={52} />}
                <div style={{ color: ink, fontSize: 50, fontWeight: 800, whiteSpace: "nowrap" }}>{r.label}</div>
                <div style={{ flex: 1, borderBottom: `5px dotted ${ink}55`, height: 30 }} />
                <div style={{ color: ink, fontSize: 64, fontWeight: 900, letterSpacing: -2, fontVariantNumeric: "tabular-nums" }}>{fmt(r.value, format)}</div>
              </div>
            );
          })}
        </div>
      </div>
      <svg width={820} height={22} style={{ display: "block", transform: `rotate(${0.6 * Math.sin(f / 30)}deg)` }}><polygon points={`0,0 ${zig} 820,0`} fill="#F6F2E7" /></svg>
    </div>
  );
};

/**
 * Bellen: de oppervlakte van elke bel is het getal. Ze ploppen een voor een op.
 * props (eerste): { title, format }   props (elk segment): { item: {label, flag, value}, at? }
 */
export const Bubbles: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const base = P(segs[0]);
  const format: Fmt = base.format ?? {};
  const items = segs.filter((s) => P(s).item).map((s) => ({ ...P(s).item, at: revealAt(s, fps, offset) }));
  const max = Math.max(...items.map((x) => x.value));
  const R = items.length <= 2 ? 300 : items.length === 3 ? 262 : 235;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: 1000 }}>
      <Title size={62}>{base.title}</Title>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 18, width: 1000, minHeight: 760, alignContent: "center" }}>
        {items.map((it, i) => {
          const r = Math.max(74, R * Math.sqrt(it.value / max));
          const p = spring({ frame: f - it.at, fps, config: { damping: 9, stiffness: 170, mass: 0.8 } });
          const on = f >= it.at;
          const small = r < 120;
          const col = COLORS[i % COLORS.length];
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transform: `translateY(${10 * Math.sin(f / 22 + i * 1.7)}px)` }}>
              <div style={{ width: r * 2, height: r * 2, borderRadius: r, overflow: "hidden", position: "relative", border: `7px ${on ? "solid" : "dashed"} ${on ? col : "rgba(255,255,255,0.2)"}`, boxSizing: "border-box", transform: `scale(${on ? p : 0.55})`, boxShadow: on ? `0 0 70px ${col}55` : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {on && <Img src={staticFile(`flags/${it.flag}.svg`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                {on && <div style={{ position: "absolute", inset: 0, background: "rgba(6,9,15,0.62)" }} />}
                {on && !small && (
                  <div style={{ position: "relative", textAlign: "center" }}>
                    <div style={{ color: theme.text, fontSize: Math.min(60, r * 0.24), fontWeight: 900, lineHeight: 1.05, textShadow: "0 4px 20px #000" }}>{it.label}</div>
                    <div style={{ color: theme.text, fontSize: Math.min(120, r * 0.42), fontWeight: 900, letterSpacing: -3, lineHeight: 1.05, textShadow: "0 4px 20px #000" }}>{fmt(it.value, format)}</div>
                  </div>
                )}
                {!on && <div style={{ color: theme.warm, fontSize: 80, fontWeight: 900, opacity: 0.7 }}>?</div>}
              </div>
              {on && small && <div style={{ color: theme.text, fontSize: 38, fontWeight: 900, textAlign: "center", lineHeight: 1.05, opacity: Math.min(1, p) }}>{it.label}<br /><span style={{ color: col }}>{fmt(it.value, format)}</span></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
