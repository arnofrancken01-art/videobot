import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import timeline from "./timeline.json";
import { STAGE, theme } from "./theme";
import { Background } from "./Background";
import { Captions } from "./Captions";
import { HOLD, DOCK, Headline } from "./Headline";
import { Globe } from "./Globe";
import { Versus } from "./scenes/Versus";
import { Bars } from "./scenes/Bars";
import { BigNumber } from "./scenes/BigNumber";
import { Hook } from "./scenes/Hook";
import { LineScene } from "./scenes/LineScene";
import { Outro } from "./scenes/Outro";
import { Rank } from "./scenes/Rank";
import { Quiz } from "./scenes/Quiz";
import { Race } from "./scenes/Race";
import { Grid } from "./scenes/Grid";
import { Choice, Clues, TrueFalse } from "./scenes/Games";
import { Battle, Bubbles, Dots, Podium, Receipt, ThenNow, Ticker } from "./scenes/Charts";
import type { SceneProps } from "./scenes/common";

const SR = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

export type Seg = (typeof timeline.segments)[number];

const SCENES: Record<string, React.FC<SceneProps>> = {
  hook: Hook, versus: Versus, bars: Bars, bignumber: BigNumber, line: LineScene, outro: Outro, rank: Rank, quiz: Quiz, race: Race, grid: Grid,
  truefalse: TrueFalse, choice: Choice, clues: Clues, thennow: ThenNow, dots: Dots, podium: Podium, battle: Battle, ticker: Ticker, receipt: Receipt, bubbles: Bubbles,
};

// Opeenvolgende segmenten met dezelfde scene worden 1 doorlopende scene.
const groups: { scene: string; segs: Seg[] }[] = [];
for (const s of timeline.segments) {
  const last = groups[groups.length - 1];
  if (last && last.scene === s.scene && ["bars", "versus", "line", "rank", "quiz", "race", "grid", "truefalse", "choice", "clues", "thennow", "dots", "podium", "battle", "ticker", "receipt", "bubbles"].includes(s.scene)) last.segs.push(s);
  else groups.push({ scene: s.scene, segs: [s] });
}

const fps = timeline.fps;

// Geluidseffecten: whoosh bij elke scenewissel, pop bij het onthullen, boem + ding bij nummer 1.
type Fx = { at: number; src: string; vol: number };
const fx: Fx[] = [];
const wordAt = (s: Seg, w?: string) => {
  const hit = w ? s.words.find((x) => SR(x.word).startsWith(SR(w))) : undefined;
  return hit ? hit.start : null;
};
timeline.segments.forEach((s, i) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = s.props;
  const prev = timeline.segments[i - 1];
  if (i > 0 && (prev.scene !== s.scene || p.rank || p.options || p.statement || p.question || p.then)) fx.push({ at: s.start - 0.12, src: "whoosh", vol: 0.35 });
  if (s.scene === "rank" && p.rank) {
    const t = Math.min(wordAt(s, String(p.label).split(/[\s-]/)[0]) ?? s.start, s.start + 1.2);
    if (p.rank === 1) {
      fx.push({ at: t, src: "boom", vol: 0.55 });
      fx.push({ at: t + 0.05, src: "ding", vol: 0.3 });
    } else fx.push({ at: t, src: "pop", vol: 0.45 });
  }
  if (s.scene === "grid" && p.row) fx.push({ at: Math.min(wordAt(s, p.at) ?? s.start, s.start + 1.2), src: "pop", vol: 0.45 });
  if (s.scene === "versus" && p.item) fx.push({ at: wordAt(s, p.at) ?? s.start, src: "pop", vol: 0.45 });
  if (s.scene === "bignumber" || s.scene === "hook") {
    const t = s.scene === "hook" ? s.start : Math.min(wordAt(s, p.at) ?? s.start, s.start + 0.5);
    fx.push({ at: t, src: "pop", vol: 0.45 });
  }
});

// Denktijd: tik per seconde zolang de timer loopt, ding + klap bij de onthulling.
timeline.segments.forEach((s, i) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nxt: any = timeline.segments[i + 1];
  if (!nxt?.props?.reveal) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((s.props as any).pause) for (let t = nxt.start - 1; t >= s.end - 0.05; t -= 1) fx.push({ at: t, src: "tick", vol: 0.5 });
  fx.push({ at: nxt.start, src: "ding", vol: 0.35 });
  fx.push({ at: nxt.start, src: "boom", vol: 0.3 });
});
// Losse onthullingen in de nieuwe scenes: een plop op het woord.
timeline.segments.forEach((s) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = s.props;
  if (!["clues", "dots", "podium", "battle", "ticker", "receipt", "bubbles"].includes(s.scene)) return;
  if (!(p.clue || p.part || p.place || p.stat || p.item || p.line || p.total)) return;
  const t = Math.min(wordAt(s, p.at) ?? s.start, s.start + 1.2);
  if (p.place === 1 || p.total) { fx.push({ at: t, src: "boom", vol: 0.5 }); fx.push({ at: t + 0.05, src: "ding", vol: 0.3 }); }
  else fx.push({ at: t, src: "pop", vol: 0.45 });
});
// Balkenrace: zacht getik terwijl de jaren lopen, klap op het einde.
groups.filter((g) => g.scene === "race").forEach((g) => {
  const a = g.segs[0].start + 0.5, b = g.segs[g.segs.length - 1].end - 0.9;
  for (let t = a; t < b; t += 0.5) fx.push({ at: t, src: "tick", vol: 0.12 });
  fx.push({ at: b, src: "boom", vol: 0.4 });
});

