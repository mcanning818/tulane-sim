import {Composition} from 'remotion';
import {TulaneIntro} from './TulaneIntro';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="TulaneIntro"
      component={TulaneIntro}
      durationInFrames={420}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{title: 'TULANE SIM', subtitle: 'Academic Quad to the LBC, on foot'}}
    />
  </>
);
