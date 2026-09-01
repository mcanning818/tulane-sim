import {useEffect, useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {Campus, CampusLights} from '../world/CampusScene';
import {PALETTE} from '../world/palette';
import {CollectibleField} from './CollectibleField';
import {NpcField} from './NpcField';
import {Player} from './Player';
import {Dialogue} from './ui/Dialogue';
import {HUD} from './ui/HUD';
import {MinigameModal} from './ui/MinigameModal';
import {useGame} from './state';

const StartOverlay: React.FC = () => {
  const [locked, setLocked] = useState(false);
  const paused = useGame((s) => s.paused);

  useEffect(() => {
    const onChange = () => setLocked(Boolean(document.pointerLockElement));
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  if (locked || paused) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(180deg, rgba(4,12,20,0.55), rgba(4,12,20,0.18) 45%, rgba(4,12,20,0.5))',
        pointerEvents: 'none',
      }}
    >
      <div style={{textAlign: 'center', color: '#e9f4fb'}}>
        <div style={{fontSize: 46, fontWeight: 800, letterSpacing: -1}}>TULANE SIM</div>
        <div style={{fontSize: 15, opacity: 0.75, marginTop: 6}}>
          Academic Quad &rarr; McAlister Place &rarr; the LBC
        </div>
        <div
          style={{
            marginTop: 22,
            display: 'inline-block',
            padding: '12px 26px',
            border: '1px solid rgba(90,210,240,0.6)',
            borderRadius: 10,
            background: 'rgba(9,22,32,0.8)',
            fontSize: 15,
          }}
        >
          Click anywhere to play
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => (
  <div style={{position: 'relative', width: '100%', height: '100%'}}>
    <Canvas
      shadows={false}
      dpr={[1, 1.75]}
      camera={{fov: 62, near: 0.3, far: 1400, position: [0, 12, 52]}}
      gl={{antialias: true}}
    >
      <color attach="background" args={[PALETTE.sky]} />
      <fog attach="fog" args={[PALETTE.fog, 220, 780]} />
      <CampusLights />
      <Campus />
      <CollectibleField />
      <NpcField />
      <Player />
    </Canvas>
    <HUD />
    <Dialogue />
    <MinigameModal />
    <StartOverlay />
  </div>
);