// Achtergrondvlag: de vlag van het land waar het nu over gaat, groot en wazig.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flagOf = (s: Seg): string | undefined => { const p: any = s.props; return p.flag ?? p.item?.flag; };
const flags: { from: number; to: number; code: string }[] = [];
// Duel: de bol en de achtergrond gaan telkens naar het land dat de ronde wint.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const duel: any = timeline.segments.find((s) => s.scene === "battle" && (s.props as any).a)?.props;
timeline.segments.forEach((s, i) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const st: any = (s.props as any).stat;
  // Raadspel: bij de onthulling naar het land dat de ronde wint.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q: any = (s.props as any).reveal ? timeline.segments.slice(0, i).reverse().find((x) => (x.props as any).options)?.props : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const qv: number[] = q?.options?.every((o: any) => typeof o.value === "number" && o.flag) ? q.options.map((o: any) => o.value) : [];
  const code = s.scene === "battle" && st && duel
    ? ((st.pick === "lower" ? st.a < st.b : st.a > st.b) ? duel.a.flag : duel.b.flag)
    : qv.length ? q.options[qv.indexOf(q.pick === "lower" ? Math.min(...qv) : Math.max(...qv))].flag
    : flagOf(s);
  if (!code) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = s.props;
  const reveal = p.reveal ? (wordAt(s, p.at) ?? s.start) : p.stat ? Math.min(wordAt(s, p.at) ?? s.start, s.start + 1.2) : p.rank ? Math.min(wordAt(s, String(p.label).split(/[\s-]/)[0]) ?? s.start, s.start + 1.2) : s.start;
  const from = Math.round(reveal * fps);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nxt = timeline.segments.slice(i + 1).find((x) => flagOf(x) || (x.props as any).stat || (x.props as any).options || x.scene !== s.scene);
  const to = nxt ? Math.round(nxt.start * fps) + 8 : timeline.durationInFrames;
  flags.push({ from, to, code });
});
const FlagGlow: React.FC<{ code: string; dur: number }> = ({ code, dur }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8, dur - 8, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: o * 0.42, maskImage: "linear-gradient(180deg, black 0%, black 50%, transparent 72%)" }}>
      <Img src={staticFile(`flags/${code}.svg`)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(14px) saturate(1.35)", transform: `scale(${1.15 + 0.08 * (f / dur)})` }} />
    </AbsoluteFill>
  );
};
// Openingsbeeld: de eerste twee vlaggen uit de eerste scene, of wat de aflevering zelf opgeeft in cover.flags.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deepFlags = (v: any, out: string[] = []): string[] => {
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
    if (k === "flag" && typeof x === "string") { if (!out.includes(x)) out.push(x); } else deepFlags(x, out);
  }
  return out;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cover: { flags?: string[]; vs?: boolean } = (timeline as any).cover ?? {};
const coverFlags: string[] = (cover.flags ?? deepFlags(groups[0].segs.map((s) => s.props))).slice(0, 2);
const coverVs = cover.vs ?? (coverFlags.length === 2 && ["battle", "quiz", "versus"].includes(groups[0].scene));
// Klappen: op elke onthulling veert het hele beeld even in, bij een grote klap flitst het en vliegt er confetti.
const hits = [...new Map(fx.filter((e) => ["pop", "boom"].includes(e.src) && e.at > 0.6).map((e) => [Math.round(e.at * fps), { at: Math.round(e.at * fps), big: e.src === "boom" }])).values()]
  .sort((a, b) => a.at - b.at);
