import { useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { SceneProps, rise, slam, usePop } from "./common";

export const Outro: React.FC<SceneProps> = () => {
  const f = useCurrentFrame();
  const p = usePop(0, 220);
  const p2 = usePop(8);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 50 }}>
      <div style={{ ...slam(p), fontSize: 150, fontWeight: 900, color: theme.text, letterSpacing: -5, textAlign: "center", lineHeight: 0.95 }}>
        MONEY,<br /><span style={{ color: theme.accent }}>MAPPED.</span>
      </div>
      <div style={{ ...rise(p2), transform: `scale(${1 + 0.04 * Math.sin(f / 4)})`, padding: "18px 50px", borderRadius: 999, border: `4px solid ${theme.accent}`, color: theme.accent, fontSize: 48, fontWeight: 800 }}>
        Follow for more
      </div>
    </div>
  );
};
