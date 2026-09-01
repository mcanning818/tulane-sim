import {useMemo} from 'react';
import * as THREE from 'three';
import {campus} from './campus';
import {buildBuildings, buildGreens, buildPaths, buildTrees} from './geometry';
import {PALETTE} from './palette';

const flat = (color: string) => new THREE.MeshLambertMaterial({color});

/**
 * The entire static campus as one THREE.Group, built once and shared by the game
 * and by the Remotion compositions. Merged geometry keeps this to ~12 draw calls.
 */
let cached: THREE.Group | null = null;

export const campusGroup = (): THREE.Group => {
  if (cached) return cached;
  const group = new THREE.Group();
  group.name = 'campus';

  const {minX, maxX, minZ, maxZ} = campus.extent;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry((maxX - minX) * 2.5, (maxZ - minZ) * 2.5),
    flat(PALETTE.ground),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  group.add(ground);

  const greens = buildGreens();
  if (greens) group.add(new THREE.Mesh(greens, flat(PALETTE.quad)));

  const roads = buildPaths('road', 0.06);
  if (roads) group.add(new THREE.Mesh(roads, flat(PALETTE.road)));

  const walks = buildPaths('walk', 0.1);
  if (walks) group.add(new THREE.Mesh(walks, flat(PALETTE.walk)));

  const {walls, roofs} = buildBuildings();
  for (const part of [...walls, ...roofs]) {
    group.add(new THREE.Mesh(part.geometry, flat(part.color)));
  }

  const trees = buildTrees();
  const trunkGeo = new THREE.CylinderGeometry(0.42, 0.62, 4.4, 6);
  trunkGeo.translate(0, 2.2, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, flat(PALETTE.trunk), trees.length);
  const canopyGeo = new THREE.IcosahedronGeometry(3.6, 0);
  canopyGeo.translate(0, 6.2, 0);
  const canopies = PALETTE.canopy.map((tone, i) => {
    const count = trees.filter((t) => t.tone === i).length;
    return new THREE.InstancedMesh(canopyGeo, flat(tone), Math.max(count, 1));
  });

  const m = new THREE.Matrix4();
  const canopyCursor = PALETTE.canopy.map(() => 0);
  trees.forEach((tree, i) => {
    m.makeScale(tree.scale, tree.scale, tree.scale);
    m.setPosition(tree.x, 0, tree.z);
    trunks.setMatrixAt(i, m);
    const mesh = canopies[tree.tone];
    mesh.setMatrixAt(canopyCursor[tree.tone]++, m);
  });
  trunks.instanceMatrix.needsUpdate = true;
  group.add(trunks);
  for (const c of canopies) {
    c.instanceMatrix.needsUpdate = true;
    group.add(c);
  }

  cached = group;
  return group;
};

export const Campus: React.FC = () => {
  const group = useMemo(() => campusGroup(), []);
  return <primitive object={group} />;
};

export const CampusLights: React.FC<{intensity?: number}> = ({intensity = 1}) => (
  <>
    <hemisphereLight args={['#dbeeff', '#6f8a5a', 1.9 * intensity]} />
    <directionalLight position={[120, 260, 90]} intensity={1.25 * intensity} color="#fff3d6" />
    {/* Fill from the opposite side so north-facing brick never reads as black. */}
    <directionalLight position={[-180, 140, -160]} intensity={0.8 * intensity} color="#a9cdf5" />
  </>
);
