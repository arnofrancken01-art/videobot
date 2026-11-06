import { theme } from "../theme";
import { Burger, SceneProps, money, slam, usePop, wordFrame } from "./common";

const Card: React.FC<{ label: string; value: number; color: string; at: number }> = ({ label, value, color, at }) => {
  const p = usePop(at, 260);
  return (
    <div style={{
      ...slam(p), background: theme.bgSoft, borderRadius: 40, padding: "34px 56px", width: 860, gap: 30,
      display: "flex", justifyContent: "space-between", alignItems: "center", border: `5px solid ${color}`,
      boxShadow: `0 0 80px ${color}33`,
    }}>
      <div style={{ color: theme.text, fontSize: 56, fontWeight: 800 }}>{label}</div>
      <div style={{ color, fontSize: 120, fontWeight: 900, letterSpacing: -4 }}>{money(value)}</div>
    </div>
  );
};

// Hook: burger staat er meteen, prijzen slaan in op het moment dat ze uitgesproken worden.
export const Versus: React.FC<SceneProps> = ({ segs, data, fps, offset }) => {
  const burger = usePop(0, 200);
  const cards = segs.flatMap((s) =>
    Object.entries((s.props as unknown as { at: Record<string, string> }).at).map(([code, word]) => ({ code, at: wordFrame(s, word, fps, offset) })),
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      <div style={{ transform: `scale(${burger}) rotate(${(1 - burger) * -20}deg)` }}><Burger size={380} /></div>
      {cards.map((c, i) => {
        const b = data.bars.find((x) => x.code === c.code)!;
        return <Card key={c.code} label={b.label} value={b.value} color={i === 0 ? theme.warm : theme.accent} at={c.at} />;
      })}
    </div>
  );
};
