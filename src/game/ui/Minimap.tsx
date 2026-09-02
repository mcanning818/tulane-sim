import {useEffect, useRef} from 'react';
import {campus, ZONES} from '../../world/campus';
import {COLLECTIBLES} from '../collectibles';
import {minigameById} from '../minigames';
import {NPCS} from '../npcs';
import {getState, player, useGame} from '../state';

const SCALE = 0.55; // pixels per meter
const SIZE = 232;

/**
 * The static layer is drawn once per discovery change into an offscreen canvas and
 * then blitted each frame, so panning the map costs one drawImage instead of
 * re-stroking 239 footprints at 60fps.
 */
const drawStatic = (discovered: string[]): HTMLCanvasElement => {
  const {minX, maxX, minZ, maxZ} = campus.extent;
  const pad = 60;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((maxX - minX + pad * 2) * SCALE);
  canvas.height = Math.ceil((maxZ - minZ + pad * 2) * SCALE);
  const ctx = canvas.getContext('2d')!;
  const px = (x: number) => (x - minX + pad) * SCALE;
  const pz = (z: number) => (z - minZ + pad) * SCALE;

  ctx.fillStyle = '#0e1a24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const poly = (points: [number, number][]) => {
    ctx.beginPath();
    points.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z))));
    ctx.closePath();
  };

  ctx.fillStyle = '#16232e';
  for (const b of campus.buildings) {
    poly(b.footprint);
    ctx.fill();
  }

  // Discovered zones light up: green lawn, pale walks, brighter footprints.
  for (const zone of ZONES) {
    if (!discovered.includes(zone.id)) continue;
    ctx.save();
    ctx.beginPath();
    ctx.arc(px(zone.center[0]), pz(zone.center[1]), zone.radius * SCALE, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#1d3327';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#2c4a35';
    for (const g of campus.greens) {
      poly(g.polygon);
      ctx.fill();
    }
    ctx.strokeStyle = '#6d7c66';
    ctx.lineWidth = 1.4;
    for (const p of campus.paths) {
      if (p.kind !== 'walk') continue;
      ctx.beginPath();
      p.points.forEach(([x, z], i) => (i ? ctx.lineTo(px(x), pz(z)) : ctx.moveTo(px(x), pz(z))));
      ctx.stroke();
    }
    ctx.fillStyle = '#c3826a';
    for (const b of campus.buildings) {
      poly(b.footprint);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(90,210,240,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px(zone.center[0]), pz(zone.center[1]), zone.radius * SCALE, 0, Math.PI * 2);
    ctx.stroke();
  }

  return canvas;
};

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const discovered = useGame((s) => s.discovered);
  const staticLayer = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    staticLayer.current = drawStatic(discovered);
  }, [discovered]);

  useEffect(() => {
    let raf = 0;
    const {minX, minZ} = campus.extent;
    const pad = 60;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      const layer = staticLayer.current;
      if (!canvas || !layer) return;
      const ctx = canvas.getContext('2d')!;
      const ox = (player.x - minX + pad) * SCALE;
      const oz = (player.z - minZ + pad) * SCALE;

      ctx.clearRect(0, 0, SIZE, SIZE);
      ctx.save();
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#0e1a24';
      ctx.fillRect(0, 0, SIZE, SIZE);
      ctx.drawImage(layer, SIZE / 2 - ox, SIZE / 2 - oz);

      const toScreen = (x: number, z: number): [number, number] => [
        SIZE / 2 + (x - player.x) * SCALE,
        SIZE / 2 + (z - player.z) * SCALE,
      ];

      const state = getState();
      for (const c of COLLECTIBLES) {
        if (state.collected.includes(c.id) || !state.discovered.includes(c.zoneId)) continue;
        const [sx, sz] = toScreen(c.x, c.z);
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(sx, sz, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      const activeRun = state.run;
      const activeGame = activeRun ? minigameById(activeRun.gameId) : undefined;
      if (activeRun && activeGame && activeRun.status !== 'done') {
        const pending =
          activeGame.kind === 'route'
            ? activeGame.targets.slice(activeRun.taken.length, activeRun.taken.length + 2)
            : activeGame.targets.filter((_, i) => !activeRun.taken.includes(i));
        pending.forEach((t, i) => {
          const [sx, sz] = toScreen(t[0], t[1]);
          ctx.fillStyle = activeGame.targetColor;
          ctx.globalAlpha = i === 0 ? 1 : 0.45;
          ctx.beginPath();
          ctx.arc(sx, sz, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      }

      for (const npc of NPCS) {
        const [sx, sz] = toScreen(npc.x, npc.z);
        ctx.fillStyle = '#5ad2f0';
        ctx.fillRect(sx - 2.5, sz - 2.5, 5, 5);
      }

      ctx.translate(SIZE / 2, SIZE / 2);
      ctx.rotate(-player.yaw + Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '10px system-ui';
      ctx.fillText('N', SIZE / 2 - 3, 16);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{display: 'block'}} />;
};
