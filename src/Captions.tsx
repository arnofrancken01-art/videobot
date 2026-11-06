import { useCurrentFrame } from "remotion";
import { theme } from "./theme";
import type { Seg } from "./Video";

// Toont 3-4 woorden tegelijk, het gesproken woord licht op.
export const Captions: React.FC<{ segments: Seg[]; fps: number }> = ({ segments, fps }) => {
  const t = useCurrentFrame() / fps;
  const seg = segments.find((s) => t >= s.start && t <= s.end + 0.2);
  if (!seg) return null;
  const words = seg.words;
  const idx = Math.max(0, words.findIndex((w) => t < w.end));
  const chunk = Math.floor(idx / 4) * 4;
  const shown = words.slice(chunk, chunk + 4);
  return (
    <div style={{ position: "absolute", top: 1330, width: "100%", padding: "0 80px", textAlign: "center", lineHeight: 1.15 }}>
      {shown.map((w, i) => {
        const active = chunk + i === idx;
        return (
          <span key={i} style={{
            fontSize: 72, fontWeight: 900, margin: "0 16px", display: "inline-block",
            color: active ? theme.accent : theme.text,
            transform: active ? "scale(1.08)" : "none",
            textShadow: "0 4px 18px rgba(0,0,0,0.6)",
          }}>{w.word}</span>
        );
      })}
    </div>
  );
};
