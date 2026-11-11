import { Img, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Check, Cross, Flag, P, RED, SceneProps, TimerBar, Title, buildRoundsFor, currentRound, wordFrame } from "./common";

const useSp = (fps: number) => {
  const f = useCurrentFrame();
  return (from: number, stiffness = 190, damping = 14) => spring({ frame: f - from, fps, config: { damping, stiffness, mass: 0.7 } });
};
const Pill: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = theme.warm }) => (
  <div style={{ padding: "12px 34px", borderRadius: 999, background: color, color: theme.bg, fontSize: 40, fontWeight: 900, letterSpacing: 3 }}>{children}</div>
);

/**
 * Waar of niet waar: een stelling, de timer loopt, dan een stempel TRUE of FALSE met het echte cijfer.
 * props (stelling): { statement, answer: true|false, fact, flag?, pause }   daarna een segment { reveal: true }
 */
export const TrueFalse: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const sp = useSp(fps);
  const rounds = buildRoundsFor(segs, fps, offset, "statement");
  const ri = currentRound(rounds, f);
  const r = rounds[ri];
  const enter = ri === 0 ? 1 : sp(r.start);
  const rev = f >= r.reveal ? sp(r.reveal, 240, 11) : 0;
  const thinking = f >= r.think && f < r.reveal;
  const ans: boolean = r.p.answer;
  const Btn = ({ val }: { val: boolean }) => {
    const col = val ? theme.accent : RED;
    const hit = rev > 0.02 && ans === val;
    const miss = rev > 0.02 && ans !== val;
    const wob = thinking ? 1 + 0.04 * Math.sin(f / 3 + (val ? 0 : Math.PI)) : 1;
    return (
      <div style={{ flex: 1, height: 150, borderRadius: 36, border: `6px solid ${col}`, background: hit ? col : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", gap: 18, opacity: miss ? 0.25 : 1, transform: `scale(${hit ? 1 + 0.06 * rev : wob})`, boxShadow: hit ? `0 0 70px ${col}88` : "none" }}>
        {val ? <Check size={64} color={hit ? theme.bg : col} /> : <Cross size={58} color={hit ? theme.bg : col} />}
        <div style={{ color: hit ? theme.bg : col, fontSize: 70, fontWeight: 900, letterSpacing: 1 }}>{val ? "TRUE" : "FALSE"}</div>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, width: 940 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <Pill>TRUE OR FALSE?</Pill>
        {rounds.length > 1 && <div style={{ color: theme.muted, fontSize: 36, fontWeight: 800, letterSpacing: 3 }}>{ri + 1}/{rounds.length}</div>}
      </div>
      <div style={{ position: "relative", width: 940, minHeight: 400, borderRadius: 44, overflow: "hidden", border: "5px solid rgba(255,255,255,0.22)", display: "flex", alignItems: "center", justifyContent: "center", padding: "50px 54px", boxSizing: "border-box", transform: `scale(${interpolate(enter, [0, 1], [0.7, 1])}) rotate(${(1 - enter) * -6}deg)`, opacity: Math.min(1, enter * 1.5), boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
        {r.p.flag && <Img src={staticFile(`flags/${r.p.flag}.svg`)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.08 + 0.04 * Math.sin(f / 40)})` }} />}
        <div style={{ position: "absolute", inset: 0, background: r.p.flag ? "rgba(6,9,15,0.76)" : theme.bgSoft }} />
        <div style={{ position: "relative", color: theme.text, fontSize: String(r.p.statement).length > 48 ? 66 : 80, fontWeight: 900, letterSpacing: -2, lineHeight: 1.08, textAlign: "center", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>{r.p.statement}</div>
        {rev > 0.02 && (
          <div style={{ position: "absolute", padding: "6px 44px", border: `12px solid ${ans ? theme.accent : RED}`, borderRadius: 26, color: ans ? theme.accent : RED, fontSize: 170, fontWeight: 900, letterSpacing: 4, background: "rgba(6,9,15,0.88)", transform: `rotate(-11deg) scale(${interpolate(rev, [0, 1], [3, 1])})`, opacity: Math.min(1, rev * 2) }}>{ans ? "TRUE" : "FALSE"}</div>
        )}
      </div>
      <div style={{ display: "flex", gap: 26, width: 940 }}><Btn val={true} /><Btn val={false} /></div>
      <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {rev > 0.02
          ? <div style={{ color: theme.text, fontSize: 54, fontWeight: 900, textAlign: "center", lineHeight: 1.1, opacity: rev, transform: `translateY(${(1 - rev) * 30}px)` }}>{r.p.fact}</div>
          : <TimerBar f={f} think={r.think} reveal={r.reveal} fps={fps} />}
      </div>
    </div>
  );
};

/**
 * Meerkeuzevraag A/B/C met timer.
 * props (vraag): { question, options: ["..", "..", ".."], answer: 0|1|2, flag?, pause }   daarna { reveal: true }
 */
export const Choice: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const sp = useSp(fps);
  const rounds = buildRoundsFor(segs, fps, offset, "question");
  const ri = currentRound(rounds, f);
  const r = rounds[ri];
  const rev = f >= r.reveal ? sp(r.reveal, 240, 12) : 0;
  const thinking = f >= r.think && f < r.reveal;
  const qIn = ri === 0 ? 1 : sp(r.start);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, width: 940 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: Math.min(1, qIn * 1.5), transform: `scale(${interpolate(qIn, [0, 1], [0.8, 1])})` }}>
        {r.p.flag && <Flag code={r.p.flag} h={110} />}
        <Title size={String(r.p.question).length > 34 ? 62 : 74}>{r.p.question}</Title>
      </div>
      {(r.p.options as string[]).map((o, i) => {
        const inP = ri === 0 ? spring({ frame: f - 2 - i * 4, fps, config: { damping: 14, stiffness: 200 } }) : sp(r.start + i * 4);
        const ok = i === r.p.answer;
        const hit = rev > 0.02 && ok, miss = rev > 0.02 && !ok;
        const wob = thinking ? 1 + 0.015 * Math.sin(f / 3 + i * 2) : 1;
        return (
          <div key={`${ri}-${i}`} style={{ width: 940, height: 172, borderRadius: 40, boxSizing: "border-box", border: `6px solid ${hit ? theme.accent : "rgba(255,255,255,0.22)"}`, background: hit ? theme.accent : theme.bgSoft, display: "flex", alignItems: "center", gap: 30, padding: "0 34px", opacity: miss ? 0.3 : Math.min(1, inP * 2), transform: `translateX(${(1 - inP) * (i % 2 ? 300 : -300)}px) scale(${hit ? 1 + 0.05 * rev : wob})`, boxShadow: hit ? `0 0 80px ${theme.accent}88` : "none" }}>
            <div style={{ width: 104, height: 104, borderRadius: 30, background: hit ? theme.bg : ["#6EA8FE", "#F778BA", theme.warm, "#B18CFF"][i], color: hit ? theme.accent : theme.bg, fontSize: 68, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{"ABCD"[i]}</div>
            <div style={{ color: hit ? theme.bg : theme.text, fontSize: String(o).length > 14 ? 66 : 88, fontWeight: 900, letterSpacing: -2, flex: 1 }}>{o}</div>
            {hit && <div style={{ transform: `scale(${rev})` }}><Check size={90} /></div>}
          </div>
        );
      })}
      <div style={{ height: 80, display: "flex", alignItems: "center" }}>
        {rev > 0.02 && r.p.fact
          ? <div style={{ color: theme.text, fontSize: 50, fontWeight: 900, textAlign: "center", opacity: rev }}>{r.p.fact}</div>
          : <TimerBar f={f} think={r.think} reveal={r.reveal} fps={fps} />}
      </div>
    </div>
  );
};

/**
 * Raad het land: aanwijzingen slaan een voor een in, dan draait de vlag om.
 * props: { clue: {label, value}, pause? } ... en tot slot { reveal: true, label, flag }
 */
export const Clues: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const sp = useSp(fps);
  const clues = segs.filter((s) => P(s).clue);
  const rs = segs.find((s) => P(s).reveal);
  const reveal = rs ? Math.round((rs.start - offset) * fps) : 99999;
  const lastClue = clues[clues.length - 1];
  const think = Math.round((lastClue.end - offset) * fps);
  const rev = f >= reveal ? sp(reveal, 200, 11) : 0;
  const rp = rs ? P(rs) : {};
  const flip = interpolate(rev, [0, 1], [90, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: 940 }}>
      <Title size={70}>{P(segs[0]).title ?? "Guess the country"}</Title>
      <div style={{ width: 470, height: 320, perspective: 1200, marginTop: 4 }}>
        {rev > 0.02 ? (
          <div style={{ width: "100%", height: "100%", borderRadius: 40, overflow: "hidden", border: `8px solid ${theme.accent}`, boxShadow: `0 0 100px ${theme.accent}99`, transform: `rotateY(${flip}deg) scale(${1 + 0.05 * rev})`, boxSizing: "border-box" }}>
            <Img src={staticFile(`flags/${rp.flag}.svg`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ width: "100%", height: "100%", borderRadius: 40, border: "8px dashed rgba(255,255,255,0.3)", background: theme.bgSoft, display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", transform: `scale(${1 + 0.03 * Math.sin(f / 6)})` }}>
            <div style={{ color: theme.warm, fontSize: 230, fontWeight: 900, lineHeight: 1, textShadow: `0 0 60px ${theme.warm}88` }}>?</div>
          </div>
        )}
      </div>
      <div style={{ height: 96, display: "flex", alignItems: "center" }}>
        {rev > 0.02
          ? <div style={{ color: theme.accent, fontSize: 100, fontWeight: 900, letterSpacing: -3, lineHeight: 1, transform: `scale(${interpolate(rev, [0, 1], [1.6, 1])})` }}>{rp.label}</div>
          : f >= think ? <TimerBar f={f} think={think} reveal={reveal} fps={fps} width={700} /> : null}
      </div>
      {clues.map((s, i) => {
        const at = wordFrame(s, P(s).at, fps, offset);
        const p = sp(Math.min(at, Math.round((s.start - offset) * fps) + fps), 220, 14);
        const c = P(s).clue;
        const col = ["#6EA8FE", "#F778BA", theme.warm, "#B18CFF"][i % 4];
        return (
          <div key={i} style={{ width: 940, height: 128, borderRadius: 32, boxSizing: "border-box", borderLeft: `14px solid ${col}`, background: theme.bgSoft, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 34px", opacity: p < 0.02 ? 0.16 : Math.min(1, p * 2), transform: `scale(${p < 0.02 ? 1 : interpolate(p, [0, 1], [1.25, 1])})` }}>
            <div style={{ color: "#C3CAD6", fontSize: 42, fontWeight: 800 }}>{p < 0.02 ? `Clue ${i + 1}` : c.label}</div>
            <div style={{ color: p < 0.02 ? theme.muted : col, fontSize: 68, fontWeight: 900, letterSpacing: -2 }}>{p < 0.02 ? "?" : c.value}</div>
          </div>
        );
      })}
    </div>
  );
};
