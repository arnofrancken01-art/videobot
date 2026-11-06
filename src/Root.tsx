import { Composition } from "remotion";
import { Video } from "./Video";
import timeline from "./timeline.json";

export const Root: React.FC = () => (
  <Composition
    id="Short"
    component={Video}
    durationInFrames={timeline.durationInFrames}
    fps={timeline.fps}
    width={1080}
    height={1920}
  />
);
