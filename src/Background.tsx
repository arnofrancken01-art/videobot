import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "./theme";

// Altijd beweging op de achtergrond: een zachte gloed en een raster dat langzaam schuift.
export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const gx = 50 + 25 * Math.sin(f / 90);
  const gy = 35 + 15 * Math.cos(f / 110);
  return (
    <AbsoluteFill style={{ backgroundColor: theme.bg }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${gx}% ${gy}%, rgba(43,212,125,0.16), transparent 55%)` }} />
      <AbsoluteFill style={{
        backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 2px, transparent 2px)",
        backgroundSize: "60px 60px",
        backgroundPosition: `0px ${(f * 0.6) % 60}px`,
        maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
      }} />
    </AbsoluteFill>
  );
};
