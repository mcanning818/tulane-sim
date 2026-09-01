import {useEffect, useState} from 'react';
import {npcById} from '../npcs';
import {closeDialogue, openMinigame, useGame} from '../state';

export const Dialogue: React.FC = () => {
  const npcId = useGame((s) => s.dialogueNpc);
  const npc = npcId ? npcById(npcId) : undefined;
  const [nodeId, setNodeId] = useState<string | null>(null);

  useEffect(() => {
    setNodeId(npc ? npc.root : null);
  }, [npc]);

  if (!npc || !nodeId) return null;
  const node = npc.nodes[nodeId];
  if (!node) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(680px, 88vw)',
        background: 'rgba(9,22,32,0.94)',
        border: '1px solid rgba(90,210,240,0.5)',
        borderRadius: 14,
        color: '#e9f4fb',
        padding: 20,
      }}
    >
      <div style={{fontSize: 17, fontWeight: 700, color: '#5ad2f0'}}>{npc.name}</div>
      <div style={{fontSize: 12, opacity: 0.6, marginBottom: 12}}>{npc.role}</div>
      <div style={{fontSize: 16, lineHeight: 1.5, marginBottom: 16}}>{node.text}</div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
        {node.choices.map((choice) => (
          <button
            key={choice.label}
            onClick={() => {
              if (choice.startMinigame) return openMinigame(choice.startMinigame);
              if (choice.end || !choice.goto) return closeDialogue();
              setNodeId(choice.goto);
            }}
            style={{
              textAlign: 'left',
              padding: '10px 14px',
              borderRadius: 9,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e9f4fb',
              fontSize: 14,
              cursor: 'pointer',
              font: 'inherit',
              fontFamily: 'inherit',
            }}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
};
