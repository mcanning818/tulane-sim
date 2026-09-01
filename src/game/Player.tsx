import {useEffect, useRef} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {zoneAt} from '../world/campus';
import {isInsideAnyBuilding, resolveCollision} from '../world/collision';
import {Avatar, type Limbs} from './Avatar';
import {COLLECTIBLES} from './collectibles';
import {NPCS} from './npcs';
import {attachInput, consumeMouse, keys, mouse} from './input';
import {collect, enterZone, getState, openDialogue, player, setNearbyNpc} from './state';

const WALK = 6.2;
const RUN = 11;
const GRAVITY = -26;
const JUMP = 9.4;
const RADIUS = 0.95;
const PICKUP_RANGE = 2.4;
const TALK_RANGE = 5;

const shortestAngle = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export const Player: React.FC = () => {
  const {camera, gl} = useThree();
  const body = useRef<THREE.Group>(null);
  const limbs = useRef<Limbs>({leftArm: null, rightArm: null, leftLeg: null, rightLeg: null});
  const pos = useRef({x: 0, y: 0, z: 40});
  const vel = useRef({y: 0});
  const facing = useRef(Math.PI);
  const cam = useRef({yaw: 0, pitch: 0.32, dist: 10});
  const stride = useRef(0);
  const shadow = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const interact = () => {
      const s = getState();
      if (s.dialogueNpc || s.minigameId) return;
      const near = NPCS.find(
        (n) => Math.hypot(n.x - pos.current.x, n.z - pos.current.z) < TALK_RANGE,
      );
      if (near) {
        document.exitPointerLock();
        openDialogue(near.id);
      }
    };
    return attachInput(gl.domElement, interact);
  }, [gl]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05); // a tab-switch must not teleport the player
    const paused = getState().paused;
    const look = consumeMouse();

    if (!paused) {
      cam.current.yaw -= look.dx * 0.0026;
      cam.current.pitch = THREE.MathUtils.clamp(cam.current.pitch + look.dy * 0.0022, -0.2, 1.15);
      cam.current.dist = THREE.MathUtils.clamp(cam.current.dist + look.wheel * 0.012, 4, 22);
    }

    let mx = 0;
    let mz = 0;
    if (!paused) {
      const f = keys.has('KeyW') || keys.has('ArrowUp') ? 1 : keys.has('KeyS') || keys.has('ArrowDown') ? -1 : 0;
      const r = keys.has('KeyD') || keys.has('ArrowRight') ? 1 : keys.has('KeyA') || keys.has('ArrowLeft') ? -1 : 0;
      const sinY = Math.sin(cam.current.yaw);
      const cosY = Math.cos(cam.current.yaw);
      mx = -sinY * f + cosY * r;
      mz = -cosY * f - sinY * r;
      const len = Math.hypot(mx, mz);
      if (len > 0) {
        mx /= len;
        mz /= len;
      }
    }

    const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = (sprinting ? RUN : WALK) * (mx || mz ? 1 : 0);

    if (!paused && keys.has('Space') && pos.current.y <= 0.001) vel.current.y = JUMP;
    vel.current.y += GRAVITY * delta;
    pos.current.y = Math.max(0, pos.current.y + vel.current.y * delta);
    if (pos.current.y === 0) vel.current.y = 0;

    const [nx, nz] = resolveCollision(
      pos.current.x + mx * speed * delta,
      pos.current.z + mz * speed * delta,
      RADIUS,
    );
    pos.current.x = nx;
    pos.current.z = nz;

    if (speed > 0) {
      const target = Math.atan2(mx, mz);
      facing.current += shortestAngle(facing.current, target) * Math.min(1, delta * 14);
    }

    // Limb swing, and a small airborne pose so jumping reads.
    stride.current += delta * speed * 1.15;
    const swing = Math.sin(stride.current) * Math.min(0.9, speed / RUN + 0.25);
    const airborne = pos.current.y > 0.05;
    const arm = airborne ? -2.2 : swing;
    if (limbs.current.leftArm) limbs.current.leftArm.rotation.x = arm;
    if (limbs.current.rightArm) limbs.current.rightArm.rotation.x = airborne ? -2.2 : -swing;
    if (limbs.current.leftLeg) limbs.current.leftLeg.rotation.x = airborne ? 0.5 : -swing;
    if (limbs.current.rightLeg) limbs.current.rightLeg.rotation.x = airborne ? -0.3 : swing;

    if (body.current) {
      body.current.position.set(pos.current.x, pos.current.y, pos.current.z);
      body.current.rotation.y = facing.current;
    }
    if (shadow.current) {
      // The shadow lives in the body group, so cancel the jump height and shrink it.
      shadow.current.position.y = 0.02 - pos.current.y;
      const shrink = Math.max(0.45, 1 - pos.current.y * 0.12);
      shadow.current.scale.setScalar(shrink);
    }

    // Spring arm: pull the camera in if the boom would end up inside a building.
    const target = new THREE.Vector3(pos.current.x, pos.current.y + 1.7, pos.current.z);
    let dist = cam.current.dist;
    const cp = new THREE.Vector3();
    for (let i = 0; i < 10; i++) {
      cp.set(
        target.x + dist * Math.sin(cam.current.yaw) * Math.cos(cam.current.pitch),
        target.y + dist * Math.sin(cam.current.pitch),
        target.z + dist * Math.cos(cam.current.yaw) * Math.cos(cam.current.pitch),
      );
      if (!isInsideAnyBuilding(cp.x, cp.z) || dist <= 3) break;
      dist -= 1.6;
    }
    cp.y = Math.max(cp.y, 1.4);
    camera.position.lerp(cp, Math.min(1, delta * 12));
    camera.lookAt(target);

    player.x = pos.current.x;
    player.z = pos.current.z;
    player.yaw = facing.current;
    player.speed = speed;

    enterZone(zoneAt(pos.current.x, pos.current.z)?.id ?? null);

    const collected = getState().collected;
    for (const c of COLLECTIBLES) {
      if (collected.includes(c.id)) continue;
      if (Math.hypot(c.x - pos.current.x, c.z - pos.current.z) < PICKUP_RANGE) collect(c.id);
    }

    const npc = NPCS.find((n) => Math.hypot(n.x - pos.current.x, n.z - pos.current.z) < TALK_RANGE);
    setNearbyNpc(npc?.id ?? null);
  });

  useEffect(() => {
    // Face the LBC on spawn so the first thing you see is somewhere to walk to.
    camera.position.set(0, 12, 52);
    mouse.locked = false;
  }, [camera]);

  return (
    <group ref={body} position={[0, 0, 40]}>
      <Avatar limbs={limbs} />
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.85, 16]} />
        <meshBasicMaterial color="#0b2a17" transparent opacity={0.28} />
      </mesh>
    </group>
  );
};
