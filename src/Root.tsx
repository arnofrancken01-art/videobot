import { Composition } from "remotion";
import { Video } from "./Video";
import timeline from "./timeline.json";

export const Root: React.FC = () => (
  <Composition
    id="Short"
    component={Video}
    durationInFrames={timeline.durationInFrames}
    fps={timeline.fps}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    width={(timeline as any).long ? 1920 : 1080}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    height={(timeline as any).long ? 1080 : 1920}
  />
);
