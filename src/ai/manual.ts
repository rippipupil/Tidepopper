// Modo «copiar y pegar»: sin ninguna clave, la app prepara la petición, el alumno
// la pega en su app de Claude y trae la respuesta de vuelta. No depende de nada
// más para que la ventana pueda estar siempre montada sin cargar la IA.

export interface ManualRequest {
  prompt: string;
  /** Archivos (PDF, fotos) que hay que adjuntar a mano en Claude. */
  files: string[];
  /** Si la respuesta debe ser JSON (para avisar al alumno de que la copie entera). */
  json: boolean;
  resolve: (text: string) => void;
  reject: (e: Error) => void;
}

export class AiCancelled extends Error {}

let current: ManualRequest | null = null;
const listeners = new Set<(r: ManualRequest | null) => void>();

function emit() {
  for (const l of listeners) l(current);
}

export function onManualRequest(l: (r: ManualRequest | null) => void): () => void {
  listeners.add(l);
  l(current);
  return () => listeners.delete(l);
}

export function askManual(prompt: string, files: string[], json: boolean): Promise<string> {
  current?.reject(new AiCancelled('Petición sustituida por otra.'));
  return new Promise((resolve, reject) => {
    const done = () => {
      current = null;
      emit();
    };
    current = {
      prompt,
      files,
      json,
      resolve: (t) => (done(), resolve(t)),
      reject: (e) => (done(), reject(e)),
    };
    emit();
  });
}
