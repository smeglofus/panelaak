// One flat in the cross-section: window, tenant emoji, happiness tint,
// problem icon, balcony panel, deterministic plaster weathering.

import type { CSSProperties } from 'react';
import type { Flat } from '../game/types';
import { ARCHETYPE_EMOJI, CS } from '../game/content.cs';
import { tenantImage } from '../tenantImages';

interface Props {
  flat: Flat;
  selected: boolean;
  onSelect: () => void;
}

function hashU32(n: number): number {
  let x = (n + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** Falling-off plaster, deterministic per flat index (spec §6.1). */
function weatheringStyle(index: number): CSSProperties {
  const h = hashU32(index);
  const x1 = h % 80;
  const y1 = (h >>> 7) % 70;
  const x2 = (h >>> 13) % 90;
  const y2 = (h >>> 19) % 80;
  const o1 = (5 + ((h >>> 24) % 10)) / 100;
  const o2 = (4 + ((h >>> 28) % 8)) / 100;
  return {
    backgroundImage:
      `radial-gradient(ellipse 30px 16px at ${x1}% ${y1}%, rgba(50,50,46,${o1}) 0%, transparent 70%), ` +
      `radial-gradient(ellipse 22px 26px at ${x2}% ${y2}%, rgba(40,42,40,${o2}) 0%, transparent 70%)`,
  };
}

export default function FlatCell({ flat, selected, onSelect }: Props) {
  const t = flat.tenant;
  const tier = !t ? 'empty' : t.happiness >= 66 ? 'happy' : t.happiness >= 33 ? 'meh' : 'sad';
  const portrait = t ? tenantImage(t.archetype) : undefined;

  return (
    <button
      type="button"
      className={`flat side-${flat.index % 2}${selected ? ' flat-selected' : ''}`}
      style={weatheringStyle(flat.index)}
      onClick={onSelect}
      title={
        t
          ? `${t.name} — ${CS.ui.happiness.toLowerCase()} ${Math.round(t.happiness)} %`
          : CS.ui.vacantFlat
      }
    >
      <span className={`window window-${tier} window-reno-${flat.renovation}`}>
        {t &&
          (portrait ? (
            <img className="tenant-portrait" src={portrait} alt="" />
          ) : (
            <span className="tenant-emoji">{ARCHETYPE_EMOJI[t.archetype]}</span>
          ))}
      </span>
      {flat.problem && (
        <span className="problem-icon">{flat.problem === 'leak' ? '💧' : '⚽'}</span>
      )}
      <span className="balcony" />
    </button>
  );
}
