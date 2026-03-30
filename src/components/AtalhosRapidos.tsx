'use client';

import { useState, useEffect } from 'react';
import { ref, set, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import ModalNovoAtalho from './ModalNovoAtalho';

interface Atalho {
  id: string;
  emoji: string;
  nome: string;
  categoria: string;
  descricao: string;
  tipo: 'despesa' | 'receita';
}

interface Props {
  onAtalhoClick: (categoria: string, descricao: string, tipo: 'despesa' | 'receita') => void;
  userId: string;
}

const ATALHOS_PADRAO: Atalho[] = [
  // Despesas
  { id: '1', emoji: '⛽', nome: 'Combustível', categoria: 'Transporte', descricao: 'Combustível', tipo: 'despesa' },
  { id: '2', emoji: '🛒', nome: 'Mercado', categoria: 'Alimentação', descricao: 'Compras no mercado', tipo: 'despesa' },
  { id: '3', emoji: '🍕', nome: 'Lanches', categoria: 'Lazer', descricao: 'Lanche', tipo: 'despesa' },
  { id: '4', emoji: '☕', nome: 'Café', categoria: 'Alimentação', descricao: 'Café', tipo: 'despesa' },
  { id: '5', emoji: '💊', nome: 'Farmácia', categoria: 'Saúde', descricao: 'Farmácia', tipo: 'despesa' },
  { id: '6', emoji: '🚗', nome: 'Uber', categoria: 'Transporte', descricao: 'Uber', tipo: 'despesa' },
  // Receitas
  { id: '7', emoji: '💰', nome: 'Salário', categoria: 'Salário', descricao: 'Salário', tipo: 'receita' },
  { id: '8', emoji: '🎫', nome: 'Vale', categoria: 'Vale Alimentação', descricao: 'Vale Alimentação', tipo: 'receita' },
  { id: '9', emoji: '📦', nome: 'Shopee', categoria: 'Venda Shopee', descricao: 'Venda Shopee', tipo: 'receita' },
];

export default function AtalhosRapidos({ onAtalhoClick, userId }: Props) {
  const [atalhos, setAtalhos] = useState<Atalho[]>(ATALHOS_PADRAO);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoNovo, setTipoNovo] = useState<'despesa' | 'receita'>('despesa');

  const atalhosDespesas = atalhos.filter(a => a.tipo === 'despesa');
  const atalhosReceitas = atalhos.filter(a => a.tipo === 'receita');

  useEffect(() => {
    if (!userId) return;
    const dbRef = ref(database, `usuarios/${userId}/atalhosRapidos`);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const dados = snapshot.val();
        setAtalhos(Array.isArray(dados) ? dados : Object.values(dados));
      } else {
        set(dbRef, ATALHOS_PADRAO);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  const handleRemoverAtalho = async (id: string) => {
    const novosAtalhos = atalhos.filter(a => a.id !== id);
    await set(ref(database, `usuarios/${userId}/atalhosRapidos`), novosAtalhos);
    setAtalhos(novosAtalhos);
  };

  const handleAdicionarAtalho = async (novoAtalho: Omit<Atalho, 'id'>) => {
    const atalhoComId = {
      ...novoAtalho,
      id: Date.now().toString()
    };
    const novosAtalhos = [...atalhos, atalhoComId];
    await set(ref(database, `usuarios/${userId}/atalhosRapidos`), novosAtalhos);
    setAtalhos(novosAtalhos);
    setModalAberto(false);
  };

  const renderPainel = (titulo: string, emoji: string, lista: Atalho[], cor: string) => (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      padding: '1.25rem',
      marginBottom: '1rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#374151', margin: 0 }}>
            {titulo}
          </h3>
        </div>
        <button
          onClick={() => {
            setTipoNovo(lista[0]?.tipo || 'despesa');
            setModalAberto(true);
          }}
          style={{
            padding: '0.4rem 0.75rem',
            background: cor,
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.8125rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          + Novo
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
        gap: '0.625rem'
      }}>
        {lista.map((atalho) => (
          <div
            key={atalho.id}
            style={{
              position: 'relative',
              background: modoEdicao ? '#fef2f2' : `linear-gradient(135deg, ${cor}15, ${cor}25)`,
              border: modoEdicao ? '2px dashed #fca5a5' : `1px solid ${cor}40`,
              borderRadius: '0.625rem',
              padding: '0.75rem',
              cursor: modoEdicao ? 'default' : 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center'
            }}
            onClick={() => !modoEdicao && onAtalhoClick(atalho.categoria, atalho.descricao, atalho.tipo)}
            onMouseEnter={(e) => {
              if (!modoEdicao) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!modoEdicao) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {modoEdicao && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoverAtalho(atalho.id);
                }}
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  width: '20px',
                  height: '20px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700'
                }}
              >
                ×
              </button>
            )}
            <div style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>
              {atalho.emoji}
            </div>
            <div style={{
              fontSize: '0.8125rem',
              fontWeight: '600',
              color: '#374151'
            }}>
              {atalho.nome}
            </div>
          </div>
        ))}
      </div>

      {lista.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '1.5rem',
          color: '#9ca3af',
          fontSize: '0.8125rem'
        }}>
          Nenhum atalho ainda. Clique em &quot;+ Novo&quot;!
        </div>
      )}
    </div>
  );

  return (
    <>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚡</span>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', margin: 0 }}>
              Atalhos Rápidos
            </h3>
          </div>
          <button
            onClick={() => setModoEdicao(!modoEdicao)}
            style={{
              padding: '0.5rem 0.75rem',
              background: modoEdicao ? '#fef2f2' : '#f3f4f6',
              color: modoEdicao ? '#dc2626' : '#6b7280',
              border: modoEdicao ? '1px solid #fecaca' : '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {modoEdicao ? '✓ Concluir' : '✏️ Editar'}
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem'
        }}>
          {renderPainel('Despesas', '💸', atalhosDespesas, '#ef4444')}
          {renderPainel('Receitas', '💰', atalhosReceitas, '#10b981')}
        </div>
      </div>

      <ModalNovoAtalho
        key={modalAberto ? tipoNovo : 'fechado'}
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        onSalvar={handleAdicionarAtalho}
        tipoInicial={tipoNovo}
      />
    </>
  );
}