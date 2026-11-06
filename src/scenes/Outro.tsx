import { AbsoluteFill } from "remotion";
import { theme } from "../theme";
import { SceneProps, fadeUp, usePop } from "./common";

export const Outro: React.FC<SceneProps> = () => {
  const p = usePop(0);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 500 }}>
      <div style={{ ...fadeUp(p), fontSize: 120, fontWeight: 900, color: theme.text, letterSpacing: -3, textAlign: "center", lineHeight: 1 }}>
        MONEY,<br /><span style={{ color: theme.accent }}>MAPPED.</span>
      </div>
    </AbsoluteFill>
  );
};
