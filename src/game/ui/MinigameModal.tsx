import {useEffect, useState} from 'react';
import {minigameById} from '../minigames';
import {beginRun, closeRun, getState, useGame} from '../state';

const card: React.CSSProperties = {
  width: 'min(560px, 88vw)',
  background: '#0d1f2b',
  border: '1px solid rgba(90,210,240,0.5)',
  borderRadius: 14,
  color: '#e9f4fb',
  padding: 26,
  textAlign: 'center',
};

const button = (primary: boolean): React.CSSProperties => ({
  padding: '11px 24px',
  borderRadius: 9,
  border: primary ? 'none' : '1px solid rgba(255,255,255,0.22)',
  background: primary ? '#5ad2f0' : 'rgba(255,255,255,0.06)',
  color: primary ? '#062030' : '#e9f4fb',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
});

const Countdown: React.FC = () => {
  const [n, setN] = useState(3);
  useEffect(() => {
    const id = setInterval(() => {
      const run = getState().run;
      if (!run || run.status !== 'countdown') return;
      setN(Math.max(1, Math.ceil(3 - (Date.now() - run.startedAt) / 1000)));
    }, 90);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none'}}>
      <div
        style={{
          fontSize: 140,
          fontWeight: 800,
          color: '#5ad2f0',
          textShadow: '0 10px 50px rgba(0,20,40,0.8)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {n}
      </div>
    </div>
  );
};

/** Pointer lock needs a user gesture, and the Start click is the one we have. */
const startWithPointerLock = () => {
  document.querySelector('canvas')?.requestPointerLock?.();
  beginRun();
};

export const MinigameModal: React.FC = () => {
  const run = useGame((s) => s.run);
  const game = run ? minigameById(run.gameId) : undefined;
  if (!run || !game) return null;
  if (run.status === 'countdown') return <Countdown />;
  if (run.status === 'running') return null;

  const briefing = run.status === 'briefing';

  return (
    <div style={{position: 'absolute', inset: 0, background: 'rgba(4,10,16,0.72)', display: 'grid', placeItems: 'center'}}>
      <div style={card}>
        <div style={{fontSize: 11, letterSpacing: 1.6, opacity: 0.6}}>
          {briefing ? 'MINIGAME' : run.success ? 'YOU BEAT IT' : 'NOT THIS TIME'}
        </div>
        <div style={{fontSize: 26, fontWeight: 700, margin: '6px 0 10px'}}>{game.name}</div>

        {briefing ? (
          <>
            <div style={{fontSize: 15, lineHeight: 1.55, opacity: 0.88}}>{game.blurb}</div>
            <div style={{fontSize: 14, lineHeight: 1.55, opacity: 0.7, marginTop: 10}}>{game.rules}</div>
            <div style={{fontSize: 13, opacity: 0.6, marginTop: 14}}>
              {run.best === null ? 'No time recorded yet.' : `Your best: ${run.best.toFixed(1)}s`}
            </div>
            <div style={{fontSize: 12, opacity: 0.5, marginTop: 6}}>
              You will be moved to the start line.
            </div>
          </>
        ) : (
          <>
            <div style={{fontSize: 54, fontWeight: 800, fontVariantNumeric: 'tabular-nums'}}>
              {run.elapsed.toFixed(1)}s
            </div>
            <div style={{fontSize: 15, opacity: 0.85, marginTop: 4}}>
              {game.kind === 'route'
                ? run.success
                  ? `Under par by ${(game.seconds - run.elapsed).toFixed(1)}s. The streetcar is still on Broadway.`
                  : `Par was ${game.seconds}s. You missed it by ${(run.elapsed - game.seconds).toFixed(1)}s.`
                : run.success
                  ? `All ${run.total} beignets, with ${(game.seconds - run.elapsed).toFixed(1)}s to spare.`
                  : `Time. You got ${run.taken.length} of ${run.total} — the birds got the rest.`}
            </div>
            <div style={{fontSize: 13, opacity: 0.6, marginTop: 12}}>
              {run.best === null ? '' : `Best: ${run.best.toFixed(1)}s`}
            </div>
          </>
        )}

        <div style={{display: 'flex', gap: 10, justifyContent: 'center', marginTop: 22}}>
          <button onClick={startWithPointerLock} style={button(true)}>
            {briefing ? 'Start' : 'Run it again'}
          </button>
          <button onClick={closeRun} style={button(false)}>
            {briefing ? 'Not now' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
