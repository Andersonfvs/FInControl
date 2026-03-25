'use client';

interface AtalhoRapido {
  emoji: string;
  titulo: string;
  categoria: string;
  descricao: string;
  cor: string;
}

interface Props {
  onAtalhoClick: (categoria: string, descricao: string) => void;
}

export default function AtalhosRapidos({ onAtalhoClick }: Props) {
  const atalhos: AtalhoRapido[] = [
    { emoji: '⛽', titulo: 'Combustível', categoria: 'Transporte', descricao: 'Combustível', cor: '#f59e0b' },
    { emoji: '🛒', titulo: 'Rancho', categoria: 'Alimentação', descricao: 'Rancho/Mercado', cor: '#10b981' },
    { emoji: '🍕', titulo: 'Lanches', categoria: 'Lazer', descricao: 'Lanche', cor: '#ef4444' },
    { emoji: '☕', titulo: 'Café', categoria: 'Alimentação', descricao: 'Café', cor: '#8b5cf6' },
    { emoji: '💊', titulo: 'Farmácia', categoria: 'Saúde', descricao: 'Farmácia', cor: '#06b6d4' },
  ];

  return (
    <div style={{
      background: 'white',
      borderRadius: '1rem',
      padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: '1.5rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        <span style={{ fontSize: '1.25rem' }}>⚡</span>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: '700',
          color: '#111827',
          margin: 0
        }}>
          Atalhos Rápidos
        </h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '0.75rem'
      }}>
        {atalhos.map((atalho) => (
          <button
            key={atalho.titulo}
            onClick={() => onAtalhoClick(atalho.categoria, atalho.descricao)}
            style={{
              background: `${atalho.cor}15`,
              border: `2px solid ${atalho.cor}40`,
              borderRadius: '0.75rem',
              padding: '0.875rem 0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.375rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${atalho.cor}30`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '1.75rem' }}>{atalho.emoji}</span>
            <span style={{
              fontSize: '0.8125rem',
              fontWeight: '600',
              color: atalho.cor,
              textAlign: 'center'
            }}>
              {atalho.titulo}
            </span>
          </button>
        ))}
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          button {
            min-height: 85px;
          }
        }
      `}</style>
    </div>
  );
}