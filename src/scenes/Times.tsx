import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Burger, SceneProps, money, rise, slam, usePop } from "./common";

// "3.8x": 1 burger in Indonesië tegenover 3,8 burgers in Zwitserland, voor hetzelfde geld.
export const Times: React.FC<SceneProps> = ({ segs, data }) => {
  const f = useCurrentFrame();
  const { value } = segs[0].props as { value: number };
  const lo = data.bars.find((b) => b.code === "IDN")!;
  const hi = data.bars.find((b) => b.code === "CHE")!;
  const big = usePop(0, 220);
  const n = interpolate(f, [0, 20], [1, value], { extrapolateRight: "clamp" });
  const row = (label: string, price: number, count: number, color: string, delay: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: 900 }}>
      <div style={{ width: 260 }}>
        <div style={{ color: theme.text, fontSize: 40, fontWeight: 800 }}>{label}</div>
        <div style={{ color, fontSize: 52, fontWeight: 900 }}>{money(price)}</div>
      </div>
      {Array.from({ length: Math.ceil(count) }).map((_, i) => {
        const p = interpolate(f, [delay + i * 4, delay + i * 4 + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const clip = i + 1 > count ? count - i : 1;
        return <div key={i} style={{ transform: `scale(${p})` }}><Burger size={150} clip={clip} /></div>;
      })}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
      <div style={{ ...slam(big), color: theme.accent, fontSize: 300, fontWeight: 900, letterSpacing: -12, lineHeight: 1 }}>{n.toFixed(1)}x</div>
      <div style={{ ...rise(big), color: theme.muted, fontSize: 44, fontWeight: 700, marginBottom: 30 }}>the price, same burger</div>
      {row(lo.label, lo.value, 1, theme.accent, 6)}
      {row(hi.label, hi.value, hi.value / lo.value, theme.warm, 12)}
    </div>
  );
};
