import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { SceneProps, fadeUp, money, usePop } from "./common";

const Card: React.FC<{ label: string; value: number; color: string; delay: number }> = ({ label, value, color, delay }) => {
  const f = useCurrentFrame();
  const p = usePop(delay);
  const v = interpolate(f, [delay, delay + 30], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ ...fadeUp(p), background: theme.bgSoft, borderRadius: 36, padding: "50px 40px", width: 440, textAlign: "center", border: `4px solid ${color}` }}>
      <div style={{ color: theme.muted, fontSize: 44, fontWeight: 700 }}>{label}</div>
      <div style={{ color, fontSize: 130, fontWeight: 900, letterSpacing: -4 }}>{money(v)}</div>
    </div>
  );
};

export const Versus: React.FC<SceneProps> = ({ segs, data, fps }) => {
  const { left, right } = segs[0].props as { left: string; right: string };
  const l = data.bars.find((b) => b.code === left)!;
  const r = data.bars.find((b) => b.code === right)!;
  const rDelay = Math.round((segs[0].words.find((w) => w.word.startsWith("less"))?.start ?? segs[0].start + 2) * fps - segs[0].start * fps);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 50, paddingBottom: 480, flexDirection: "column" }}>
      <Card label={l.label} value={l.value} color={theme.warm} delay={6} />
      <div style={{ color: theme.muted, fontSize: 60, fontWeight: 900 }}>vs</div>
      <Card label={r.label} value={r.value} color={theme.accent} delay={rDelay} />
    </AbsoluteFill>
  );
};
