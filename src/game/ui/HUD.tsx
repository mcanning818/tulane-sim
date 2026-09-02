import {useEffect} from 'react';
import {ZONES} from '../../world/campus';
import {COLLECTIBLES} from '../collectibles';
import {npcById} from '../npcs';
import {clearToast, completionPct, useGame} from '../state';
import {Minimap} from './Minimap';
import {RunHud} from './RunHud';

const panel: React.CSSProperties = {
  background: 'rgba(9,22,32,0.78)',
  border: '1px solid rgba(120,190,220,0.28)',
  borderRadius: 12,
  color: '#e9f4fb',
  padding: '12px 14px',
  backdropFilter: 'blur(6px)',
};

const Toast: React.FC = () => {
  const toast = useGame((s) => s.toast);
  // The race clock owns the top-center slot during a round, so drop below it.
  const runActive = useGame((s) => Boolean(s.run) && s.run?.status !== 'done');
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => clearToast(toast.id), 3600);
    return () => clearTimeout(id);
  }, [toast]);
  if (!toast) return null;
  return (
    <div
      key={toast.id}
      style={{
        ...panel,
        position: 'absolute',
        top: runActive ? 152 : 24,
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        minWidth: 280,
        transition: 'top 200ms ease',
        borderColor: 'rgba(90,210,240,0.55)',
      }}
    >
      <div style={{fontSize: 17, fontWeight: 700, color: '#5ad2f0'}}>{toast.title}</div>
      <div style={{fontSize: 13, opacity: 0.85, marginTop: 3}}>{toast.blurb}</div>
    </div>
  );
};

export const HUD: React.FC = () => {
  const zoneId = useGame((s) => s.zoneId);
  const discovered = useGame((s) => s.discovered);
  const collected = useGame((s) => s.collected);
  const nearbyNpc = useGame((s) => s.nearbyNpc);
  const dialogueNpc = useGame((s) => s.dialogueNpc);
  const run = useGame((s) => s.run);
  const pct = useGame(completionPct);
  const zone = ZONES.find((z) => z.id === zoneId);

  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', userSelect: 'none'}}>
      <div style={{...panel, position: 'absolute', top: 18, left: 18, minWidth: 210}}>
        <div style={{fontSize: 11, letterSpacing: 1.5, opacity: 0.6}}>CURRENTLY IN</div>
        <div style={{fontSize: 19, fontWeight: 700}}>{zone?.label ?? 'Between places'}</div>
        <div style={{height: 1, background: 'rgba(255,255,255,0.15)', margin: '10px 0'}} />
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13}}>
          <span style={{opacity: 0.75}}>Collected</span>
          <span style={{fontWeight: 700}}>
            {collected.length} / {COLLECTIBLES.length}
          </span>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4}}>
          <span style={{opacity: 0.75}}>Zones found</span>
          <span style={{fontWeight: 700}}>
            {discovered.length} / {ZONES.length}
          </span>
        </div>
        <div style={{marginTop: 10, height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 3}}>
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: 'linear-gradient(90deg,#0b6b3a,#5ad2f0)',
              borderRadius: 3,
              transition: 'width 240ms ease',
            }}
          />
        </div>
        <div style={{fontSize: 11, opacity: 0.6, marginTop: 6}}>{pct}% map completion</div>
      </div>

      <div style={{...panel, position: 'absolute', top: 18, right: 18, padding: 10}}>
        <Minimap />
      </div>

      <div
        style={{
          ...panel,
          position: 'absolute',
          bottom: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 12,
          opacity: 0.8,
          display: 'flex',
          gap: 16,
        }}
      >
        <span><b>WASD</b> move</span>
        <span><b>Shift</b> sprint</span>
        <span><b>Space</b> jump</span>
        <span><b>Mouse</b> look</span>
        <span><b>Scroll</b> zoom</span>
        <span><b>E</b> talk</span>
        <span><b>Esc</b> free cursor</span>
      </div>

      {nearbyNpc && !dialogueNpc && !run ? (
        <div
          style={{
            ...panel,
            position: 'absolute',
            bottom: 96,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 14,
            borderColor: 'rgba(90,210,240,0.55)',
          }}
        >
          Press <b style={{color: '#5ad2f0'}}>E</b> to talk to {npcById(nearbyNpc)?.name}
        </div>
      ) : null}

      <RunHud />
      <Toast />
    </div>
  );
};
