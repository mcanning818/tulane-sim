import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {minigameById} from './minigames';
import {finishRun, getState, player, registerHit, startRunning, useGame} from './state';

const HIT_RANGE = 3.4;

const Beacon: React.FC<{x: number; z: number; color: string; dim?: boolean}> = ({x, z, color, dim}) => {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({clock}) => {
    if (ring.current) ring.current.rotation.z = clock.elapsedTime * (dim ? 0.6 : 1.8);
  });

  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 9, 0]}>
        <cylinderGeometry args={[2.6, 2.6, 18, 18, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={dim ? 0.1 : 0.26}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.16, 0]}>
        <ringGeometry args={[2.5, 3.3, 26]} />
        <meshBasicMaterial color={color} transparent opacity={dim ? 0.3 : 0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

/** Renders the active round's targets and advances the run as the player reaches them. */
export const MinigameField: React.FC = () => {
  const run = useGame((s) => s.run);
  const game = run ? minigameById(run.gameId) : undefined;

  useFrame(() => {
    const current = getState().run;
    if (!current || !game) return;

    if (current.status === 'countdown') {
      if (Date.now() - current.startedAt > 3000) startRunning();
      return;
    }
    if (current.status !== 'running') return;

    if (game.kind === 'gather' && (Date.now() - current.startedAt) / 1000 > game.seconds) {
      finishRun(false);
      return;
    }

    if (game.kind === 'route') {
      // Checkpoints must be taken in order.
      const index = current.taken.length;
      const target = game.targets[index];
      if (target && Math.hypot(target[0] - player.x, target[1] - player.z) < HIT_RANGE) registerHit(index);
      return;
    }

    for (let i = 0; i < game.targets.length; i++) {
      if (current.taken.includes(i)) continue;
      const [tx, tz] = game.targets[i];
      if (Math.hypot(tx - player.x, tz - player.z) < HIT_RANGE) registerHit(i);
    }
  });

  if (!run || !game || run.status === 'briefing' || run.status === 'done') return null;

  if (game.kind === 'route') {
    const next = game.targets[run.taken.length];
    const after = game.targets[run.taken.length + 1];
    return (
      <>
        {next ? <Beacon x={next[0]} z={next[1]} color={game.targetColor} /> : null}
        {after ? <Beacon x={after[0]} z={after[1]} color={game.targetColor} dim /> : null}
      </>
    );
  }

  return (
    <>
      {game.targets.map(([x, z], i) =>
        run.taken.includes(i) ? null : <Beacon key={`${x},${z}`} x={x} z={z} color={game.targetColor} />,
      )}
    </>
  );
};
