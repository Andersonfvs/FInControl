'use client';

import { useDarkMode } from '@/hooks/useDarkMode';

interface Props {
  icon: 'chart-pie' | 'chart-bar' | 'list' | 'info';
  title: string;
  description?: string;
  minHeight?: string;
}

const icons = {
  'chart-pie': (color: string) => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
      <path d="M22 12A10 10 0 0 0 12 2v10z"/>
    </svg>
  ),
  'chart-bar': (color: string) => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
      <line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  'list': (color: string) => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="18" rx="2"/>
      <line x1="7" y1="8" x2="17" y2="8"/>
      <line x1="7" y1="12" x2="17" y2="12"/>
      <line x1="7" y1="16" x2="12" y2="16"/>
    </svg>
  ),
  'info': (color: string) => (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
};

export default function EmptyState({ icon, title, description, minHeight = '280px' }: Props) {
  const { darkMode } = useDarkMode();
  const bgCard   = darkMode ? '#1c1d22' : '#ffffff';
  const border   = darkMode ? '#2e3038' : '#e0ddd6';
  const textPrimary = darkMode ? '#e2e3e9' : '#1a1a18';
  const textFaint   = darkMode ? '#5e616e' : '#9a9a95';
  const gold = '#cc9166';

  return (
    <div style={{
      background: bgCard,
      border: `1px solid ${border}`,
      borderRadius: '10px',
      padding: '1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '16px', opacity: 0.5 }}>
          {icons[icon](gold)}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: textPrimary, letterSpacing: '-0.02em', marginBottom: description ? '6px' : 0 }}>
          {title}
        </div>
        {description && (
          <div style={{ fontSize: '12px', color: textFaint, letterSpacing: '-0.007em' }}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
