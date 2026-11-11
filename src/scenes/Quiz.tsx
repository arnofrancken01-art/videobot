import { Img, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Fmt, P, SceneProps, fmt, wordFrame } from "./common";

/**
 * Raadspel "wie wint?": twee landen tegenover elkaar, een timer loopt af, dan de onthulling.
 * Een ronde = een segment met `options` (de vraag, met `pause` denktijd) + een segment met `reveal: true`.
 * props (vraag):   { question, options: [{label, flag, value}, {label, flag, value}], pick?: "lower", format?, pause }
 * props (reveal):  { reveal: true, at?: "woord" }
 */
type Opt = { label: string; flag: string; value: number };
type Round = { q: string; opts: Opt[]; win: number; start: number; think: number; reveal: number; format: Fmt };

export const buildRounds = (segs: SceneProps["segs"], fps: number, offset: number): Round[] => {
  const rounds: Round[] = [];
  let format: Fmt = {};
  segs.forEach((s, i) => {
    const p = P(s);
    if (p.format) format = p.format;
    if (p.options) {
      const vals = p.options.map((o: Opt) => o.value);
      const win = vals.indexOf(p.pick === "lower" ? Math.min(...vals) : Math.max(...vals));
      const nxt = segs[i + 1];
      const reveal = nxt && P(nxt).reveal ? wordFrame(nxt, P(nxt).at, fps, offset) : Math.round((s.end + 1 - offset) * fps);
      rounds.push({ q: p.question, opts: p.options, win, format, start: Math.round((s.start - offset) * fps), think: Math.round((s.end - offset) * fps), reveal });
    }
  });
  return rounds;
};

const Card: React.FC<{ o: Opt; side: number; enter: number; rev: number; won: boolean; format: Fmt; f: number; revealAt: number }> = ({ o, side, enter, rev, won, format, f, revealAt }) => {
  const n = interpolate(f, [revealAt, revealAt + 12], [o.value * 0.3, o.value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = interpolate(enter, [0, 1], [side * 1100, 0]);
  const scale = 1 + (won ? 0.05 : -0.04) * rev;
  const border = rev > 0.02 ? (won ? theme.accent : "rgba(255,255,255,0.12)") : "rgba(255,255,255,0.28)";
  return (
    <div style={{
      position: "relative", width: 940, height: 340, borderRadius: 44, overflow: "hidden",
      transform: `translateX(${x}px) scale(${scale})`, border: `6px solid ${border}`,
      boxShadow: won && rev > 0.02 ? `0 0 ${90 * rev}px ${theme.accent}88` : "0 20px 50px rgba(0,0,0,0.45)",
      filter: !won && rev > 0.02 ? `saturate(${1 - 0.75 * rev}) brightness(${1 - 0.4 * rev})` : "none",
    }}>
      <Img src={staticFile(`flags/${o.flag}.svg`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.05 + 0.04 * Math.sin(f / 40 + side)})` }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(6,9,15,0.90) 0%, rgba(6,9,15,0.62) 55%, rgba(6,9,15,0.30) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, padding: "0 50px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
        <div style={{ color: theme.text, fontSize: o.label.length > 12 ? 74 : 96, fontWeight: 900, letterSpacing: -3, lineHeight: 1, textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>{o.label}</div>
        <div style={{ height: 120, display: "flex", alignItems: "center" }}>
          {rev > 0.02 ? (
            <div style={{ color: won ? theme.accent : "#C3CAD6", fontSize: 112, fontWeight: 900, letterSpacing: -4, lineHeight: 1, transform: `scale(${interpolate(rev, [0, 1], [1.5, 1])})`, transformOrigin: "left center", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>{fmt(n, format)}</div>
          ) : (
            <div style={{ color: theme.warm, fontSize: 112, fontWeight: 900, lineHeight: 1, opacity: 0.6 + 0.4 * Math.sin(f / 5) }}>???</div>
          )}
        </div>
      </div>
      {won && rev > 0.02 && (
        <div style={{ position: "absolute", right: 36, top: 36, width: 110, height: 110, borderRadius: 55, background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${rev}) rotate(${(1 - rev) * -90}deg)` }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={theme.bg} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 L10 18 L20 6" /></svg>
        </div>
      )}
    </div>
  );
};

export const Quiz: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const rounds = buildRounds(segs, fps, offset);
  let ri = 0;
  rounds.forEach((r, i) => { if (f >= r.start - 2) ri = i; });
  const r = rounds[ri];
  const sp = (from: number, stiffness = 170, damping = 15) => spring({ frame: f - from, fps, config: { damping, stiffness, mass: 0.7 } });
  const enter = ri === 0 ? 1 : sp(r.start);
  const rev = f >= r.reveal ? sp(r.reveal, 220, 13) : 0;
  const thinking = f >= r.think && f < r.reveal;
  const left = Math.max(0, (r.reveal - f) / fps);
  const frac = thinking ? (r.reveal - f) / Math.max(1, r.reveal - r.think) : f < r.think ? 1 : 0;
  const R = 78, C = 2 * Math.PI * R;
  const qPop = ri === 0 ? 1 : sp(r.start, 200);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {rounds.length > 1 && rounds.map((x, i) => (
          <div key={i} style={{ width: i === ri ? 86 : 26, height: 26, borderRadius: 13, background: i < ri || (i === ri && rev > 0.5) ? theme.accent : i === ri ? theme.warm : "rgba(255,255,255,0.18)" }} />
        ))}
        {rounds.length > 1 && <div style={{ color: theme.muted, fontSize: 34, fontWeight: 800, marginLeft: 12, letterSpacing: 3 }}>ROUND {ri + 1}/{rounds.length}</div>}
      </div>
      <div style={{ color: theme.text, fontSize: 68, fontWeight: 900, letterSpacing: -2, textAlign: "center", lineHeight: 1.04, maxWidth: 960, textTransform: "uppercase", opacity: Math.min(1, qPop * 1.5), transform: `scale(${interpolate(qPop, [0, 1], [0.8, 1])})` }}>{r.q}</div>
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 26, marginTop: 6 }}>
        {r.opts.map((o, i) => (
          <Card key={`${ri}-${i}`} o={o} side={i === 0 ? -1 : 1} enter={enter} rev={rev} won={i === r.win} format={r.format} f={f} revealAt={r.reveal} />
        ))}
        <div style={{ position: "absolute", right: 60, top: "50%", width: 190, height: 190, marginTop: -95, borderRadius: 95, background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 40px rgba(0,0,0,0.6)", transform: `scale(${(rev > 0.02 ? interpolate(rev, [0, 1], [1, 0]) : enter) * (thinking ? 1 + 0.06 * Math.sin(f / 2.5) : 1)})` }}>
          <svg width="190" height="190" style={{ position: "absolute", transform: "rotate(-90deg)" }}>
            <circle cx="95" cy="95" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" />
            <circle cx="95" cy="95" r={R} fill="none" stroke={thinking ? theme.warm : theme.accent} strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
          </svg>
          <div style={{ color: thinking ? theme.warm : theme.text, fontSize: thinking ? 100 : 62, fontWeight: 900, letterSpacing: -2 }}>{thinking ? Math.ceil(left) : "VS"}</div>
        </div>
      </div>
    </div>
  );
};
