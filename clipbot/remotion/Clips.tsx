import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import timeline from "./timeline.json";

// Kleuren in de sfeer van Vice City: zonsondergang roze/oranje, met turquoise als accent.
const C = { pink: "#FF2E88", orange: "#FF9A3C", teal: "#2DE2E6", yellow: "#FFE14A", twitch: "#9146FF", ink: "#0A0612" };
const FONT = "Inter, sans-serif";
const BOX_TOP = 540; // bovenkant van het gameplaybeeld
const outline = (px: number, col = "#000") =>
  [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.3], [0, 1.3], [-1.3, 0], [1.3, 0]].map(([x, y]) => `${x * px}px ${y * px}px 0 ${col}`).join(",");

type W = { word: string; start: number; end: number };
type Item = { rank: number; src: string; bg: string; vertical: boolean; dur: number; start: number; streamer: string; login: string; title: string; words: W[] };
const tl = timeline as unknown as {
  fps: number; header: string; sub: string; handle: string; test: boolean;
  intro: { start: number; dur: number; from: number; src: string; bg: string; vertical: boolean };
  items: Item[]; voice: { src: string; start: number; dur: number }[]; outro: { start: number; dur: number };
};
const F = (s: number) => Math.round(s * tl.fps);

// Wazige kopie van de clip als achtergrond, met een warme gloed erover
const Backdrop: React.FC<{ bg: string; from?: number }> = ({ bg, from = 0 }) => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile(bg)} muted startFrom={F(from)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.15)" }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,6,18,0.92) 0%, rgba(40,8,40,0.55) 30%, rgba(10,6,18,0.35) 60%, rgba(10,6,18,0.9) 100%)" }} />
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 0%, ${C.pink}55 0%, transparent 60%)` }} />
  </AbsoluteFill>
);

// Het eigenlijke gameplaybeeld, met een lichte "punch-in" bij de start
const Gameplay: React.FC<{ src: string; vertical: boolean; from?: number; volume?: (f: number) => number; muted?: boolean }> = ({ src, vertical, from = 0, volume, muted }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 14, mass: 0.6 } });
  const scale = interpolate(pop, [0, 1], [1.08, 1]);
  if (vertical)
    return <OffthreadVideo src={staticFile(src)} startFrom={F(from)} muted={muted} volume={volume} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />;
  return (
    <div style={{ position: "absolute", top: BOX_TOP, left: 0, width: 1080, transform: `scale(${scale})`, boxShadow: `0 0 0 6px ${C.pink}, 0 0 60px ${C.pink}88, 0 30px 80px rgba(0,0,0,0.7)` }}>
      <OffthreadVideo src={staticFile(src)} startFrom={F(from)} muted={muted} volume={volume} style={{ width: 1080, display: "block" }} />
    </div>
  );
};

// Ondertitels van wat de streamer zegt: max 3 woorden, het actieve woord geel
const chunk = (words: W[]) => {
  const out: W[][] = [];
  let cur: W[] = [];
  for (const w of words) {
    const len = cur.reduce((n, x) => n + x.word.length + 1, 0);
    if (cur.length && (cur.length === 3 || len + w.word.length > 16 || w.start - cur[cur.length - 1].end > 0.6)) { out.push(cur); cur = []; }
    cur.push(w);
    if (/[.?!]$/.test(w.word)) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
};

const Captions: React.FC<{ words: W[]; top: number }> = ({ words, top }) => {
  const t = useCurrentFrame() / tl.fps;
  const chunks = chunk(words);
  const c = chunks.find((c, i) => t >= c[0].start - 0.05 && t < Math.min(c[c.length - 1].end + 0.35, chunks[i + 1]?.[0].start ?? 1e9));
  if (!c) return null;
  const chars = c.reduce((n, w) => n + w.word.length, 0);
  const size = 96 * (chars > 14 ? 0.8 : chars > 10 ? 0.9 : 1);
  const age = t - c[0].start;
  return (
    <div style={{ position: "absolute", top, width: "100%", padding: "0 60px", boxSizing: "border-box", textAlign: "center", transform: `scale(${interpolate(age, [0, 0.12], [0.85, 1], { extrapolateRight: "clamp" })})` }}>
      {c.map((w, i) => {
        const active = t >= w.start && t < (c[i + 1]?.start ?? w.end + 0.35);
        return (
          <span key={i} style={{ fontFamily: FONT, fontSize: size, fontWeight: 900, margin: "0 14px", display: "inline-block", letterSpacing: -2, lineHeight: 1.05,
            color: active ? C.yellow : "#fff", textShadow: `${outline(7)}, 0 8px 24px rgba(0,0,0,0.8)` }}>
            {w.word.toUpperCase().replace(/[.,!?:;"]+$/g, "").replace(/^["']+/, "")}
          </span>
        );
      })}
    </div>
  );
};

// Bovenbalk: rangnummer, streamer (met Twitch-link als bronvermelding) en de cliptitel
const Header: React.FC<{ it: Item }> = ({ it }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame: f, fps, config: { damping: 9, mass: 0.7 } });
  const slide = spring({ frame: f - 4, fps, config: { damping: 16 } });
  const n = tl.items.length;
  return (
    <>
      <div style={{ position: "absolute", top: 150, width: "100%", display: "flex", justifyContent: "center", gap: 14 }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: "#fff", padding: "10px 26px", borderRadius: 999, letterSpacing: 1,
          background: `linear-gradient(90deg, ${C.pink}, ${C.orange})`, boxShadow: `0 8px 30px ${C.pink}66` }}>{tl.header}</div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 40, color: C.ink, padding: "10px 22px", borderRadius: 999, background: C.teal }}>{tl.sub}</div>
      </div>
      <div style={{ position: "absolute", top: 240, left: 60, right: 60, display: "flex", alignItems: "center", gap: 34 }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 230, lineHeight: 0.9, letterSpacing: -10, fontStyle: "italic",
          transform: `scale(${interpolate(slam, [0, 1], [2.4, 1])}) rotate(-4deg)`, opacity: Math.min(1, slam * 2),
          backgroundImage: `linear-gradient(180deg, ${C.yellow} 0%, ${C.orange} 55%, ${C.pink} 100%)`, WebkitBackgroundClip: "text", color: "transparent",
          filter: "drop-shadow(0 10px 0 #000) drop-shadow(0 0 30px rgba(255,46,136,0.6))" }}>#{it.rank}</div>
        <div style={{ flex: 1, transform: `translateX(${interpolate(slide, [0, 1], [500, 0])}px)`, opacity: slide }}>
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 76, color: "#fff", letterSpacing: -2, lineHeight: 1, textShadow: outline(5) }}>{it.streamer}</div>
          <div style={{ display: "inline-block", marginTop: 12, fontFamily: FONT, fontWeight: 800, fontSize: 32, color: "#fff", background: C.twitch, padding: "6px 16px", borderRadius: 10 }}>twitch.tv/{it.login}</div>
          {it.title ? <div style={{ marginTop: 14, fontFamily: FONT, fontWeight: 800, fontSize: 36, color: "#fff", opacity: 0.92, lineHeight: 1.15, textShadow: outline(3),
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>"{it.title}"</div> : null}
        </div>
      </div>
      {/* voortgang: welke plaats we nu zien */}
      <div style={{ position: "absolute", top: 1560, width: "100%", display: "flex", justifyContent: "center", gap: 16 }}>
        {[...Array(n)].map((_, k) => {
          const r = n - k;
          const on = r === it.rank;
          return <div key={k} style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, width: 64, height: 64, borderRadius: 32, display: "flex", alignItems: "center", justifyContent: "center",
            color: on ? C.ink : r < it.rank ? "#ffffff88" : "#fff", background: on ? C.yellow : r < it.rank ? "rgba(255,255,255,0.12)" : C.pink,
            transform: on ? "scale(1.2)" : undefined }}>{r}</div>;
        })}
      </div>
    </>
  );
};

const ClipScene: React.FC<{ it: Item }> = ({ it }) => {
  // stem "Number three" zegt het nummer: de clip zelf even stiller zetten
  const callout = tl.voice.find((v) => v.src.endsWith(`r${it.rank}.wav`));
  const duckEnd = callout ? F(callout.dur + 0.1) : 0;
  const vol = (f: number) => (f < duckEnd ? 0.3 : interpolate(f, [duckEnd, duckEnd + 6], [0.3, 1], { extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill>
      <Backdrop bg={it.bg} />
      <Gameplay src={it.src} vertical={it.vertical} volume={vol} />
      {it.vertical ? <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.75) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 100%)" }} /> : null}
      <Header it={it} />
      <Captions words={it.words} top={it.vertical ? 1300 : 1340} />
      <Audio src={staticFile("sfx/whoosh.wav")} volume={0.5} />
      {it.rank === 1 ? <Sequence from={3}><Audio src={staticFile("sfx/boom.wav")} volume={0.6} /></Sequence> : null}
    </AbsoluteFill>
  );
};

// Haak: de beste seconden van nummer 1 als teaser, met grote tekst
const Intro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 10 } });
  const pop2 = spring({ frame: f - 14, fps, config: { damping: 10 } });
  const i = tl.intro;
  return (
    <AbsoluteFill>
      <Backdrop bg={i.bg} from={i.from} />
      <Gameplay src={i.src} vertical={i.vertical} from={i.from} volume={0.35} />
      <div style={{ position: "absolute", top: 170, width: "100%", textAlign: "center", transform: `scale(${interpolate(pop, [0, 1], [1.8, 1])}) rotate(-3deg)`, opacity: Math.min(1, pop * 2) }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 112, lineHeight: 0.95, color: "#fff", letterSpacing: -4, fontStyle: "italic", textShadow: `${outline(8)}, 0 0 40px ${C.pink}` }}>
          {tl.header.split(" ").slice(0, 2).join(" ")}<br />
          <span style={{ color: C.yellow }}>{tl.header.split(" ").slice(2).join(" ")}</span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1340, width: "100%", textAlign: "center", transform: `scale(${interpolate(pop2, [0, 1], [0.4, 1])})`, opacity: pop2 }}>
        <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 84, color: C.ink, background: C.yellow, padding: "12px 34px", borderRadius: 20, boxShadow: `0 10px 0 #000` }}>WAIT FOR #1 😳</span>
      </div>
      <Audio src={staticFile("sfx/boom.wav")} volume={0.45} />
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f, fps, config: { damping: 11 } });
  const last = tl.items[tl.items.length - 1];
  return (
    <AbsoluteFill>
      <Backdrop bg={last.bg} from={Math.max(0, last.dur - 2)} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30, transform: `scale(${interpolate(pop, [0, 1], [0.6, 1])})`, opacity: pop }}>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 96, color: "#fff", textAlign: "center", lineHeight: 1, letterSpacing: -3, textShadow: outline(7) }}>NEW TOP {tl.items.length}<br /><span style={{ color: C.yellow }}>EVERY DAY</span></div>
        <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 56, color: "#fff", background: "#E62117", padding: "16px 40px", borderRadius: 16, boxShadow: "0 10px 0 #000" }}>SUBSCRIBE {tl.handle}</div>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 40, color: "#fff", opacity: 0.9, textShadow: outline(3) }}>Which one was the best? 👇</div>
      </AbsoluteFill>
      <Audio src={staticFile("sfx/pop.wav")} volume={0.5} />
    </AbsoluteFill>
  );
};

export const Clips: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Sequence durationInFrames={F(tl.intro.dur)}><Intro /></Sequence>
    {tl.items.map((it) => (
      <Sequence key={it.rank} from={F(it.start)} durationInFrames={F(it.dur)}><ClipScene it={it} /></Sequence>
    ))}
    <Sequence from={F(tl.outro.start)} durationInFrames={F(tl.outro.dur)}><Outro /></Sequence>
    {tl.voice.map((v, k) => (
      <Sequence key={k} from={F(v.start)}><Audio src={staticFile(v.src)} volume={1} /></Sequence>
    ))}
    {tl.test ? <div style={{ position: "absolute", bottom: 40, left: 40, fontFamily: FONT, fontWeight: 900, fontSize: 36, color: "#fff", background: "#c00", padding: "6px 16px", borderRadius: 8 }}>TEST – NIET POSTEN</div> : null}
  </AbsoluteFill>
);
