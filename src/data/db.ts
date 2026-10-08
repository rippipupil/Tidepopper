import { del, get, set } from 'idb-keyval';
import type { AppState } from './types';

// Todo vive en este dispositivo (IndexedDB). El estado va en una clave;
// los archivos (PDF, fotos) van aparte para no cargar el estado.
const STATE_KEY = 'tidepopper:state';

export const loadState = () => get<AppState>(STATE_KEY);
export const saveState = (s: AppState) => set(STATE_KEY, s);
export const saveFile = (id: string, blob: Blob) => set(`file:${id}`, blob);
export const loadFile = (id: string) => get<Blob>(`file:${id}`);
export const deleteFile = (id: string) => del(`file:${id}`);

export function uid(): string {
  return crypto.randomUUID();
}