const bigAt = new Set(fx.filter((e) => e.src === "boom" && e.at > 0.6).map((e) => Math.round(e.at * fps)));
hits.forEach((h) => { h.big = bigAt.has(h.at); });
const Punch: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const f = useCurrentFrame();
  const h = [...hits].reverse().find((x) => x.at <= f);
  const d = h ? Math.exp(-(f - h.at) / 3.5) : 0;
  const amp = h?.big ? 0.07 : 0.035;
  const shake = h?.big ? d * 10 * Math.sin((f - h.at) * 2.4) : 0;
  return <AbsoluteFill style={{ transform: `scale(${1 + amp * d}) translateX(${shake}px)` }}>{children}</AbsoluteFill>;
};
const CONFETTI = ["#FFE14A", "#2BD47D", "#FF5C8A", "#6EA8FE", "#FFFFFF"];
const Burst: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "#FFFFFF", opacity: Math.max(0, 0.32 - f * 0.06) }} />
      {[...Array(46)].map((_, i) => {
        const a = (i * 137.5 * Math.PI) / 180, v = 700 + ((i * 53) % 700);
        const x = 540 + Math.cos(a) * v * t * 0.9, y = 760 + Math.sin(a) * v * t * 0.7 - 500 * t + 1500 * t * t;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 22, height: 34, borderRadius: 5, background: CONFETTI[i % 5], opacity: Math.max(0, 1 - t / 1.3), transform: `rotate(${i * 40 + f * (8 + (i % 7))}deg)` }} />;
      })}
    </AbsoluteFill>
  );
};
const topic: string = (timeline as { topic?: string }).topic
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ?? (timeline.segments.find((s) => s.scene === "rank")?.props as any)?.title ?? "";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const headline: string = (timeline as any).headline ?? topic;
const OVERLAP = 6; // frames waarin twee scenes in elkaar overvloeien

// Elke scene komt binnen met een veer, zoomt traag in en vloeit weg in de volgende.
const Stage: React.FC<{ dur: number; first: boolean; children: React.ReactNode }> = ({ dur, first, children }) => {
  const f = useCurrentFrame();
  const { fps: vfps } = useVideoConfig();
  const enter = first ? interpolate(f, [HOLD, HOLD + DOCK], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : spring({ frame: f, fps: vfps, config: { damping: 16, stiffness: 160 } });
  const exit = interpolate(f, [dur - OVERLAP, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(enter, [0, 1], [0.9, 1]) * (1 + 0.04 * (f / dur)) * interpolate(exit, [0, 1], [1.08, 1]);
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, top: STAGE.top, height: STAGE.height,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: Math.min(enter * 1.5, exit), transform: `scale(${scale})`,
      filter: `blur(${(1 - exit) * 12}px)`,
    }}>
      {children}
    </div>
  );
};

export const Video: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: theme.font }}>
    <Background />
    {flags.map((g, i) => (
      <Sequence key={`flag${i}`} from={g.from} durationInFrames={g.to - g.from}>
        <FlagGlow code={g.code} dur={g.to - g.from} />
      </Sequence>
    ))}
    <Globe keys={flags.map((g) => ({ from: Math.max(g.from, HOLD), code: g.code }))} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, transparent 62%, rgba(5,11,28,0.55) 100%)" }} />
    <Punch>
    {groups.map((g, i) => {
      const from = i === 0 ? 0 : Math.round(g.segs[0].start * fps);
      const next = groups[i + 1];
      const to = next ? Math.round(next.segs[0].start * fps) + OVERLAP : timeline.durationInFrames;
      const Scene = SCENES[g.scene];
      if (!Scene) throw new Error(`Onbekende scene: ${g.scene}`);
      return (
        <Sequence key={i} from={from} durationInFrames={to - from}>
          <Stage dur={next ? to - from : 99999} first={i === 0}>
            <Scene segs={g.segs} fps={fps} offset={from / fps} />
          </Stage>
        </Sequence>
      );
    })}
    </Punch>
    {hits.filter((h) => h.big).map((h) => (
      <Sequence key={`burst${h.at}`} from={h.at} durationInFrames={42}><Burst /></Sequence>
    ))}
    <Headline text={headline} flags={coverFlags} vs={coverVs} />
    <Captions segments={timeline.segments} fps={fps} />
    <div style={{ position: "absolute", bottom: 44, width: "100%", textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 24, fontWeight: 700, textShadow: "0 2px 8px #000" }}>
      Money, Mapped · Source: {timeline.source.split(",")[0]}
    </div>
    <Audio src={staticFile("voice.wav")} />
    <Audio src={staticFile("sfx/bed.mp3")} volume={(fr) => 0.16 * Math.min(1, (timeline.durationInFrames - fr) / 12)} loop />
    <Sequence from={0} durationInFrames={fps * 2}><Audio src={staticFile("sfx/boom.wav")} volume={0.45} /></Sequence>
    <Sequence from={HOLD} durationInFrames={fps * 2}><Audio src={staticFile("sfx/whoosh.wav")} volume={0.4} /></Sequence>
    {fx.map((e, i) => (
      <Sequence key={`fx${i}`} from={Math.max(0, Math.round(e.at * fps))} durationInFrames={fps * 2}>
        <Audio src={staticFile(`sfx/${e.src}.wav`)} volume={e.vol} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
