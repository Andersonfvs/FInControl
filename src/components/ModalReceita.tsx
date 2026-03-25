'use client';

import { useState, useEffect } from 'react';
import { ref, set, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Transacao } from '@/types';
import { gerarMesKey, gerarId } from '@/utils/financeiro';
import { DadosInputMagico } from '@/utils/categorias';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  usuarioNome: string;
  userId: string;
  transacaoEditando?: Transacao | null;
  onSucesso?: (mensagem: string) => void;
  onErro?: (mensagem: string) => void;
  dadosIniciais?: DadosInputMagico | null;
}

const CATEGORIAS_RECEITA = [
  'Salário',
  'Vale Alimentação',
  'Freelance',
  'Venda Shopee',
  'Investimentos',
  'Bônus',
  'Outras Receitas'
];

export default function ModalReceita({
  aberto,
  onFechar,
  usuarioNome,
  userId,
  transacaoEditando = null,
  onSucesso,
  onErro,
  dadosIniciais = null,
}: Props) {
  const modoEdicao = !!transacaoEditando;

  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [pessoa, setPessoa] = useState(usuarioNome);
  const [categoria, setCategoria] = useState('Salário');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!aberto) return;

    if (modoEdicao && transacaoEditando) {
      // Modo edição: preenche com dados da transação existente
      setData(transacaoEditando.data);
      setDescricao(transacaoEditando.descricao);
      setValor(String(transacaoEditando.valor));
      setPessoa(transacaoEditando.pessoa);
      setCategoria(transacaoEditando.categoria || 'Salário');
    } else if (dadosIniciais) {
      // Modo atalho rápido: preenche com dados do atalho
      setData(dadosIniciais.data || new Date().toISOString().split('T')[0]);
      setDescricao(dadosIniciais.descricao || '');
      setValor(dadosIniciais.valor ? String(dadosIniciais.valor) : '');
      setPessoa(dadosIniciais.pessoa || usuarioNome);
      setCategoria(dadosIniciais.categoria || 'Salário');
    } else {
      // Modo criação limpo
      setData('');
      setDescricao('');
      setValor('');
      setPessoa(usuarioNome);
      setCategoria('Salário');
    }
  }, [transacaoEditando, modoEdicao, dadosIniciais, aberto, usuarioNome]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!data || !valor) {
      onErro?.('Preencha todos os campos obrigatórios!');
      return;
    }

    setCarregando(true);

    try {
      const valorNumerico = parseFloat(valor.replace(',', '.'));
      if (isNaN(valorNumerico) || valorNumerico <= 0) {
        onErro?.('Valor inválido!');
        setCarregando(false);
        return;
      }

      // ── MODO EDIÇÃO ──────────────────────────────────────────────
      if (modoEdicao && transacaoEditando) {
        const transacaoAtualizada: Transacao = {
          ...transacaoEditando,
          data,
          categoria,
          descricao: descricao || categoria,
          valor: valorNumerico,
          pessoa,
        };

        const mesKeyOriginal = gerarMesKey(new Date(transacaoEditando.data + 'T00:00:00'));
        const mesKeyNovo = gerarMesKey(new Date(data + 'T00:00:00'));

        if (mesKeyOriginal === mesKeyNovo) {
          const dbRef = ref(database, `usuarios/${userId}/dadosPorMes/${mesKeyOriginal}`);
          const snapshot = await get(dbRef);
          const existentes: Transacao[] = snapshot.exists()
            ? (Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val()))
            : [];
          await set(dbRef, existentes.map(t => t.id === transacaoEditando.id ? transacaoAtualizada : t));
        } else {
          const refAntigo = ref(database, `usuarios/${userId}/dadosPorMes/${mesKeyOriginal}`);
          const snapAntigo = await get(refAntigo);
          const existentesAntigos: Transacao[] = snapAntigo.exists()
            ? (Array.isArray(snapAntigo.val()) ? snapAntigo.val() : Object.values(snapAntigo.val()))
            : [];
          await set(refAntigo, existentesAntigos.filter(t => t.id !== transacaoEditando.id));

          const refNovo = ref(database, `usuarios/${userId}/dadosPorMes/${mesKeyNovo}`);
          const snapNovo = await get(refNovo);
          const existentesNovos: Transacao[] = snapNovo.exists()
            ? (Array.isArray(snapNovo.val()) ? snapNovo.val() : Object.values(snapNovo.val()))
            : [];
          await set(refNovo, [...existentesNovos, transacaoAtualizada]);
        }

        onSucesso?.('Receita atualizada com sucesso!');
        onFechar();
        return;
      }

      // ── MODO CRIAÇÃO ─────────────────────────────────────────────
      const receita: Transacao = {
        id: gerarId(),
        data,
        categoria,
        descricao: descricao || categoria,
        valor: valorNumerico,
        pessoa,
        tipo: 'renda',
        pago: true,
      };

      const mesKey = gerarMesKey(new Date(data + 'T00:00:00'));
      const dbRef = ref(database, `usuarios/${userId}/dadosPorMes/${mesKey}`);
      const snapshot = await get(dbRef);
      const existentes = snapshot.exists()
        ? (Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val()))
        : [];
      await set(dbRef, [...existentes, receita]);

      onSucesso?.('Receita cadastrada com sucesso!');
      setData('');
      setDescricao('');
      setValor('');
      setPessoa(usuarioNome);
      setCategoria('Salário');
      onFechar();

    } catch (error) {
      console.error('Erro ao salvar receita:', error);
      onErro?.('Erro ao salvar receita. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: '0.75rem',
          width: '90%', maxWidth: '500px', padding: '2rem',
          animation: 'slideUp 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{modoEdicao ? '✏️' : '💰'}</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151' }}>
              {modoEdicao ? 'Editar Receita' : 'Nova Receita'}
            </h2>
          </div>
          <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Data</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} required
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Categoria</label>
            <select value={categoria} onChange={e => setCategoria(e.target.value)}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
              {CATEGORIAS_RECEITA.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Pessoa</label>
            <select value={pessoa} onChange={e => setPessoa(e.target.value)}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
              <option value="Anderson Ferreira">Anderson Ferreira</option>
              <option value="Evelin Mulbaier">Evelin Mulbaier</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Descrição (opcional)</label>
            <input type="text" placeholder={`Ex: ${categoria} de Março`} value={descricao} onChange={e => setDescricao(e.target.value)}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Valor (R$)</label>
            <input type="text" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} required
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
          </div>

          <button type="submit" disabled={carregando} style={{
            width: '100%', padding: '0.875rem',
            background: modoEdicao ? '#06b6d4' : '#10b981',
            color: 'white', border: 'none', borderRadius: '0.5rem',
            fontSize: '0.9375rem', fontWeight: '600',
            cursor: carregando ? 'not-allowed' : 'pointer',
            opacity: carregando ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}>
            {carregando ? 'Salvando...' : modoEdicao ? '💾 Salvar Alterações' : '💰 Cadastrar Receita'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}