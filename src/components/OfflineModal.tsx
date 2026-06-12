// "Zatímco jste byl/a pryč…" — offline earnings summary (spec §6.8).

import type { OfflineSummary } from '../game/offline';
import { CS } from '../game/content.cs';
import { formatKcs } from '../game/economy';
import { useGame } from '../game/store';

export default function OfflineModal({ summary }: { summary: OfflineSummary }) {
  const dismissOffline = useGame((s) => s.dismissOffline);
  const h = Math.floor(summary.elapsed / 3600);
  const m = Math.floor((summary.elapsed % 3600) / 60);

  return (
    <div className="overlay">
      <div className="modal">
        <h2>{CS.offline.title}</h2>
        <p>{CS.offline.away(h, m)}</p>
        <p className="offline-earned">{CS.offline.earned(formatKcs(summary.earned))}</p>
        <p className="offline-flavor">{summary.flavor}</p>
        <p className="offline-note">{CS.offline.rateNote}</p>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={dismissOffline}>
            {CS.ui.continue}
          </button>
        </div>
      </div>
    </div>
  );
}
