import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import { theme } from "./theme";
import { P, wordFrame, type SceneProps } from "./scenes/common";
import type { Seg } from "./Video";

/**
 * Echte foto's (hoofdfoto van een Wikipedia-artikel, vrije licentie) schermvullend achter de scene.
 * Nagebootst van de best bekeken weetjes-Shorts: elke 3 tot 5 seconden een nieuw, echt beeld dat traag inzoomt.
 * Het bestand komt van scripts/fetch_images.py in public/img/<slug>.jpg.
 */
export const slug = (s: string) => s.toLowerCase().replace(/^file:/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
export const imageOf = (s: Seg): string | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = s.props; const im = p?.image;
  if (!im) return null;
  return im.flag ? `flags/${im.flag}.svg` : `img/${slug(im.wiki ?? im.file ?? "")}.jpg`;
};

const KenBurns: React.FC<{ src: string; dur: number; dir: number }> = ({ src, dur, dir }) => {
  const f = useCurrentFrame();
  const t = f / Math.max(1, dur);
  const fade = interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const scale = 1.08 + 0.14 * t;
  const x = dir * (-30 + 60 * t);
  return (
    <AbsoluteFill style={{ opacity: fade, overflow: "hidden", background: "#000" }}>
      {/* wazige kopie vult de randen bij liggende foto's */}
      <Img src={staticFile(src)} style={{ position: "absolute", inset: -60, width: "calc(100% + 120px)", height: "calc(100% + 120px)", objectFit: "cover", filter: "blur(40px) brightness(0.55) saturate(1.3)" }} />
      <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translateX(${x}px)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.05) 28%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.75) 100%)" }} />
    </AbsoluteFill>
  );
};

export const PhotoLayer: React.FC<{ segments: Seg[]; fps: number; total: number }> = ({ segments, fps, total }) => {
  const shots = segments.map((s, i) => ({ s, i, img: imageOf(s) })).filter((x) => x.img);
  return (
    <>
      {shots.map((x, k) => {
        const from = Math.max(0, Math.round(x.s.start * fps) - 3);
        const nxt = shots[k + 1];
        // De foto blijft staan tot de volgende foto, of tot het einde van de eerstvolgende scene zonder foto.
        const after = segments.slice(x.i + 1).find((s) => imageOf(s) || s.scene !== x.s.scene);
        const end = nxt ? Math.round(nxt.s.start * fps) + 6 : after ? Math.round(after.start * fps) + 6 : total;
        return (
          <Sequence key={k} from={from} durationInFrames={Math.max(1, end - from)}>
            <KenBurns src={x.img!} dur={end - from} dir={k % 2 ? -1 : 1} />
          </Sequence>
        );
      })}
    </>
  );
};

const Hl: React.FC<{ text: string; size: number }> = ({ text, size }) => (
  <div style={{ fontSize: size, fontWeight: 900, lineHeight: 1.02, letterSpacing: -1, textAlign: "center", color: theme.text, textTransform: "uppercase",
    WebkitTextStroke: `${size * 0.06}px #000`, paintOrder: "stroke fill", textShadow: "0 8px 30px rgba(0,0,0,0.85)" }}>
    {text.split(/(\*[^*]+\*)/).map((part, i) => part.startsWith("*") ? <span key={i} style={{ color: theme.warm }}>{part.slice(1, -1)}</span> : <span key={i}>{part}</span>)}
  </div>
);

/** Scene `photo`: de tekst van het weetje slaat in op het woord `at`, met een rangnummer en vlag als die er zijn. */
export const PhotoFact: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const f = useCurrentFrame();
  const facts = segs.map((s) => ({ ...P(s), at: Math.min(wordFrame(s, P(s).at, fps, offset), Math.round((s.start - offset) * fps) + Math.round(fps * 0.9)), start: Math.round((s.start - offset) * fps) }));
  const cur = [...facts].reverse().find((x) => f >= x.start) ?? facts[0];
  const p = spring({ frame: f - cur.at, fps, config: { damping: 11, stiffness: 190, mass: 0.6 } });
  const on = f >= cur.at;
  const size = (cur.big ?? "").length > 22 ? 96 : 118;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, width: 1000 }}>
      {cur.num && (
        <div style={{ background: theme.warm, color: "#000", fontSize: 64, fontWeight: 900, borderRadius: 22, padding: "4px 30px", transform: `rotate(-4deg) scale(${interpolate(spring({ frame: f - cur.start, fps }), [0, 1], [0.4, 1])})` }}>#{cur.num}</div>
      )}
      {cur.kicker && (
        <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(0,0,0,0.55)", borderRadius: 18, padding: "8px 22px" }}>
          {cur.flag && <Img src={staticFile(`flags/${cur.flag}.svg`)} style={{ height: 52, borderRadius: 8 }} />}
          <span style={{ color: theme.text, fontSize: 50, fontWeight: 900, textTransform: "uppercase" }}>{cur.kicker}</span>
        </div>
      )}
      {cur.big && (
        <div style={{ opacity: on ? Math.min(1, p * 2) : 0, transform: `scale(${interpolate(p, [0, 1], [1.5, 1])}) rotate(${interpolate(p, [0, 1], [-3, 0])}deg)` }}>
          <Hl text={cur.big} size={size} />
        </div>
      )}
    </div>
  );
};
