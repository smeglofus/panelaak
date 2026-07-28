// Kutilovo potrubí — rotate the pipes until water runs from the meter on the
// left to the flat on the right. Unlocked in Tuzex, played from a kutil's card.
// Winning pays for materials and, fittingly, fixes an actual burst pipe.

import { useEffect, useState } from 'react';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import { POTRUBI_ENERGY_COST, potrubiReward } from '../game/economy';
import {
  flooded,
  generate,
  isSolved,
  N,
  E,
  S,
  W,
  POTRUBI_COLS as COLS,
  rotate,
  type Board,
} from '../game/potrubi';

/** Little SVG of a pipe piece, drawn from its open sides. */
function Pipe({ mask, wet }: { mask: number; wet: boolean }) {
  const stroke = wet ? '#3f7fa0' : '#7c7666';
  const arms = [
    mask & N ? 'M12,12 L12,0' : '',
    mask & E ? 'M12,12 L24,12' : '',
    mask & S ? 'M12,12 L12,24' : '',
    mask & W ? 'M12,12 L0,12' : '',
  ].filter(Boolean);
  return (
    <svg viewBox="0 0 24 24" className="pipe-svg">
      {arms.map((d, i) => (
        <path key={i} d={d} stroke={stroke} strokeWidth={5} strokeLinecap="round" fill="none" />
      ))}
      <circle cx={12} cy={12} r={2.6} fill={stroke} />
    </svg>
  );
}

export default function PotrubiModal({ onClose }: { onClose: () => void }) {
  const energy = useGame((s) => s.game.energy);
  const startPotrubi = useGame((s) => s.startPotrubi);
  const rewardPotrubi = useGame((s) => s.rewardPotrubi);

  const [board, setBoard] = useState<Board | null>(null);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);

  const canAfford = energy >= POTRUBI_ENERGY_COST;

  const begin = () => {
    if (!startPotrubi()) return;
    setBoard(generate());
    setMoves(0);
    setWon(false);
    setOutcome(null);
  };

  const turn = (idx: number) => {
    if (!board || won) return;
    const cells = board.cells.map((c, i) => (i === idx ? rotate(c) : c));
    setBoard({ ...board, cells });
    setMoves((m) => m + 1);
  };

  // Watch for the moment the water gets through.
  useEffect(() => {
    if (!board || won) return;
    if (isSolved(board.cells, board.startRow, board.endRow)) {
      setWon(true);
      const fixedFlat = rewardPotrubi(moves);
      const reward = potrubiReward(moves);
      setOutcome(
        CS.potrubi.win(reward) + (fixedFlat ? ` ${CS.potrubi.winFixed(fixedFlat)}` : ''),
      );
    }
  }, [board, won, moves, rewardPotrubi]);

  const wet = board ? flooded(board.cells, board.startRow) : new Set<number>();

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-potrubi" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="card-close" onClick={onClose} aria-label={CS.ui.close}>
          ×
        </button>
        <h2>{CS.potrubi.title}</h2>

        {!board ? (
          <>
            <p>{CS.potrubi.intro}</p>
            <p className="brigade-hint">{CS.potrubi.cost(POTRUBI_ENERGY_COST)}</p>
            <p className="brigade-hint">{CS.potrubi.controls}</p>
            <div className="modal-actions">
              <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                {CS.potrubi.start}
              </button>
              {!canAfford && <span className="brigade-hint">{CS.potrubi.tooTired}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="arkada-hud">
              <span>
                {CS.potrubi.moves}: <strong>{moves}</strong>
              </span>
              {won && <span className="pipe-flow">{CS.potrubi.connected}</span>}
            </div>
            <div className="pipe-board">
              {board.cells.map((cell, i) => {
                const r = Math.floor(i / COLS);
                const c = i % COLS;
                const isStart = c === 0 && r === board.startRow;
                const isEnd = c === COLS - 1 && r === board.endRow;
                return (
                  <button
                    type="button"
                    key={i}
                    className={`pipe-cell${isStart ? ' pipe-start' : ''}${isEnd ? ' pipe-end' : ''}`}
                    onClick={() => turn(i)}
                  >
                    <Pipe mask={cell} wet={wet.has(i)} />
                  </button>
                );
              })}
            </div>
            <p className="brigade-hint pipe-legend">
              💧 {CS.potrubi.controls}
            </p>
            {won && (
              <>
                <p className="arkada-over">{outcome}</p>
                <div className="modal-actions">
                  <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                    {CS.potrubi.again}
                  </button>
                  <button type="button" className="btn-newgame" onClick={onClose}>
                    {CS.ui.close}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
