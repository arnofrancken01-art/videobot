import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import timeline from "./timeline.json";
import { STAGE, theme } from "./theme";
import { Background } from "./Background";
import { Captions } from "./Captions";
import { Versus } from "./scenes/Versus";
import { Bars } from "./scenes/Bars";
import { Times } from "./scenes/Times";
import { Undervalued } from "./scenes/Undervalued";
import { LineScene } from "./scenes/LineScene";
import { Outro } from "./scenes/Outro";
import type { SceneProps } from "./scenes/common";

export type Seg = (typeof timeline.segments)[number];

const SCENES: Record<string, React.FC<SceneProps>> = {
  versus: Versus, bars: Bars, times: Times, undervalued: Undervalued, line: LineScene, outro: Outro,
};

// Opeenvolgende segmenten met dezelfde scene worden 1 doorlopende scene.
const groups: { scene: string; segs: Seg[] }[] = [];
for (const s of timeline.segments) {
  const last = groups[groups.length - 1];
  if (last && last.scene === s.scene) last.segs.push(s);
  else groups.push({ scene: s.scene, segs: [s] });
}

const fps = timeline.fps;
const OVERLAP = 6; // frames waarin twee scenes in elkaar overvloeien

// Elke scene komt binnen met een veer, zoomt traag in en vloeit weg in de volgende.
const Stage: React.FC<{ dur: number; first: boolean; children: React.ReactNode }> = ({ dur, first, children }) => {
  const f = useCurrentFrame();
  const { fps: vfps } = useVideoConfig();
  const enter = first ? 1 : spring({ frame: f, fps: vfps, config: { damping: 16, stiffness: 160 } });
  const exit = interpolate(f, [dur - OVERLAP, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = interpolate(enter, [0, 1], [0.9, 1]) * (1 + 0.04 * (f / dur)) * interpolate(exit, [0, 1], [1.08, 1]);
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, top: STAGE.top, height: STAGE.height,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: Math.min(enter * 1.5, exit), transform: `scale(${scale})`,
      filter: `blur(${(1 - exit) * 12}px)`,
    }}>
      {children}
    </div>
  );
};

export const Video: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: theme.font }}>
    <Background />
    {groups.map((g, i) => {
      const from = i === 0 ? 0 : Math.round(g.segs[0].start * fps);
      const next = groups[i + 1];
      const to = next ? Math.round(next.segs[0].start * fps) + OVERLAP : timeline.durationInFrames;
      const Scene = SCENES[g.scene];
      return (
        <Sequence key={i} from={from} durationInFrames={to - from}>
          <Stage dur={next ? to - from : 99999} first={i === 0}>
            <Scene segs={g.segs} data={timeline.data} fps={fps} offset={from / fps} />
          </Stage>
        </Sequence>
      );
    })}
    <Captions segments={timeline.segments} fps={fps} />
    <div style={{ position: "absolute", bottom: 70, width: "100%", textAlign: "center", color: theme.muted, fontSize: 26, fontWeight: 500 }}>
      Source: {timeline.source.split(",")[0]}
    </div>
    <Audio src={staticFile("voice.wav")} />
  </AbsoluteFill>
);
