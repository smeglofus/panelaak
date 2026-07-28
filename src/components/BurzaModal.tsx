// Bonová burza — the vekslák's game. A rate wanders up and down for half a
// minute; buy low, sell high. A VB patrol shows up now and then, and anything
// you are holding when it arrives is gone. Pays in bony, the scarce currency,
// which is what makes it worth a separate game.

import { useEffect, useRef, useState } from 'react';
import { CS } from '../game/content.cs';
import { useGame } from '../game/store';
import {
  BURZA_START_CAPITAL,
  burzaReward,
  MINIGAME_ENERGY,
} from '../game/economy';

const ROUND_SECONDS = 30;
const TICK_MS = 500;
const HISTORY = 40;
const START_PRICE = 100;
/** Chance per tick that a patrol starts closing in. */
const RAID_CHANCE = 0.04;
/** Ticks of warning before the patrol actually arrives. */
const RAID_WARNING = 4;

const ENERGY = MINIGAME_ENERGY.burza;

export default function BurzaModal({ onClose }: { onClose: () => void }) {
  const energy = useGame((s) => s.game.energy);
  const startMinigame = useGame((s) => s.startMinigame);
  const rewardBurza = useGame((s) => s.rewardBurza);

  const [prices, setPrices] = useState<number[]>([START_PRICE]);
  const [capital, setCapital] = useState(BURZA_START_CAPITAL);
  /** Units held; 0 means we're in cash. */
  const [held, setHeld] = useState(0);
  const [ticksLeft, setTicksLeft] = useState(0);
  const [raidIn, setRaidIn] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);
  const paidRef = useRef(false);

  const price = prices[prices.length - 1];
  const canAfford = energy >= ENERGY;

  const begin = () => {
    if (!startMinigame('burza')) return;
    setPrices([START_PRICE]);
    setCapital(BURZA_START_CAPITAL);
    setHeld(0);
    setTicksLeft((ROUND_SECONDS * 1000) / TICK_MS);
    setRaidIn(null);
    setNote(null);
    setOver(false);
    paidRef.current = false;
    setPlaying(true);
  };

  useEffect(() => {
    if (!playing || over) return;
    const id = window.setInterval(() => {
      // Random walk with a mild pull back toward the middle, so the rate keeps
      // giving both buying and selling opportunities.
      setPrices((p) => {
        const last = p[p.length - 1];
        const drift = (START_PRICE - last) * 0.03;
        const shock = (Math.random() - 0.5) * 14;
        const next = Math.max(20, Math.min(220, last + drift + shock));
        return [...p, next].slice(-HISTORY);
      });

      setRaidIn((r) => {
        if (r === null) return Math.random() < RAID_CHANCE ? RAID_WARNING : null;
        if (r > 1) return r - 1;
        // The patrol is here.
        setHeld((h) => {
          if (h > 0) setNote(CS.burza.raidLost);
          return 0;
        });
        return null;
      });

      setTicksLeft((t) => {
        if (t <= 1) {
          setOver(true);
          return 0;
        }
        return t - 1;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [playing, over]);

  // Settle up once when trading closes: anything still held is sold at the
  // closing rate, then the profit becomes bony.
  useEffect(() => {
    if (!over || paidRef.current) return;
    paidRef.current = true;
    const finalCapital = capital + held * price;
    rewardBurza(finalCapital);
    setPlaying(false);
  }, [over, capital, held, price, rewardBurza]);

  const buy = () => {
    if (held > 0 || over) return;
    const units = Math.floor(capital / price);
    if (units <= 0) return;
    setHeld(units);
    setCapital((c) => c - units * price);
    setNote(null);
  };

  const sell = () => {
    if (held <= 0 || over) return;
    setCapital((c) => c + held * price);
    setHeld(0);
    setNote(null);
  };

  const worth = capital + held * price;
  const started = playing || over;
  const bony = burzaReward(worth);

  // Sparkline of the rate so far.
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const span = Math.max(1, max - min);
  const points = prices
    .map((p, i) => `${(i / Math.max(1, HISTORY - 1)) * 100},${100 - ((p - min) / span) * 100}`)
    .join(' ');

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-burza" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="card-close" onClick={onClose} aria-label={CS.ui.close}>
          ×
        </button>
        <h2>{CS.burza.title}</h2>

        {!started ? (
          <>
            <p>{CS.burza.intro}</p>
            <p className="brigade-hint">{CS.burza.cost(ENERGY)}</p>
            <p className="brigade-hint">{CS.burza.controls}</p>
            <div className="modal-actions">
              <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                {CS.burza.start}
              </button>
              {!canAfford && <span className="brigade-hint">{CS.burza.tooTired}</span>}
            </div>
          </>
        ) : (
          <>
            <div className="arkada-hud">
              <span>
                {CS.burza.capital}: <strong>{Math.round(worth)}</strong>
              </span>
              <span>
                {CS.burza.price}: <strong>{Math.round(price)}</strong>
              </span>
              <span>{CS.burza.timeLeft(Math.ceil((ticksLeft * TICK_MS) / 1000))}</span>
            </div>

            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="burza-chart">
              <polyline points={points} fill="none" stroke="#44503c" strokeWidth={2} />
            </svg>

            {raidIn !== null && <p className="burza-raid">{CS.burza.raid}</p>}
            {held > 0 && <p className="brigade-hint">{CS.burza.holding}: {held}</p>}
            {note && <p className="brigade-hint">{note}</p>}

            {!over ? (
              <div className="modal-actions">
                <button type="button" className="btn" disabled={held > 0} onClick={buy}>
                  {CS.burza.buy}
                </button>
                <button type="button" className="btn btn-bony" disabled={held <= 0} onClick={sell}>
                  {CS.burza.sell}
                </button>
              </div>
            ) : (
              <>
                <p className="arkada-over">
                  {bony > 0 ? CS.burza.reward(bony) : CS.burza.noProfit}
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn" disabled={!canAfford} onClick={begin}>
                    {CS.burza.again}
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
