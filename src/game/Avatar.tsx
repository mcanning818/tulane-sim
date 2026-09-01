import type {RefObject} from 'react';
import * as THREE from 'three';
import {PALETTE} from '../world/palette';

export type Limbs = {
  leftArm: THREE.Group | null;
  rightArm: THREE.Group | null;
  leftLeg: THREE.Group | null;
  rightLeg: THREE.Group | null;
};

/** Blocky, flat-shaded, faces +z. The controller mutates the limb groups directly. */
export const Avatar: React.FC<{limbs?: RefObject<Limbs>; shirt?: string}> = ({
  limbs,
  shirt = PALETTE.player.torso,
}) => {
  const hold = (key: keyof Limbs) => (g: THREE.Group | null) => {
    if (limbs?.current) limbs.current[key] = g;
  };

  return (
    <group>
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[0.92, 0.9, 0.5]} />
        <meshLambertMaterial color={shirt} />
      </mesh>
      <mesh position={[0, 1.98, 0]}>
        <boxGeometry args={[0.62, 0.56, 0.56]} />
        <meshLambertMaterial color={PALETTE.player.head} />
      </mesh>
      <mesh position={[0, 2.24, 0]}>
        <boxGeometry args={[0.68, 0.14, 0.62]} />
        <meshLambertMaterial color="#243b6b" />
      </mesh>

      <group ref={hold('leftArm')} position={[-0.62, 1.66, 0]}>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.28, 0.86, 0.28]} />
          <meshLambertMaterial color={PALETTE.player.limbs} />
        </mesh>
      </group>
      <group ref={hold('rightArm')} position={[0.62, 1.66, 0]}>
        <mesh position={[0, -0.4, 0]}>
          <boxGeometry args={[0.28, 0.86, 0.28]} />
          <meshLambertMaterial color={PALETTE.player.limbs} />
        </mesh>
      </group>

      <group ref={hold('leftLeg')} position={[-0.24, 0.82, 0]}>
        <mesh position={[0, -0.41, 0]}>
          <boxGeometry args={[0.34, 0.82, 0.34]} />
          <meshLambertMaterial color={PALETTE.player.shoes} />
        </mesh>
      </group>
      <group ref={hold('rightLeg')} position={[0.24, 0.82, 0]}>
        <mesh position={[0, -0.41, 0]}>
          <boxGeometry args={[0.34, 0.82, 0.34]} />
          <meshLambertMaterial color={PALETTE.player.shoes} />
        </mesh>
      </group>
    </group>
  );
};
