import {minigameById} from '../minigames';
import {closeMinigame, useGame} from '../state';

export const MinigameModal: React.FC = () => {
  const id = useGame((s) => s.minigameId);
  const game = id ? minigameById(id) : undefined;
  if (!game) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(4,10,16,0.72)',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <div
        style={{
          width: 'min(520px, 88vw)',
          background: '#0d1f2b',
          border: '1px solid rgba(90,210,240,0.5)',
          borderRadius: 14,
          color: '#e9f4fb',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{fontSize: 11, letterSpacing: 1.6, opacity: 0.6}}>MINIGAME</div>
        <div style={{fontSize: 24, fontWeight: 700, margin: '6px 0 10px'}}>{game.name}</div>
        <div style={{fontSize: 15, lineHeight: 1.5, opacity: 0.85}}>{game.blurb}</div>
        <div style={{fontSize: 13, opacity: 0.6, marginTop: 16}}>
          Registered and wired up — the playable round lands in v2.
        </div>
        <button
          onClick={closeMinigame}
          style={{
            marginTop: 20,
            padding: '10px 22px',
            borderRadius: 9,
            border: 'none',
            background: '#5ad2f0',
            color: '#062030',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Back to campus
        </button>
      </div>
    </div>
  );
};
