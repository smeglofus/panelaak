// Save backup as a small file: download the compressed blob, or read one back.
// DOM-only helpers, kept out of the pure game core in src/game/.

import type { GameState } from './game/types';
import { encodeSave } from './game/state';

/** Trigger a download of the current save as a compact .panelak text file. */
export function downloadSave(game: GameState): void {
  const blob = new Blob([encodeSave(game)], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `panelak-${new Date().toISOString().slice(0, 10)}.panelak`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Read a chosen backup file's text contents. */
export function readSaveFile(file: File): Promise<string> {
  return file.text();
}
