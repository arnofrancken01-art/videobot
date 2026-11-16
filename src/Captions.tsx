import { useCurrentFrame } from "remotion";
import { theme } from "./theme";
import { outline } from "./Headline";
import type { Seg } from "./Video";

type W = { word: string; start: number; end: number };

// Maximaal 3 woorden (en ca. 16 letters) per blok; een nieuw blok begint na een leesteken.
const chunk = (words: W[]) => {
  const out: W[][] = [];
  let cur: W[] = [];
  for (const w of words) {
    const len = cur.reduce((n, x) => n + x.word.length + 1, 0);
    if (cur.length && (cur.length === 3 || len + w.word.length > 17)) { out.push(cur); cur = []; }
    cur.push(w);
    if (/[.,?!:;]$/.test(w.word)) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
};

export const Captions: React.FC<{ segments: Seg[]; fps: number; wide?: boolean }> = ({ segments, fps, wide }) => {
  const f = useCurrentFrame();
  const t = f / fps;
  const chunks = segments.flatMap((s) => chunk(s.words));
  const ci = chunks.findIndex((c, i) => t >= c[0].start && t < (chunks[i + 1]?.[0].start ?? c[c.length - 1].end + 0.3));
  if (ci < 0) return null;
  const c = chunks[ci];
  return (
    <div style={{
      position: "absolute", top: wide ? 880 : 1330, left: wide ? 1040 : 0, width: wide ? 870 : "100%", padding: wide ? 0 : "0 70px", textAlign: "center", boxSizing: "border-box",
    }}>
      {c.map((w, i) => {
        const active = t >= w.start && t < (c[i + 1]?.start ?? w.end + 0.3);
        return (
          <span key={i} style={{
            fontSize: wide ? 72 : 100, fontWeight: 900, margin: wide ? "0 10px" : "0 14px", display: "inline-block", letterSpacing: -2, lineHeight: 1.05,
            color: active ? theme.pop : "#FFFFFF",
            transform: active ? "scale(1.08)" : undefined,
            textShadow: `${outline(8)}, 0 10px 30px rgba(0,0,0,0.8)`,
          }}>{w.word.toUpperCase().replace(/[.,!:;]$/, "")}</span>
        );
      })}
    </div>
  );
};
