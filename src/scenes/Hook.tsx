import { AbsoluteFill } from "remotion";
import { theme } from "../theme";
import { Burger, SceneProps, fadeUp, usePop } from "./common";

export const Hook: React.FC<SceneProps> = ({ segs }) => {
  const p = usePop(0);
  const p2 = usePop(8);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 500 }}>
      <div style={{ transform: `scale(${p})` }}><Burger size={420} /></div>
      <div style={{ ...fadeUp(p2), color: theme.text, fontSize: 130, fontWeight: 900, letterSpacing: -3, marginTop: 30 }}>
        {(segs[0].props as { title: string }).title}
      </div>
    </AbsoluteFill>
  );
};
