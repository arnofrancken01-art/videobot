import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { SceneProps, fadeUp, usePop } from "./common";

export const BigNumber: React.FC<SceneProps> = ({ segs }) => {
  const f = useCurrentFrame();
  const { value, suffix, caption } = segs[0].props as { value: number; suffix: string; caption: string };
  const v = interpolate(f, [0, 35], [0, value], { extrapolateRight: "clamp" });
  const p = usePop(0);
  const shown = Number.isInteger(value) ? Math.round(v).toString() : v.toFixed(1);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 480 }}>
      <div style={{ ...fadeUp(p), color: value < 0 ? theme.warm : theme.accent, fontSize: 330, fontWeight: 900, letterSpacing: -12 }}>
        {shown}{suffix}
      </div>
      <div style={{ ...fadeUp(p), color: theme.muted, fontSize: 48, fontWeight: 700 }}>{caption}</div>
    </AbsoluteFill>
  );
};
