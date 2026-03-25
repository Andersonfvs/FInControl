'use client';

import { useState, useEffect } from 'react';
import { ref, set, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Transacao, CategoriaCustomizada } from '@/types';
import { gerarMesKey, gerarId } from '@/utils/financeiro';
import { obterIconeCategoria } from '@/utils/categorias';
import LeitorQRCode from '@/components/LeitorQRCode';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  usuarioNome: string;
  userId: string; // NOVO: userId necessário
  categorias?: CategoriaCustomizada[];
  transacaoEditando?: Transacao | null;
  dadosIniciais?: {
    valor?: number;
    descricao?: string;
    data?: string;
    pessoa?: string;
    categoria?: string;
    notaFiscalUrl?: string;
  } | null;
  onSucesso?: (mensagem: string) => void;
  onErro?: (mensagem: string) => void;
}

const CATEGORIAS_PADRAO: string[] = [
  'Alimentação', 'Mercado', 'Restaurante', 'Transporte', 'Combustível',
  'Saúde', 'Farmácia', 'Academia', 'Educação', 'Moradia',
  'Conta de Luz', 'Conta de Água', 'Internet', 'Telefone',
  'Streaming', 'Lazer', 'Roupas', 'Cartão de Crédito', 'Outros'
];

export default function ModalDespesa({
  aberto,
  onFechar,
  usuarioNome,
  userId,
  categorias = [],
  transacaoEditando = null,
  dadosIniciais = null,
  onSucesso,
  onErro
}: Props) {
  const modoEdicao = !!transacaoEditando;

  const [data, setData] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categoriaCustom, setCategoriaCustom] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [dividir, setDividir] = useState(false);
  const [pessoa, setPessoa] = useState(usuarioNome);
  const [carregando, setCarregando] = useState(false);
  const [qrAberto, setQrAberto] = useState(false);
  const [notaFiscalUrl, setNotaFiscalUrl] = useState('');
  const [destacar, setDestacar] = useState(false);

  const categoriasCustomDespesa = categorias
    .filter(c => c.tipo === 'despesa')
    .map(c => c.nome);

  const todasCategorias = Array.from(new Set([
    ...CATEGORIAS_PADRAO,
    ...categoriasCustomDespesa
  ])).sort();

  const categoriaFinal = categoria === '__custom__' ? categoriaCustom : categoria;

  useEffect(() => {
    if (!aberto) return;

    if (modoEdicao && transacaoEditando) {
      setData(transacaoEditando.data);
      setDescricao(transacaoEditando.descricao);
      setValor(String(transacaoEditando.valor));
      setPessoa(transacaoEditando.pessoa);
      setDividir(transacaoEditando.dividido || false);
      setParcelas('1');
      setNotaFiscalUrl('');
      if (todasCategorias.includes(transacaoEditando.categoria)) {
        setCategoria(transacaoEditando.categoria);
      } else {
        setCategoria('__custom__');
        setCategoriaCustom(transacaoEditando.categoria);
      }
    } else if (dadosIniciais) {
      setData(dadosIniciais.data || new Date().toISOString().split('T')[0]);
      if (dadosIniciais.descricao) setDescricao(dadosIniciais.descricao);
      if (dadosIniciais.valor)    setValor(String(dadosIniciais.valor));
      if (dadosIniciais.pessoa)   setPessoa(dadosIniciais.pessoa);
      if (dadosIniciais.notaFiscalUrl) setNotaFiscalUrl(dadosIniciais.notaFiscalUrl);
      if (dadosIniciais.categoria) {
        if (todasCategorias.includes(dadosIniciais.categoria)) {
          setCategoria(dadosIniciais.categoria);
        } else {
          setCategoria('__custom__');
          setCategoriaCustom(dadosIniciais.categoria);
        }
      }
      setDestacar(true);
      setTimeout(() => setDestacar(false), 2500);
    } else {
      setData('');
      setCategoria('');
      setCategoriaCustom('');
      setDescricao('');
      setValor('');
      setParcelas('1');
      setDividir(false);
      setPessoa(usuarioNome);
      setNotaFiscalUrl('');
    }
  }, [transacaoEditando, modoEdicao, dadosIniciais, aberto]);

  const handleQRLeitura = (dados: { url: string; valor?: number; descricao: string }) => {
    setQrAberto(false);
    setNotaFiscalUrl(dados.url);
    if (dados.valor) setValor(String(dados.valor));
    setDescricao(dados.descricao);
    if (!data) setData(new Date().toISOString().split('T')[0]);
    setDestacar(true);
    setTimeout(() => setDestacar(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!data || !categoriaFinal || !valor) {
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
          categoria: categoriaFinal,
          descricao: descricao || categoriaFinal,
          valor: valorNumerico,
          pessoa: dividir ? transacaoEditando.pessoa : pessoa,
          dividido: dividir
        };

        const mesKeyOriginal = gerarMesKey(new Date(transacaoEditando.data + 'T00:00:00'));
        const mesKeyNovo = gerarMesKey(new Date(data + 'T00:00:00'));

        if (mesKeyOriginal === mesKeyNovo) {
          const caminhoMes = `usuarios/${userId}/dadosPorMes/${mesKeyOriginal}`;
          const dbRefMes = ref(database, caminhoMes);
          const snapshot = await get(dbRefMes);
          const existentes: Transacao[] = snapshot.exists()
            ? (Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val()))
            : [];
          await set(dbRefMes, existentes.map(t => t.id === transacaoEditando.id ? transacaoAtualizada : t));
        } else {
          const caminhoAntigo = `usuarios/${userId}/dadosPorMes/${mesKeyOriginal}`;
          const dbRefAntigo = ref(database, caminhoAntigo);
          const snapAntigo = await get(dbRefAntigo);
          const existentesAntigos: Transacao[] = snapAntigo.exists()
            ? (Array.isArray(snapAntigo.val()) ? snapAntigo.val() : Object.values(snapAntigo.val()))
            : [];
          await set(dbRefAntigo, existentesAntigos.filter(t => t.id !== transacaoEditando.id));

          const caminhoNovo = `usuarios/${userId}/dadosPorMes/${mesKeyNovo}`;
          const dbRefNovo = ref(database, caminhoNovo);
          const snapNovo = await get(dbRefNovo);
          const existentesNovos: Transacao[] = snapNovo.exists()
            ? (Array.isArray(snapNovo.val()) ? snapNovo.val() : Object.values(snapNovo.val()))
            : [];
          await set(dbRefNovo, [...existentesNovos, transacaoAtualizada]);
        }

        onSucesso?.('Despesa atualizada com sucesso!');
        onFechar();
        return;
      }

      // ── MODO CRIAÇÃO ─────────────────────────────────────────────
      const numParcelas = parseInt(parcelas) || 1;
      const valorPorParcela = valorNumerico / numParcelas;
      const transacoes: Transacao[] = [];

      for (let i = 0; i < numParcelas; i++) {
        const dataBase = new Date(data + 'T00:00:00');
        dataBase.setMonth(dataBase.getMonth() + i);
        const dataFormatada = dataBase.toISOString().split('T')[0];
        
        // Só incluir parcelamento se tiver mais de 1 parcela
        const dadosParcelamento = numParcelas > 1 
          ? { parcelamento: { parcelaAtual: i + 1, totalParcelas: numParcelas } }
          : {};
        
        const extra = notaFiscalUrl ? { notaFiscalUrl } : {};

        if (dividir) {
          const valorPorPessoa = valorPorParcela / 2;
          transacoes.push(
            { id: gerarId(), data: dataFormatada, categoria: categoriaFinal, descricao: descricao || categoriaFinal, valor: valorPorPessoa, pessoa: 'Anderson Ferreira', tipo: 'despesa', pago: false, dividido: true, ...dadosParcelamento, ...extra },
            { id: gerarId(), data: dataFormatada, categoria: categoriaFinal, descricao: descricao || categoriaFinal, valor: valorPorPessoa, pessoa: 'Evelin Mulbaier', tipo: 'despesa', pago: false, dividido: true, ...dadosParcelamento, ...extra }
          );
        } else {
          transacoes.push({
            id: gerarId(), data: dataFormatada, categoria: categoriaFinal,
            descricao: descricao || categoriaFinal, valor: valorPorParcela,
            pessoa, tipo: 'despesa', pago: false, ...dadosParcelamento, ...extra
          });
        }
      }

      const porMes: { [k: string]: Transacao[] } = {};
      transacoes.forEach(t => {
        const k = gerarMesKey(new Date(t.data + 'T00:00:00'));
        if (!porMes[k]) porMes[k] = [];
        porMes[k].push(t);
      });

      for (const mesKey in porMes) {
        const caminho = `usuarios/${userId}/dadosPorMes/${mesKey}`;
        const dbRef = ref(database, caminho);
        const snapshot = await get(dbRef);
        const existentes = snapshot.exists()
          ? (Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val()))
          : [];
        await set(dbRef, [...existentes, ...porMes[mesKey]]);
      }

      onSucesso?.(notaFiscalUrl ? '🧾 Nota fiscal registrada!' : 'Despesa cadastrada com sucesso!');
      setData(''); setCategoria(''); setCategoriaCustom(''); setDescricao('');
      setValor(''); setParcelas('1'); setDividir(false); setPessoa(usuarioNome); setNotaFiscalUrl('');
      onFechar();

    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      onErro?.('Erro ao salvar despesa. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  if (!aberto) return null;

  return (
    <>
      <div
        onClick={onFechar}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease'
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'white', borderRadius: '0.75rem',
            width: '90%', maxWidth: '500px',
            padding: '2rem', maxHeight: '90vh', overflowY: 'auto',
            animation: 'slideUp 0.25s ease'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{modoEdicao ? '✏️' : '💸'}</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151' }}>
                {modoEdicao ? 'Editar Despesa' : 'Nova Despesa'}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {!modoEdicao && (
                <button
                  type="button"
                  onClick={() => setQrAberto(true)}
                  title="Ler Nota Fiscal NFC-e"
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: '#f0fdf4', border: '1px solid #bbf7d0',
                    borderRadius: '0.5rem', cursor: 'pointer',
                    fontSize: '0.8125rem', fontWeight: '600', color: '#065f46',
                    display: 'flex', alignItems: 'center', gap: '0.375rem'
                  }}
                >
                  📷 NF-e
                </button>
              )}
              <button onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
          </div>

          {destacar && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#0369a1' }}>
              ✨ <strong>Campos preenchidos automaticamente.</strong> Verifique e salve!
            </div>
          )}

          {notaFiscalUrl && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>🧾 <strong>Nota Fiscal vinculada.</strong>{' '}
                <a href={notaFiscalUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#059669' }}>Ver NFC-e ↗</a>
              </span>
              <button onClick={() => setNotaFiscalUrl('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem' }}>✕</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)} required
                style={{ width: '100%', padding: '0.625rem', border: `1px solid ${destacar && dadosIniciais?.data ? '#06b6d4' : '#e5e7eb'}`, borderRadius: '0.5rem', fontSize: '0.875rem', background: destacar && dadosIniciais?.data ? '#f0f9ff' : 'white', transition: 'all 0.3s' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Categoria
              </label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                required={categoria !== '__custom__'}
                style={{ width: '100%', padding: '0.625rem', border: `1px solid ${destacar && dadosIniciais?.categoria ? '#06b6d4' : '#e5e7eb'}`, borderRadius: '0.5rem', fontSize: '0.875rem', background: destacar && dadosIniciais?.categoria ? '#f0f9ff' : 'white', transition: 'all 0.3s' }}
              >
                <option value="">Selecione uma categoria...</option>
                {todasCategorias.map(c => (
                  <option key={c} value={c}>{obterIconeCategoria(c)} {c}</option>
                ))}
                <option value="__custom__">➕ Nova categoria...</option>
              </select>
              {categoria === '__custom__' && (
                <input
                  type="text"
                  placeholder="Digite o nome da categoria"
                  value={categoriaCustom}
                  onChange={e => setCategoriaCustom(e.target.value)}
                  required autoFocus
                  style={{ width: '100%', padding: '0.625rem', border: '1px solid #06b6d4', borderRadius: '0.5rem', fontSize: '0.875rem', marginTop: '0.5rem' }}
                />
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Descrição (opcional)</label>
              <input type="text" placeholder="Ex: Supermercado Extra" value={descricao} onChange={e => setDescricao(e.target.value)}
                style={{ width: '100%', padding: '0.625rem', border: `1px solid ${destacar && dadosIniciais?.descricao ? '#06b6d4' : '#e5e7eb'}`, borderRadius: '0.5rem', fontSize: '0.875rem', background: destacar && dadosIniciais?.descricao ? '#f0f9ff' : 'white', transition: 'all 0.3s' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: modoEdicao ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Valor Total (R$)</label>
                <input type="text" placeholder="0,00" value={valor} onChange={e => setValor(e.target.value)} required
                  style={{ width: '100%', padding: '0.625rem', border: `1px solid ${destacar && dadosIniciais?.valor ? '#06b6d4' : '#e5e7eb'}`, borderRadius: '0.5rem', fontSize: '0.875rem', background: destacar && dadosIniciais?.valor ? '#f0f9ff' : 'white', transition: 'all 0.3s' }} />
              </div>
              {!modoEdicao && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Parcelas</label>
                  <input type="number" min="1" value={parcelas} onChange={e => setParcelas(e.target.value)}
                    style={{ width: '100%', padding: '0.625rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }} />
                </div>
              )}
            </div>

            {modoEdicao && transacaoEditando?.parcelamento && (
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#92400e' }}>
                ℹ️ Esta é a parcela {transacaoEditando.parcelamento.parcelaAtual}/{transacaoEditando.parcelamento.totalParcelas}. Só esta parcela será alterada.
              </div>
            )}

            {!dividir && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Pessoa</label>
                <select value={pessoa} onChange={e => setPessoa(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: `1px solid ${destacar && dadosIniciais?.pessoa ? '#06b6d4' : '#e5e7eb'}`, borderRadius: '0.5rem', fontSize: '0.875rem', background: destacar && dadosIniciais?.pessoa ? '#f0f9ff' : 'white', transition: 'all 0.3s' }}>
                  <option value="Anderson Ferreira">Anderson Ferreira</option>
                  <option value="Evelin Mulbaier">Evelin Mulbaier</option>
                </select>
              </div>
            )}

            {!modoEdicao && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={dividir} onChange={e => setDividir(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444' }} />
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>Dividir 50/50 com o casal</span>
                </label>
              </div>
            )}

            <button type="submit" disabled={carregando} style={{
              width: '100%', padding: '0.875rem',
              background: modoEdicao ? '#06b6d4' : '#ef4444',
              color: 'white', border: 'none', borderRadius: '0.5rem',
              fontSize: '0.9375rem', fontWeight: '600',
              cursor: carregando ? 'not-allowed' : 'pointer',
              opacity: carregando ? 0.6 : 1, transition: 'opacity 0.2s'
            }}>
              {carregando ? 'Salvando...' : modoEdicao ? '💾 Salvar Alterações' : notaFiscalUrl ? '🧾 Salvar com Nota Fiscal' : '💸 Cadastrar Despesa'}
            </button>
          </form>
        </div>
      </div>

      <LeitorQRCode
        aberto={qrAberto}
        onFechar={() => setQrAberto(false)}
        onLeitura={handleQRLeitura}
      />

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </>
  );
}