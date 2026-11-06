import { theme } from "../theme";
import { Fmt, Icon, P, SceneProps, fmt, rise, slam, usePop, wordFrame } from "./common";

const Card: React.FC<{ label: string; value: string; color: string; at: number }> = ({ label, value, color, at }) => {
  const p = usePop(at, 260);
  return (
    <div style={{
      ...slam(p), background: theme.bgSoft, borderRadius: 40, padding: "34px 56px", width: 860, gap: 30,
      display: "flex", justifyContent: "space-between", alignItems: "center", border: `5px solid ${color}`,
      boxShadow: `0 0 80px ${color}33`,
    }}>
      <div style={{ color: theme.text, fontSize: 56, fontWeight: 800 }}>{label}</div>
      <div style={{ color, fontSize: 116, fontWeight: 900, letterSpacing: -4, whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
};

/**
 * Hook-scene: icoon of kop staat er meteen, daarna slaat per segment een kaart in
 * op het woord dat in props.at staat.
 * props: { icon?, headline?, item: {label, value}, at?: "woord", format? }
 */
export const Versus: React.FC<SceneProps> = ({ segs, fps, offset }) => {
  const first = P(segs[0]);
  const intro = usePop(0, 200);
  const colors = [theme.warm, theme.accent, "#6EA8FE", "#F778BA"];
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
      {first.icon && <div style={{ transform: `scale(${intro}) rotate(${(1 - intro) * -20}deg)` }}><Icon name={first.icon} size={340} /></div>}
      {first.headline && (
        <div style={{ ...rise(intro), color: theme.text, fontSize: 96, fontWeight: 900, letterSpacing: -3, textAlign: "center", lineHeight: 1.02, maxWidth: 940 }}>
          {first.headline}
        </div>
      )}
      {segs.map((s, i) => {
        const p = P(s);
        if (!p.item) return null;
        const f: Fmt = p.format ?? first.format ?? {};
        return <Card key={i} label={p.item.label} value={fmt(p.item.value, f)} color={colors[i % colors.length]} at={wordFrame(s, p.at, fps, offset)} />;
      })}
    </div>
  );
};
