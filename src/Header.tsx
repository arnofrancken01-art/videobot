import { useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";

/**
 * Vult de bovenkant: kanaalnaam, onderwerp en een voortgangsbalk.
 * Blijft binnen 130 px van de zijkanten, zodat de knoppen van YouTube niets bedekken.
 */
export const Header: React.FC<{ topic: string }> = ({ topic }) => {
  const f = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = Math.min(1, f / (durationInFrames - 1));
  return (
    <div style={{ position: "absolute", top: 92, left: 130, right: 130, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, color: theme.accent, fontSize: 30, fontWeight: 900, letterSpacing: 6 }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: theme.accent, boxShadow: `0 0 18px ${theme.accent}` }} />
        MONEY, MAPPED
      </div>
      <div style={{ color: theme.text, fontSize: 44, fontWeight: 900, letterSpacing: -0.5, textAlign: "center", lineHeight: 1.05, textTransform: "uppercase" }}>{topic}</div>
      <div style={{ width: "100%", height: 10, borderRadius: 5, background: "rgba(255,255,255,0.10)", marginTop: 8, overflow: "hidden" }}>
        <div style={{ width: `${p * 100}%`, height: "100%", borderRadius: 5, background: `linear-gradient(90deg, ${theme.accent}, ${theme.warm})` }} />
      </div>
    </div>
  );
};
