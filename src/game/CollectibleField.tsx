import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {PALETTE} from '../world/palette';
import {COLLECTIBLES, type Collectible} from './collectibles';
import {useGame} from './state';

const Shape: React.FC<{item: Collectible}> = ({item}) => {
  if (item.shape === 'coin') {
    return (
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.1, 12]} />
        <meshLambertMaterial color={item.color} emissive={item.color} emissiveIntensity={0.25} />
      </mesh>
    );
  }
  if (item.shape === 'ring') {
    return (
      <mesh>
        <torusGeometry args={[0.38, 0.12, 6, 14]} />
        <meshLambertMaterial color={item.color} emissive={item.color} emissiveIntensity={0.25} />
      </mesh>
    );
  }
  return (
    <mesh>
      <icosahedronGeometry args={[0.42, 0]} />
      <meshLambertMaterial color={item.color} emissive={item.color} emissiveIntensity={0.25} />
    </mesh>
  );
};

const Pickup: React.FC<{item: Collectible}> = ({item}) => {
  const spin = useRef<THREE.Group>(null);
  useFrame(({clock}) => {
    if (!spin.current) return;
    const t = clock.elapsedTime;
    spin.current.rotation.y = t * 1.6;
    spin.current.position.y = 1.15 + Math.sin(t * 2 + item.x) * 0.18;
  });

  return (
    <group position={[item.x, 0, item.z]}>
      <group ref={spin} position={[0, 1.15, 0]}>
        <Shape item={item} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <ringGeometry args={[0.75, 0.95, 20]} />
        <meshBasicMaterial color={PALETTE.accent} transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export const CollectibleField: React.FC = () => {
  const collected = useGame((s) => s.collected);
  return (
    <>
      {COLLECTIBLES.filter((c) => !collected.includes(c.id)).map((c) => (
        <Pickup key={c.id} item={c} />
      ))}
    </>
  );
};
