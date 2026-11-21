import { Composition } from "remotion";
import { Clips } from "./Clips";
import timeline from "./timeline.json";

export const Root: React.FC = () => (
  <Composition id="Clips" component={Clips} durationInFrames={timeline.durationInFrames} fps={timeline.fps} width={1080} height={1920} />
);
