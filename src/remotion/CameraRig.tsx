import {useThree} from '@react-three/fiber';
import {useCurrentFrame, interpolate, Easing} from 'remotion';
import * as THREE from 'three';

/**
 * Flythrough: high over Gibson Hall, down the Academic Quad, north along
 * McAlister Place, arriving at the LBC. Coordinates are the same world meters the
 * game uses, so the cinematic and the playable map can never drift apart.
 */
export const CameraRig: React.FC = () => {
  const frame = useCurrentFrame();
  const {camera} = useThree();

  const x = interpolate(frame, [0, 140, 260, 420], [-250, -120, 20, 60], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [0, 140, 260, 420], [190, 70, 34, 26], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const z = interpolate(frame, [0, 140, 260, 420], [330, 210, 10, -195], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const targetX = interpolate(frame, [0, 140, 260, 420], [-189, -60, 20, 30], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const targetZ = interpolate(frame, [0, 140, 260, 420], [221, 120, -90, -257], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  camera.position.set(x, y, z);
  camera.lookAt(new THREE.Vector3(targetX, 8, targetZ));
  camera.updateProjectionMatrix();

  return null;
};
