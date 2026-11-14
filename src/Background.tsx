import { AbsoluteFill, useCurrentFrame } from "remotion";

// Diepblauw in plaats van zwart, met twee lichtvlekken die traag bewegen en een raster dat schuift.
export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const gx = 50 + 30 * Math.sin(f / 70);
  const gy = 30 + 12 * Math.cos(f / 90);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #0C1E52 0%, #091437 45%, #050B1C 100%)" }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${gx}% ${gy}%, rgba(43,212,125,0.30), transparent 48%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${100 - gx}% ${gy + 28}%, rgba(64,120,255,0.38), transparent 50%)` }} />
      <AbsoluteFill style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 2px, transparent 2px)",
        backgroundSize: "60px 60px",
        backgroundPosition: `0px ${(f * 0.8) % 60}px`,
        maskImage: "linear-gradient(to bottom, transparent, black 20%, black 60%, transparent 70%)",
      }} />
    </AbsoluteFill>
  );
};
