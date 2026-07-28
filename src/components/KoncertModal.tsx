// Domácí koncert — the musician's game. He plays a phrase, you play it back;
// each round adds a note. Pays in mood for the whole house, not in Kčs: a
// concert isn't a transaction.

import { useEffect, useRef, useState } from 'react';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import { koncertBonus, MINIGAME_ENERGY } from '../game/economy';
import { play } from '../sound';

const NOTES = ['🎵', '🎶', '♪', '♫'];
const SHOW_MS = 480;
const GAP_MS = 160;

const ENERGY = MINIGAME_ENERGY.koncert;

type Phase = 'idle' | 'listen' | 'repeat' | 'over';

export default function KoncertModal({ onClose }: { onClose: () => void }) {
  const energy = useGame((s) => s.game.energy);
  const startMinigame = useGame((s) => s.startMinigame);
  const rewardKoncert = useGame((s) => s.rewardKoncert);

  const [sequence, setSequence] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [lit, setLit] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const timers = useRef<number[]>([]);

  const canAfford = energy >= ENERGY;
  /** Rounds completed — the sequence grows by one each round. */
  const rounds = Math.max(0, sequence.length - 1);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  /** Plays the phrase back to the player, then hands over. */
  const perform = (seq: number[]) => {
    setPhase('listen');
    clearTimers();
    seq.forEach((note, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setLit(note);
          play('click');
          timers.current.push(window.setTimeout(() => setLit(null), SHOW_MS - GAP_MS));
        }, i * SHOW_MS),
      );
    });
    timers.current.push(
      window.setTimeout(() => {
        setPhase('repeat');
        setStep(0);
      }, seq.length * SHOW_MS),
    );
  };

  const begin = () => {
    if (!startMinigame('koncert')) return;
    const first = [Math.floor(Math.random() * NOTES.length)];
    setSequence(first);
    perform(first);
  };

  const press = (note: number) => {
    if (phase !== 'repeat') return;
    play('click');
    if (note !== sequence[step]) {
      setPhase('over');
      rewardKoncert(rounds);
      return;
    }
    if (step + 1 < sequence.length) {
      setStep(step + 1);
      return;
    }
    // Phrase repeated — the maestro adds a note.
    const next = [...sequence, Math.floor(Math.random() * NOTES.length)];
    setSequence(next);
    timers.current.push(window.setTimeout(() => perform(next), 500));
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-koncert" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="card-close" onClick={onClose} aria-label={CS.ui.close}>
          ×
        </button>
        <h2>{CS.koncert.title}</h2>

        {phase === 'idle' ? (
          <>
            <p>{CS.koncert.intro}</p>
            <p className="brigade-hint">{CS.koncert.cost(ENERGY)}</p>
            <p className="brigade-hint">{CS.koncert.controls}</p>
            <div className="modal-actions">
              <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                {CS.koncert.start}
              </button>
              {!canAfford && <span className="brigade-hint">{CS.koncert.tooTired}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="arkada-hud">
              <span>{CS.koncert.round(sequence.length)}</span>
              <span>{phase === 'listen' ? CS.koncert.listen : phase === 'repeat' ? CS.koncert.repeat : ''}</span>
            </div>
            <div className="koncert-keys">
              {NOTES.map((n, i) => (
                <button
                  type="button"
                  key={i}
                  className={`koncert-key koncert-k${i}${lit === i ? ' koncert-lit' : ''}`}
                  disabled={phase !== 'repeat'}
                  onClick={() => press(i)}
                >
                  {n}
                </button>
              ))}
            </div>
            {phase === 'over' && (
              <>
                <p className="arkada-over">
                  {CS.koncert.wrong}{' '}
                  {rounds > 0 && CS.koncert.reward(koncertBonus(rounds))}
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                    {CS.koncert.again}
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
