import type { ReactNode } from 'react';
import type { FolderColor } from '../data/types';

export const icon = (name: string) => `img/icons/i-${name}.svg`;
export const folderIcon = (c: FolderColor) => icon(`folder-${c}`);
export const FOLDER_BAR: Record<FolderColor, string> = { blue: '#5f8fb3', mint: '#5f9884', gold: '#a88f5e', coral: '#a8695a' };

export function Header({ back, title, children }: { back?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="row">
      {back && (
        <a href={back} className="lcd iconbtn" aria-label="Volver">
          <img src={icon('back')} alt="" />
        </a>
      )}
      <h1 className="grow" style={{ fontSize: back ? 20 : 26 }}>
        {title}
      </h1>
      {children}
    </header>
  );
}

export function Progress({ value, color = '#5f8fb3', track = '#b8c9d7', height = 6 }: { value: number; color?: string; track?: string; height?: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="bar" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ flex: v, background: color, height }} />
      <div style={{ flex: 100 - v, background: track, height }} />
    </div>
  );
}

const TABS = [
  { id: 'inicio', href: '#/', label: 'INICIO', img: icon('home') },
  { id: 'estudios', href: '#/estudios', label: 'ESTUDIOS', img: icon('folder-nav') },
  { id: 'aldea', href: '#/aldea', label: 'ALDEA', img: 'img/sprites/s-aldea-nav.svg' },
  { id: 'perfil', href: '#/ajustes', label: 'PERFIL', img: icon('user') },
];

export function Nav({ active }: { active: string }) {
  return (
    <nav className="nav" aria-label="Principal">
      {TABS.map((t) => (
        <a key={t.id} href={t.href} className={t.id === active ? 'on' : ''} aria-current={t.id === active ? 'page' : undefined}>
          <img src={t.img} alt="" />
          {t.label}
        </a>
      ))}
    </nav>
  );
}

export function Coins({ value }: { value: number }) {
  return (
    <span className="lcd row" style={{ gap: 6, padding: '4px 8px 4px 4px', fontSize: 21, lineHeight: 1 }}>
      <img src="img/sprites/s-moneda.svg" alt="Monedas" width={22} height={22} />
      {value.toLocaleString('es-ES')}
    </span>
  );
}
