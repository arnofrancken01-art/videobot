import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import timeline from "./timeline.json";
import { theme } from "./theme";
import { Captions } from "./Captions";
import { Hook } from "./scenes/Hook";
import { Versus } from "./scenes/Versus";
import { Bars } from "./scenes/Bars";
import { BigNumber } from "./scenes/BigNumber";
import { LineScene } from "./scenes/LineScene";
import { Outro } from "./scenes/Outro";

export type Seg = (typeof timeline.segments)[number];

// Opeenvolgende segmenten met dezelfde scene (bv. "bars") worden 1 doorlopende scene.
const groups: { scene: string; segs: Seg[] }[] = [];
for (const s of timeline.segments) {
  const last = groups[groups.length - 1];
  if (last && last.scene === s.scene && s.scene === "bars") last.segs.push(s);
  else groups.push({ scene: s.scene, segs: [s] });
}

const fps = timeline.fps;

export const Video: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: theme.bg, fontFamily: theme.font }}>
    {groups.map((g, i) => {
      const from = i === 0 ? 0 : Math.round(g.segs[0].start * fps);
      const next = groups[i + 1];
      const to = next ? Math.round(next.segs[0].start * fps) : timeline.durationInFrames;
      const props = { segs: g.segs, data: timeline.data, fps, offset: from / fps };
      return (
        <Sequence key={i} from={from} durationInFrames={to - from}>
          {g.scene === "hook" && <Hook {...props} />}
          {g.scene === "versus" && <Versus {...props} />}
          {g.scene === "bars" && <Bars {...props} />}
          {g.scene === "bignumber" && <BigNumber {...props} />}
          {g.scene === "line" && <LineScene {...props} />}
          {g.scene === "outro" && <Outro {...props} />}
        </Sequence>
      );
    })}
    <Captions segments={timeline.segments} fps={fps} />
    <div style={{ position: "absolute", bottom: 60, width: "100%", textAlign: "center", color: theme.muted, fontSize: 26, fontWeight: 500 }}>
      Source: {timeline.source.split(",")[0]}
    </div>
    <Audio src={staticFile("voice.wav")} />
  </AbsoluteFill>
);
