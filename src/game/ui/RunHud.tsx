import {useEffect, useRef} from 'react';
import {minigameById} from '../minigames';
import {getState, player, useGame} from '../state';

/**
 * The live round readout. The clock ticks on its own rAF loop rather than through
 * React state so a running timer never re-renders the rest of the HUD.
 */
export const RunHud: React.FC = () => {
  const run = useGame((s) => s.run);
  const clock = useRef<HTMLDivElement>(null);
  const distance = useRef<HTMLDivElement>(null);
  const game = run ? minigameById(run.gameId) : undefined;

  useEffect(() => {
    if (!run || !game) return;
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const current = getState().run;
      if (!current || !clock.current) return;

      if (current.status === 'countdown') {
        clock.current.textContent = 'get ready';
        if (distance.current) distance.current.textContent = '';
        return;
      }
      const elapsed = current.status === 'running' ? (Date.now() - current.startedAt) / 1000 : current.elapsed;
      const shown = game.kind === 'gather' ? Math.max(0, game.seconds - elapsed) : elapsed;
      clock.current.textContent = shown.toFixed(1);
      clock.current.style.color =
        game.kind === 'gather' && shown < 15 ? '#ff8f6b' : elapsed > game.seconds && game.kind === 'route' ? '#ff8f6b' : '#e9f4fb';

      if (!distance.current) return;
      const targets =
        game.kind === 'route'
          ? [game.targets[current.taken.length]]
          : game.targets.filter((_, i) => !current.taken.includes(i));
      let nearest = Infinity;
      for (const t of targets) {
        if (!t) continue;
        nearest = Math.min(nearest, Math.hypot(t[0] - player.x, t[1] - player.z));
      }
      distance.current.textContent = Number.isFinite(nearest) ? `${Math.round(nearest)}m to next` : '';
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [run, game]);

  if (!run || !game || run.status === 'briefing' || run.status === 'done') return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 18,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(9,22,32,0.82)',
        border: '1px solid rgba(230,180,34,0.55)',
        borderRadius: 12,
        color: '#e9f4fb',
        padding: '10px 22px',
        textAlign: 'center',
        minWidth: 240,
      }}
    >
      <div style={{fontSize: 11, letterSpacing: 1.6, opacity: 0.65}}>{game.name.toUpperCase()}</div>
      <div ref={clock} style={{fontSize: 38, fontWeight: 800, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums'}}>
        0.0
      </div>
      <div style={{fontSize: 13, opacity: 0.85}}>
        {game.kind === 'route' ? 'Checkpoints' : 'Beignets'} {run.taken.length} / {run.total}
        {game.kind === 'route' ? ` · par ${game.seconds}s` : ''}
      </div>
      <div ref={distance} style={{fontSize: 12, opacity: 0.6, marginTop: 2}} />
    </div>
  );
};
