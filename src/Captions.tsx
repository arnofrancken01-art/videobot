import { interpolate, spring, useCurrentFrame } from "remotion";
import { theme } from "./theme";
import type { Seg } from "./Video";

type W = { word: string; start: number; end: number };

// Maximaal 3 woorden per blok; een nieuw blok begint na een leesteken.
const chunk = (words: W[]) => {
  const out: W[][] = [];
  let cur: W[] = [];
  for (const w of words) {
    cur.push(w);
    if (cur.length === 3 || /[.,?!:;]$/.test(w.word)) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
};

export const Captions: React.FC<{ segments: Seg[]; fps: number }> = ({ segments, fps }) => {
  const f = useCurrentFrame();
  const t = f / fps;
  const chunks = segments.flatMap((s) => chunk(s.words));
  const ci = chunks.findIndex((c, i) => t >= c[0].start && t < (chunks[i + 1]?.[0].start ?? c[c.length - 1].end + 0.3));
  if (ci < 0) return null;
  const c = chunks[ci];
  const startF = Math.round(c[0].start * fps);
  const p = spring({ frame: f - startF, fps, config: { damping: 12, stiffness: 300, mass: 0.4 } });
  return (
    <div style={{
      position: "absolute", top: 1330, width: "100%", padding: "0 70px", textAlign: "center",
      transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})`, opacity: Math.min(1, p * 3),
    }}>
      {c.map((w, i) => {
        const active = t >= w.start && t < (c[i + 1]?.start ?? w.end + 0.3);
        return (
          <span key={i} style={{
            fontSize: 92, fontWeight: 900, margin: "0 14px", display: "inline-block", letterSpacing: -1,
            color: active ? theme.accent : theme.text,
            WebkitTextStroke: "3px rgba(0,0,0,0.35)",
            textShadow: "0 6px 24px rgba(0,0,0,0.7)",
          }}>{w.word.toUpperCase().replace(/[.,!:;]$/, "")}</span>
        );
      })}
    </div>
  );
};
