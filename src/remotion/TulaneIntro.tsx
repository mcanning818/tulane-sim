import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Campus, CampusLights} from '../world/CampusScene';
import {PALETTE} from '../world/palette';
import {CameraRig} from './CameraRig';

export const TulaneIntro: React.FC<{title: string; subtitle: string}> = ({title, subtitle}) => {
  const {width, height} = useVideoConfig();
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{backgroundColor: PALETTE.sky}}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{fov: 55, near: 1, far: 3000}}
        style={{position: 'absolute'}}
      >
        <color attach="background" args={[PALETTE.sky]} />
        <fog attach="fog" args={[PALETTE.fog, 260, 900]} />
        <CampusLights intensity={1.05} />
        <Campus />
        <CameraRig />
      </ThreeCanvas>

      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: 110,
          background:
            'linear-gradient(180deg, rgba(6,20,32,0.3) 0%, rgba(6,20,32,0) 32%, rgba(6,20,32,0.6) 100%)',
        }}
      >
        <div
          style={{
            color: '#f2fbff',
            fontFamily: 'Trebuchet MS, Gill Sans, sans-serif',
            fontSize: 138,
            fontWeight: 800,
            letterSpacing: -4,
            lineHeight: 1,
            textShadow: '0 10px 44px rgba(0,20,40,0.6)',
            opacity: interpolate(frame, [24, 60], [0, 1], {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            translate: interpolate(frame, [24, 60], ['0px 40px', '0px 0px'], {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: '#c8ecfa',
            fontFamily: 'Trebuchet MS, Gill Sans, sans-serif',
            fontSize: 38,
            marginTop: 14,
            letterSpacing: 3,
            opacity: interpolate(frame, [48, 84], [0, 1], {
              easing: Easing.out(Easing.cubic),
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {subtitle}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
