// Brief how-to-play overlay: opens automatically on a fresh game and from the
// header button. The tick loop pauses while it is open.

import { CS } from '../game/content.cs';
import { useGame } from '../game/store';

export default function HelpModal() {
  const setHelpOpen = useGame((s) => s.setHelpOpen);

  return (
    <div className="overlay">
      <div className="modal modal-help">
        <h2>{CS.help.title}</h2>
        <ul className="help-tips">
          {CS.help.tips.map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
        </ul>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={() => setHelpOpen(false)}>
            {CS.help.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
