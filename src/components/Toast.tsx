'use client';

import { useEffect } from 'react';

interface ToastProps {
  mensagem: string;
  tipo: 'sucesso' | 'erro' | 'aviso' | 'info';
  visivel: boolean;
  onFechar: () => void;
}

const CONFIGS = {
  sucesso: { icone: '✅', bg: '#10b981' },
  erro:    { icone: '❌', bg: '#ef4444' },
  aviso:   { icone: '⚠️', bg: '#f59e0b' },
  info:    { icone: 'ℹ️', bg: '#06b6d4' }
};

export default function Toast({ mensagem, tipo, visivel, onFechar }: ToastProps) {
  useEffect(() => {
    if (!visivel) return;
    const timer = setTimeout(onFechar, 3500);
    return () => clearTimeout(timer);
  }, [visivel, onFechar]);

  const config = CONFIGS[tipo];

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      zIndex: 9999,
      transform: visivel ? 'translateY(0)' : 'translateY(120px)',
      opacity: visivel ? 1 : 0,
      transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
      pointerEvents: visivel ? 'auto' : 'none'
    }}>
      <div style={{
        background: config.bg,
        color: 'white',
        padding: '1rem 1.25rem',
        borderRadius: '0.75rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        minWidth: '280px',
        maxWidth: '380px',
        fontSize: '0.9375rem',
        fontWeight: '500'
      }}>
        <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{config.icone}</span>
        <span style={{ flex: 1, lineHeight: 1.4 }}>{mensagem}</span>
        <button
          onClick={onFechar}
          style={{
            background: 'rgba(255,255,255,0.25)',
            border: 'none',
            color: 'white',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '0.8rem',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700'
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}