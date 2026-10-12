import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpenCheck, ChevronLeft, Home, Settings as Cog, X } from 'lucide-react';

/** Marca de la app. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden>
      <svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2" />
        <path d="M4 20c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2" />
        <path d="M12 3v7M9 7l3 3 3-3" />
      </svg>
    </span>
  );
}

/** Barra superior fija. Con «back», muestra la flecha de volver. */
export function TopBar({ back, title, children }: { back?: string; title?: ReactNode; children?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`topbar${scrolled ? ' scrolled' : ''}`}>
      <div className="topbar-in">
        {back ? (
          <a className="iconbtn" href={back} aria-label="Volver">
            <ChevronLeft size={24} />
          </a>
        ) : title ? (
          <a href="#/" aria-label="Inicio">
            <Logo />
          </a>
        ) : (
          <a className="brand" href="#/">
            <Logo />
            Tidepopper
          </a>
        )}
        {title && <div className="grow ellipsis" style={{ fontWeight: 650, fontSize: 17 }}>{title}</div>}
        {!title && <div className="grow" />}
        {children}
      </div>
    </header>
  );
}

export function BottomNav({ active, due }: { active: 'inicio' | 'repasar' | 'ajustes'; due?: number }) {
  const items = [
    { id: 'inicio', href: '#/', label: 'Notas', icon: <Home size={22} /> },
    { id: 'repasar', href: '#/repasar', label: 'Repasar', icon: <BookOpenCheck size={22} /> },
    { id: 'ajustes', href: '#/ajustes', label: 'Ajustes', icon: <Cog size={22} /> },
  ] as const;
  return (
    <nav className="nav" aria-label="Principal">
      <div className="nav-in">
        {items.map((it) => (
          <a key={it.id} href={it.href} aria-current={active === it.id ? 'page' : undefined}>
            {it.icon}
            {it.label}
            {it.id === 'repasar' && !!due && <span className="badge">{due > 99 ? '99+' : due}</span>}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; icon?: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [value]);
  return (
    <div className="tabs" role="tablist" ref={ref}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}>
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** Hoja que sube desde abajo (en pantallas anchas, ventana centrada). */
export function Sheet({ title, onClose, children }: { title?: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && (
          <div className="row">
            <h2 className="grow">{title}</h2>
            <button className="iconbtn" onClick={onClose} aria-label="Cerrar">
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

let toastSet: ((t: string) => void) | null = null;

/** Aviso breve abajo de la pantalla. */
export function toast(text: string) {
  toastSet?.(text);
}

export function ToastHost() {
  const [text, setText] = useState('');
  const timer = useRef<number>();
  useEffect(() => {
    toastSet = (t) => {
      setText(t);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setText(''), 2600);
    };
    return () => {
      toastSet = null;
    };
  }, []);
  return text ? (
    <div className="toast" role="status">
      {text}
    </div>
  ) : null;
}

export function Bar({ parts }: { parts: { value: number; color: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div className="bar">
      {parts.map((p, k) => (
        <span key={k} style={{ width: `${(100 * p.value) / total}%`, background: p.color }} />
      ))}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="col" style={{ alignItems: 'center', textAlign: 'center', padding: '36px 16px', gap: 10 }}>
      <div style={{ fontSize: 44 }}>{icon}</div>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function Loading({ text }: { text: string }) {
  return (
    <div className="col" style={{ alignItems: 'center', padding: '48px 16px', gap: 16 }} role="status">
      <div className="spinner lg" />
      <div className="muted" style={{ textAlign: 'center' }}>
        {text}
      </div>
    </div>
  );
}

export function timeAgo(ts: number, now = Date.now()): string {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
