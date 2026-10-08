import { useEffect, useRef, useState } from 'react';
import { AiCancelled, onManualRequest, type ManualRequest } from '../ai/manual';

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
    <div role="dialog" aria-modal="true" aria-labelledby="manual-title" style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(5,10,18,.82)', overflowY: 'auto', padding: 16 }}>
      <section className="px" style={{ maxWidth: 520, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 id="manual-title">Pídeselo a Claude</h2>
        {req.reasons.length > 0 && (
          <p role="alert" style={{ margin: 0, fontSize: 13, lineHeight: 1.4, padding: '8px 10px', background: 'rgba(212,144,127,.25)' }}>
            La IA automática no ha podido: {req.reasons.join(' · ')}.
          </p>
        )}
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.5 }}>
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
          <li>Copia su respuesta {req.json ? 'entera (es un bloque de datos)' : ''} y pégala aquí abajo.</li>
        </ol>
        <div className="row">
          <button className="btn grow" onClick={() => void copy()}>
            {copied ? '¡Copiada!' : 'Copiar petición'}
          </button>
          <a className="btn ghost grow" href="https://claude.ai/new" target="_blank" rel="noreferrer">
            Abrir Claude
          </a>
        </div>
        <details>
          <summary style={{ fontSize: 13, cursor: 'pointer' }}>Ver la petición</summary>
          <textarea ref={promptRef} className="field" readOnly value={req.prompt} rows={6} style={{ marginTop: 8, fontSize: 12 }} />
        </details>
        <label htmlFor="manual-answer" style={{ fontWeight: 700, fontSize: 14 }}>
          Respuesta de Claude
        </label>
        <textarea id="manual-answer" className="field" rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Pega aquí la respuesta…" />
        <div className="row">
          <button className="btn ghost grow" onClick={() => req.reject(new AiCancelled('Cancelado.'))}>
            Cancelar
          </button>
          <button className="btn gold grow" disabled={!answer.trim()} onClick={() => req.resolve(answer)}>
            Usar respuesta
          </button>
        </div>
        {req.reasons.length === 0 && <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, opacity: 0.8 }}>Para que sea automático, pon una clave gratis de Gemini en Perfil.</p>}
      </section>
    </div>
  );
}
