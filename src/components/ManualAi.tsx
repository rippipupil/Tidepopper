import { useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { AiCancelled, onManualRequest, type ManualRequest } from '../ai/manual';
import { Sheet } from './ui';

/** Ventana de «copiar y pegar»: lleva la petición a la app de Claude y trae la respuesta. */
export default function ManualAi() {
  const [req, setReq] = useState<ManualRequest | null>(null);
  const [answer, setAnswer] = useState('');
  const [copied, setCopied] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(
    () =>
      onManualRequest((r) => {
        setReq(r);
        setAnswer('');
        setCopied(false);
      }),
    [],
  );
  if (!req) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(req.prompt);
    } catch {
      promptRef.current?.select();
      document.execCommand('copy');
    }
    setCopied(true);
  };

  return (
    <Sheet title="Pídeselo a Claude" onClose={() => req.reject(new AiCancelled('Cancelado.'))}>
      {req.reasons.length > 0 && (
        <div className="alert bad" role="alert">
          La IA automática no ha podido: {req.reasons.join(' · ')}.
        </div>
      )}
      <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
        <li>Copia la petición.</li>
        <li>
          Pégala en tu app de Claude
          {req.files.length > 0 && (
            <>
              {' '}
              y <b>adjunta también: {req.files.join(', ')}</b>
            </>
          )}
          .
        </li>
        <li>Copia su respuesta {req.json ? 'entera (es un bloque de datos)' : ''} y pégala aquí.</li>
      </ol>
      <div className="row">
        <button className="btn grow" onClick={() => void copy()}>
          <Copy size={17} /> {copied ? '¡Copiada!' : 'Copiar petición'}
        </button>
        <a className="btn secondary grow" href="https://claude.ai/new" target="_blank" rel="noreferrer">
          <ExternalLink size={17} /> Abrir Claude
        </a>
      </div>
      <details>
        <summary className="muted small" style={{ cursor: 'pointer' }}>
          Ver la petición
        </summary>
        <textarea ref={promptRef} className="field" readOnly value={req.prompt} rows={6} style={{ marginTop: 8, fontSize: 12, fontFamily: 'var(--mono)' }} />
      </details>
      <label htmlFor="manual-answer" className="label">
        Respuesta de Claude
      </label>
      <textarea id="manual-answer" className="field" rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Pega aquí la respuesta…" />
      <div className="row">
        <button className="btn ghost grow" onClick={() => req.reject(new AiCancelled('Cancelado.'))}>
          Cancelar
        </button>
        <button className="btn grow" disabled={!answer.trim()} onClick={() => req.resolve(answer)}>
          Usar respuesta
        </button>
      </div>
      {req.reasons.length === 0 && <p className="faint small">Para que sea automático, pon una clave gratis de Gemini en Ajustes.</p>}
    </Sheet>
  );
}
