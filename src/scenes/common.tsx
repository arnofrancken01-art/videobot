import { useId } from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Seg } from "../Video";

export type SceneProps = { segs: Seg[]; fps: number; offset: number };

/** Getalnotatie, bv. {prefix:"$", decimals:2} -> $9.04, {suffix:"%"} -> 62% */
export type Fmt = { prefix?: string; suffix?: string; decimals?: number };
export const fmt = (v: number, f: Fmt = {}) => {
  const d = f.decimals ?? 0;
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  return `${v < 0 ? "-" : ""}${f.prefix ?? ""}${s}${f.suffix ?? ""}`;
};

/** Props van een segment, losjes getypeerd: elke scene leest wat ze nodig heeft. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const P = (s: Seg): any => s.props;

/** Frame (binnen de scene) waarop een woord uit het segment wordt uitgesproken. */
export const wordFrame = (seg: Seg, word: string | undefined, fps: number, offset: number) => {
  const w = word ? seg.words.find((x) => x.word.toLowerCase().replace(/[^a-z0-9$]/g, "").startsWith(word.toLowerCase())) : undefined;
  return Math.round(((w ? w.start : seg.start) - offset) * fps);
};

export const usePop = (delay = 0, stiffness = 180) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - delay, fps, config: { damping: 15, stiffness, mass: 0.6 } });
};
export const slam = (p: number) => ({
  opacity: Math.min(1, p * 2),
  transform: `scale(${interpolate(p, [0, 1], [1.6, 1])})`,
});
export const rise = (p: number) => ({
  opacity: Math.min(1, p * 1.5),
  transform: `translateY(${interpolate(p, [0, 1], [50, 0])}px)`,
});

/** Eenvoudige iconen, door code getekend (geen AI-beelden). */
export const Icon: React.FC<{ name?: string; size: number }> = ({ name, size }) => {
  const id = useId().replace(/:/g, "");
  if (name === "burger")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <path d="M12 44 Q50 4 88 44 Z" fill="#E7A33E" />
        <circle cx="35" cy="28" r="2" fill="#FFF3D6" /><circle cx="52" cy="22" r="2" fill="#FFF3D6" /><circle cx="66" cy="30" r="2" fill="#FFF3D6" />
        <rect x="10" y="47" width="80" height="7" rx="3" fill="#5DBB4A" />
        <rect x="12" y="56" width="76" height="6" rx="2" fill="#F2C230" />
        <rect x="10" y="64" width="80" height="11" rx="5" fill="#6B3A22" />
        <path d="M12 78 H88 Q88 92 50 92 Q12 92 12 78 Z" fill="#E7A33E" />
      </svg>
    );
  if (name === "globe")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke="#2BD47D" strokeWidth="5">
        <circle cx="50" cy="50" r="40" /><ellipse cx="50" cy="50" rx="18" ry="40" /><path d="M10 50 H90 M18 30 H82 M18 70 H82" />
      </svg>
    );
  if (name === "house")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        <path d="M15 48 L50 18 L85 48" fill="none" stroke="#2BD47D" strokeWidth="7" strokeLinejoin="round" />
        <rect x="25" y="46" width="50" height="38" rx="4" fill="#2BD47D" /><rect x="44" y="60" width="12" height="24" fill="#0B0F17" />
      </svg>
    );
  if (name === "clock")
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke="#2BD47D" strokeWidth="7" strokeLinecap="round">
        <circle cx="50" cy="50" r="38" /><path d="M50 28 V50 L66 60" />
      </svg>
    );
  // standaard: munt
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <defs><linearGradient id={id} x1="0" x2="1"><stop offset="0" stopColor="#FFD166" /><stop offset="1" stopColor="#E7A33E" /></linearGradient></defs>
      <circle cx="50" cy="50" r="40" fill={`url(#${id})`} /><circle cx="50" cy="50" r="30" fill="none" stroke="#B9822B" strokeWidth="4" />
      <text x="50" y="64" textAnchor="middle" fontSize="40" fontWeight="900" fill="#8A5A12" fontFamily="Inter">$</text>
    </svg>
  );
};

/** Vlag van een land (ISO-code met 2 letters, bv. "be"), uit het open-source pakket flag-icons. */
export const Flag: React.FC<{ code?: string; h: number }> = ({ code, h }) =>
  code ? (
    <Img src={staticFile(`flags/${code.toLowerCase()}.svg`)} style={{ height: h, width: (h * 4) / 3, borderRadius: h / 7, objectFit: "cover", boxShadow: "0 4px 14px rgba(0,0,0,0.4)", flexShrink: 0 }} />
  ) : null;
