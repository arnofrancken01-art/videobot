import { useId } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Seg } from "../Video";
import timeline from "../timeline.json";

export type SceneProps = { segs: Seg[]; data: typeof timeline.data; fps: number; offset: number };

/** Frame (binnen de scene) waarop een woord uit het segment wordt uitgesproken. */
export const wordFrame = (seg: Seg, word: string, fps: number, offset: number) => {
  const w = seg.words.find((x) => x.word.toLowerCase().startsWith(word.toLowerCase()));
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
export const money = (v: number) => `$${v.toFixed(2)}`;

export const Burger: React.FC<{ size: number; opacity?: number; clip?: number }> = ({ size, opacity = 1, clip = 1 }) => {
  const id = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity }}>
      <defs><clipPath id={id}><rect x="0" y="0" width={100 * clip} height="100" /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        <path d="M12 44 Q50 4 88 44 Z" fill="#E7A33E" />
        <circle cx="35" cy="28" r="2" fill="#FFF3D6" /><circle cx="52" cy="22" r="2" fill="#FFF3D6" /><circle cx="66" cy="30" r="2" fill="#FFF3D6" />
        <rect x="10" y="47" width="80" height="7" rx="3" fill="#5DBB4A" />
        <rect x="12" y="56" width="76" height="6" rx="2" fill="#F2C230" />
        <rect x="10" y="64" width="80" height="11" rx="5" fill="#6B3A22" />
        <path d="M12 78 H88 Q88 92 50 92 Q12 92 12 78 Z" fill="#E7A33E" />
      </g>
    </svg>
  );
};
