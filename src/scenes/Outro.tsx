import { useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { outline } from "../Headline";
import { SceneProps, rise, slam, usePop } from "./common";

/**
 * Slot: de vraag aan de kijker staat groot in beeld, met een pijl naar de reacties.
 * Geen "Follow for more": de video loopt hierna vanzelf opnieuw en de vraag is de aanloop naar de eerste zin.
 */
export const Outro: React.FC<SceneProps> = ({ segs }) => {
  const f = useCurrentFrame();
  const p = usePop(0, 220);
  const p2 = usePop(8);
  const q = segs[0].text.replace(/\s*Follow for more\.?\s*$/i, "").trim();
  const size = q.length > 34 ? 96 : q.length > 22 ? 116 : 140;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 56, width: 960 }}>
      <div style={{ ...slam(p), fontSize: size, fontWeight: 900, color: "#FFFFFF", letterSpacing: -size / 30, textAlign: "center", lineHeight: 1.0, textTransform: "uppercase", textShadow: `${outline(8)}, 0 16px 50px rgba(0,0,0,0.8)` }}>
        {q}
      </div>
      <div style={{ ...rise(p2), display: "flex", alignItems: "center", gap: 20, padding: "20px 48px", borderRadius: 999, background: theme.pop, color: "#000", fontSize: 54, fontWeight: 900, boxShadow: `0 0 70px ${theme.pop}88` }}>
        Comment your answer
        <svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `translateY(${6 * Math.sin(f / 3)}px)` }}><path d="M12 4 V20 M5 13 L12 20 L19 13" /></svg>
      </div>
      <div style={{ ...rise(usePop(22)), display: "flex", alignItems: "center", gap: 16, color: "#FFFFFF", fontSize: 44, fontWeight: 900, textShadow: `${outline(5)}` }}>
        <div style={{ padding: "8px 26px", borderRadius: 14, background: "#FF2D2D", textShadow: "none", transform: `scale(${1 + 0.05 * Math.sin(f / 4)})` }}>SUBSCRIBE</div>
        for the next round
      </div>
    </div>
  );
};
