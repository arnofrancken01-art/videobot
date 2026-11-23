import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { Globe } from "./Globe";

/**
 * Het eerste beeld en de kop in één.
 * Frame 0: schermvullende vlaggen en de vraag van de video in reuzenletters (dat is wat een scroller ziet).
 * Na een halve seconde krimpt de vraag naar de bovenrand en blijft daar staan, zodat ook wie later
 * instapt of de video opnieuw ziet meteen weet waar het over gaat. Eronder loopt de voortgangsbalk.
 * Tekst: woorden tussen *sterretjes* worden geel.
 */
export const HOLD = 15; // frames dat het openingsbeeld blijft staan
export const DOCK = 10; // frames waarin de vraag naar boven schuift

const Words: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(/(\*[^*]+\*)/).filter(Boolean).map((part, i) =>
      part.startsWith("*") ? <span key={i} style={{ color: theme.pop }}>{part.slice(1, -1)}</span> : <span key={i}>{part}</span>,
    )}
  </>
);

export const outline = (w: number, c = "#000") =>
  [...Array(16)].map((_, i) => `${(Math.cos((i * Math.PI) / 8) * w).toFixed(1)}px ${(Math.sin((i * Math.PI) / 8) * w).toFixed(1)}px 0 ${c}`).join(", ");

export const Headline: React.FC<{ text: string; flags: string[]; vs: boolean; wide?: boolean; badge?: string }> = ({ text, flags, vs, wide, badge }) => {
  const f = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const dock = interpolate(f, [HOLD, HOLD + DOCK], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });
  const punch = spring({ frame: f + 4, fps, config: { damping: 11, stiffness: 240, mass: 0.6 } }); // staat er al op frame 0, veert nog na
  const progress = Math.min(1, f / (durationInFrames - 1));
  const long = text.replace(/\*/g, "").length > 20;
  const size = long ? 112 : 132;
  const posterY = wide ? (flags.length ? 560 : 620) : flags.length ? 800 : 1010;
  const y = interpolate(dock, [0, 1], [posterY, wide ? 34 : 84]);
  const scale = interpolate(dock, [0, 1], [0.92 + 0.08 * punch, wide ? 0.44 : long ? 0.5 : 0.52]);
  const posterO = 1 - dock;
  return (
    <AbsoluteFill>
      {/* Schermvullende vlaggen achter het openingsbeeld */}
      {posterO > 0.01 && (
        <AbsoluteFill style={{ opacity: posterO }}>
          {flags.length === 0 && (
            <>
              {/* Raadsel: geen vlag verklappen, wel een draaiende bol met een reusachtig vraagteken */}
              <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 36%, #2A6BFF 0%, #0C2470 50%, #050B1C 100%)" }} />
              <Globe keys={[]} {...(wide ? { cx: 960, cy: 330, r: 250, tilt: 0, w: 1920, h: 1080 } : { cx: 540, cy: 600, r: 390, tilt: 0 })} />
              <div style={{ position: "absolute", left: 0, right: 0, top: wide ? 90 : 290, textAlign: "center", color: theme.pop, fontSize: wide ? 420 : 620, fontWeight: 900, lineHeight: 1, textShadow: `${outline(14)}, 0 30px 90px rgba(0,0,0,0.8)`, transform: `scale(${0.85 + 0.15 * punch}) rotate(${-6 + 3 * Math.sin(f / 5)}deg)` }}>?</div>
            </>
          )}
          {flags.slice(0, 2).map((c, i, a) => (
            <AbsoluteFill key={c} style={{ clipPath: a.length === 2 ? (i === 0 ? "polygon(0 0, 100% 0, 0 100%)" : "polygon(100% 0, 100% 100%, 0 100%)") : undefined }}>
              <Img src={staticFile(`flags/${c}.svg`)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.06 + 0.05 * (f / HOLD)})`, filter: "saturate(1.15)" }} />
            </AbsoluteFill>
          ))}
          {flags.length > 0 && <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.62) 45%, rgba(0,0,0,0.78) 100%)" }} />}
          {flags.length > 0 && (
            <div style={{ position: "absolute", top: wide ? 170 : 330, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: vs ? 26 : 40, transform: `scale(${0.9 + 0.1 * punch})` }}>
              {flags.slice(0, 2).map((c, i, a) => (
                <div key={c} style={{ display: "flex", alignItems: "center", gap: 26 }}>
                  <Img src={staticFile(`flags/${c}.svg`)} style={{
                    height: a.length === 2 ? 270 : 360, width: a.length === 2 ? 405 : 540, objectFit: "cover", borderRadius: 30,
                    border: "8px solid #FFFFFF", boxShadow: "0 30px 80px rgba(0,0,0,0.7)", transform: `rotate(${a.length === 2 ? (i === 0 ? -5 : 5) : -3}deg)`,
                  }} />
                  {vs && i === 0 && a.length === 2 && (
                    <div style={{ width: 0, zIndex: 2, display: "flex", justifyContent: "center" }}>
                      <div style={{ padding: "10px 26px", borderRadius: 26, background: theme.pop, color: "#000", fontSize: 84, fontWeight: 900, letterSpacing: -3, transform: "rotate(-6deg)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }}>VS</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AbsoluteFill>
      )}
      {/* De vraag: eerst reusachtig in het midden, daarna vast bovenaan */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `translateY(${y}px) scale(${scale})`, transformOrigin: "top center" }}>
        <div style={{
          width: wide ? 1800 : 1000, textAlign: "center", color: "#FFFFFF", fontSize: size, fontWeight: 900, lineHeight: 1.0, letterSpacing: -size / 28,
          textTransform: "uppercase", textShadow: `${outline(9)}, 0 16px 50px rgba(0,0,0,0.8)`,
        }}>
          <Words text={text} />
          {/* Sticker onder de kop: reeks of belofte ("PART 3", "3 ROUNDS"). Geeft een reden om te blijven en een reeks om te volgen. */}
          {badge && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
              <div style={{
                padding: "10px 34px", borderRadius: 22, background: "#FF2D55", color: "#FFFFFF", fontSize: size * 0.5, fontWeight: 900, letterSpacing: 1,
                textShadow: "none", transform: `rotate(-3deg) scale(${0.9 + 0.1 * punch + (dock < 1 ? 0.04 * Math.sin(f / 3) : 0)})`, boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
              }}>{badge}</div>
            </div>
          )}
        </div>
      </div>
      {/* Voortgangsbalk: belooft dat het einde dichtbij is */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: "rgba(255,255,255,0.12)", opacity: dock }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", background: `linear-gradient(90deg, ${theme.accent}, ${theme.pop})`, boxShadow: `0 0 24px ${theme.pop}` }} />
      </div>
    </AbsoluteFill>
  );
};
