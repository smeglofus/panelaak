// The domovní schůze choice modal — the only interactive event in MVP.
// The tick loop is paused while it is open (spec §10).

import type { PendingChoice } from '../game/types';
import { useGame } from '../game/store';

export default function ChoiceModal({ choice }: { choice: PendingChoice }) {
  const resolveChoice = useGame((s) => s.resolveChoice);

  return (
    <div className="overlay">
      <div className="modal">
        <h2>{choice.title}</h2>
        <p>{choice.body}</p>
        <div className="modal-actions">
          {choice.options.map((o) => (
            <button
              type="button"
              key={o.id}
              className="btn"
              disabled={o.disabled}
              onClick={() => resolveChoice(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
