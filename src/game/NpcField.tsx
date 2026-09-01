import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {PALETTE} from '../world/palette';
import {Avatar} from './Avatar';
import {NPCS} from './npcs';

export const NpcField: React.FC = () => {
  const markers = useRef<(THREE.Group | null)[]>([]);

  useFrame(({clock}) => {
    markers.current.forEach((m, i) => {
      if (!m) return;
      m.position.y = 2.95 + Math.sin(clock.elapsedTime * 2.2 + i) * 0.14;
      m.rotation.y = clock.elapsedTime * 1.2;
    });
  });

  return (
    <>
      {NPCS.map((npc, i) => (
        <group key={npc.id} position={[npc.x, 0, npc.z]} rotation={[0, npc.facing, 0]}>
          <Avatar shirt={npc.shirt} />
          <group
            ref={(g) => {
              markers.current[i] = g;
            }}
            position={[0, 2.95, 0]}
          >
            <mesh position={[0, 0.22, 0]}>
              <boxGeometry args={[0.16, 0.44, 0.16]} />
              <meshLambertMaterial color={PALETTE.accent} emissive={PALETTE.accent} emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, -0.12, 0]}>
              <boxGeometry args={[0.16, 0.16, 0.16]} />
              <meshLambertMaterial color={PALETTE.accent} emissive={PALETTE.accent} emissiveIntensity={0.5} />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
};
