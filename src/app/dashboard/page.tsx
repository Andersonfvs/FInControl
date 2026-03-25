'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, set, get } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { SistemaFinanceiro, Usuario, Transacao, CartaoCredito, ItemFatura, FaturaMensal, CategoriaTotal, CategoriaCustomizada } from '@/types';
import { gerarMesKey, calcularResumo, formatarMoeda, obterNomeMes, gerarId } from '@/utils/financeiro';
import { DadosInputMagico } from '@/utils/categorias';
import { useIsMobile } from '@/hooks/useIsMobile';
import Toast from '@/components/Toast';
import ModalReceita from '@/components/ModalReceita';
import ModalDespesa from '@/components/ModalDespesa';
import ListaTransacoes from '@/components/ListaTransacoes';
import GestaoCartoes from '@/components/GestaoCartoes';
import ModalCadastrarCartao from '@/components/ModalCadastrarCartao';
import ModalCompraCartao from '@/components/ModalCompraCartao';
import GraficoPizza from '@/components/GraficoPizza';
import GraficoEvolucao from '@/components/GraficoEvolucao';
import GestaoCategorias from '@/components/GestaoCategorias';
import InsightsInteligentes from '@/components/InsightsInteligentes';
import AlertaFaturas from '@/components/AlertaFaturas';

type ToastTipo = 'sucesso' | 'erro' | 'aviso' | 'info';

export default function DashboardPage() {
  const router = useRouter();
  const isMobile = useIsMobile();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sistema, setSistema] = useState<SistemaFinanceiro>({
    dadosPorMes: {}, pessoasCadastradas: [], metas: [],
    reservaEmergencia: { transacoes: [], taxaCDIAnual: 14.9 },
    cartoes: [], faturas: {}, categoriasCustomizadas: []
  });
  const [dataReferencia, setDataReferencia] = useState(new Date());
  const [filtro, setFiltro] = useState('todos');
  const [tabAtiva, setTabAtiva] = useState('dashboard');

  // Modais
  const [modalReceitaAberto, setModalReceitaAberto] = useState(false);
  const [modalDespesaAberto, setModalDespesaAberto] = useState(false);
  const [modalCartaoAberto, setModalCartaoAberto] = useState(false);
  const [modalCompraAberto, setModalCompraAberto] = useState(false);
  const [cartaoSelecionadoId, setCartaoSelecionadoId] = useState('');
  const [transacaoEditando, setTransacaoEditando] = useState<Transacao | null>(null);

  // NOVO: dados pré-preenchidos via Input Mágico / QR Code
  const [dadosIniciais, setDadosIniciais] = useState<DadosInputMagico | null>(null);

  // Toast
  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' as ToastTipo });
  const showToast = useCallback((mensagem: string, tipo: ToastTipo = 'sucesso') => setToast({ visivel: true, mensagem, tipo }), []);
  const fecharToast = useCallback(() => setToast(t => ({ ...t, visivel: false })), []);

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Identificar nome baseado no email
        const email = user.email?.toLowerCase().trim() || '';
        let nome = 'Usuário';
        
        if (email === 'andersonfvsti@gmail.com') {
          nome = 'Anderson Ferreira';
        } else if (email === 'evelinmulbaier@gmail.com') {
          nome = 'Evelin Mulbaier';
        }
        
        setUsuario({ uid: user.uid, nome, email: user.email || '' });
      } else {
        router.push('/');
      }
      setCarregando(false);
    });
    return () => unsubscribe();
  }, [router]);

  // Firebase com migração de IDs
  useEffect(() => {
    if (!usuario) return;
    const dbRef = ref(database, `usuarios/${usuario.uid}`);
    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const dados = snapshot.val();
      const dadosPorMesOriginal = dados.dadosPorMes || {};
      let precisaMigrar = false;
      const dadosPorMesMigrado: { [key: string]: Transacao[] } = {};
      for (const mesKey in dadosPorMesOriginal) {
        const lista: any[] = Array.isArray(dadosPorMesOriginal[mesKey]) ? dadosPorMesOriginal[mesKey] : Object.values(dadosPorMesOriginal[mesKey] || {});
        dadosPorMesMigrado[mesKey] = lista.map((t: any) => { if (!t?.id) { precisaMigrar = true; return { ...t, id: gerarId() }; } return t as Transacao; });
      }
      if (precisaMigrar) set(ref(database, `usuarios/${usuario.uid}/dadosPorMes`), dadosPorMesMigrado).catch(console.error);
      setSistema({ dadosPorMes: dadosPorMesMigrado, pessoasCadastradas: dados.pessoasCadastradas || [], metas: dados.metas || [], reservaEmergencia: dados.reservaEmergencia || { transacoes: [], taxaCDIAnual: 14.9 }, cartoes: dados.cartoes || [], faturas: dados.faturas || {}, categoriasCustomizadas: dados.categoriasCustomizadas || [] });
    });
    return () => unsubscribe();
  }, [usuario]);

  // Handlers — iguais ao original
  const handleEditar = (transacao: Transacao) => {
    setTransacaoEditando(transacao);
    setDadosIniciais(null);
    if (transacao.tipo === 'despesa') setModalDespesaAberto(true);
    else setModalReceitaAberto(true);
  };

  const handleFecharDespesa = () => {
    setModalDespesaAberto(false);
    setTransacaoEditando(null);
    setDadosIniciais(null);
  };

  const handleFecharReceita = () => {
    setModalReceitaAberto(false);
    setTransacaoEditando(null);
    setDadosIniciais(null);
  };

  // NOVO: Input Mágico — abre o modal certo com dados pré-preenchidos
  const handleInputMagico = useCallback((dados: DadosInputMagico) => {
    setDadosIniciais(dados);
    setTransacaoEditando(null);
    if (dados.tipo === 'renda') setModalReceitaAberto(true);
    else setModalDespesaAberto(true);
  }, []);

  const handleMarcarPago = async (id: string) => {
    if (!usuario) return;
    try {
      const mesKey = gerarMesKey(dataReferencia);
      const transacoes = sistema.dadosPorMes[mesKey] || [];
      const transacao = transacoes.find(t => t.id === id);
      if (!transacao) { showToast('Transação não encontrada', 'erro'); return; }
      await set(ref(database, `usuarios/${usuario.uid}/dadosPorMes/${mesKey}`), transacoes.map(t => t.id === id ? { ...t, pago: !t.pago } : t));
      showToast(!transacao.pago ? '✓ Marcado como pago!' : 'Marcado como pendente', !transacao.pago ? 'sucesso' : 'aviso');
    } catch { showToast('Erro ao atualizar transação', 'erro'); }
  };

  const handleExcluir = async (id: string) => {
    if (!usuario) return;
    try {
      const mesKey = gerarMesKey(dataReferencia);
      const transacoes = sistema.dadosPorMes[mesKey] || [];
      await set(ref(database, `usuarios/${usuario.uid}/dadosPorMes/${mesKey}`), transacoes.filter(t => t.id !== id));
      showToast('Transação excluída!', 'info');
    } catch { showToast('Erro ao excluir transação', 'erro'); }
  };

  const handleDuplicar = async (transacao: Transacao) => {
    if (!usuario) return;
    try {
      const novaTransacao = { ...transacao, id: gerarId(), data: new Date().toISOString().split('T')[0] };
      const mesKey = gerarMesKey(new Date());
      const dbRef = ref(database, `usuarios/${usuario.uid}/dadosPorMes/${mesKey}`);
      const snapshot = await get(dbRef);
      const existentes = snapshot.exists() ? snapshot.val() : [];
      await set(dbRef, Array.isArray(existentes) ? [...existentes, novaTransacao] : [novaTransacao]);
      showToast('Transação duplicada!', 'sucesso');
    } catch { showToast('Erro ao duplicar transação', 'erro'); }
  };

  const handleCadastrarCartao = async (cartao: CartaoCredito) => {
    if (!usuario) return;
    try {
      await set(ref(database, `usuarios/${usuario.uid}/cartoes`), [...sistema.cartoes, cartao]);
      showToast('Cartão cadastrado!', 'sucesso');
    } catch { showToast('Erro ao cadastrar cartão', 'erro'); }
  };

  const handleAdicionarCompra = async (itens: ItemFatura[]) => {
    if (!usuario) return;
    try {
      const novasFaturas = { ...sistema.faturas };
      const porMes: { [k: string]: ItemFatura[] } = {};
      itens.forEach(item => { const k = gerarMesKey(new Date(item.data + 'T00:00:00')); if (!porMes[k]) porMes[k] = []; porMes[k].push(item); });
      for (const mesKey in porMes) {
        if (!novasFaturas[mesKey]) novasFaturas[mesKey] = [];
        const itensDoMes = porMes[mesKey];
        const cartaoId = itensDoMes[0].cartaoId;
        const existente = novasFaturas[mesKey].find(f => f.cartaoId === cartaoId);
        if (existente) { existente.itens.push(...itensDoMes); existente.totalFatura = existente.itens.reduce((s, i) => s + i.valor, 0); }
        else novasFaturas[mesKey].push({ cartaoId, mesReferencia: mesKey, itens: itensDoMes, totalFatura: itensDoMes.reduce((s, i) => s + i.valor, 0), paga: false });
      }
      await set(ref(database, `usuarios/${usuario.uid}/faturas`), novasFaturas);
      showToast('Compra adicionada ao cartão!', 'sucesso');
    } catch { showToast('Erro ao adicionar compra', 'erro'); }
  };

  const handlePagarFatura = async (cartaoId: string, mesKey: string) => {
    if (!usuario) return;
    try {
      const fatura = (sistema.faturas[mesKey] || []).find(f => f.cartaoId === cartaoId);
      const cartao = sistema.cartoes.find(c => c.id === cartaoId);
      if (!fatura || !cartao) { showToast('Fatura ou cartão não encontrado', 'erro'); return; }
      const despesa: Transacao = { id: gerarId(), data: new Date().toISOString().split('T')[0], categoria: 'Cartão de Crédito', descricao: `Fatura ${cartao.nome}`, valor: fatura.totalFatura, pessoa: usuario.nome, tipo: 'despesa', pago: true, cartaoId };
      await set(ref(database, `usuarios/${usuario.uid}/dadosPorMes/${mesKey}`), [...(sistema.dadosPorMes[mesKey] || []), despesa]);
      const novasFaturas = { ...sistema.faturas };
      novasFaturas[mesKey] = novasFaturas[mesKey].map(f => f.cartaoId === cartaoId ? { ...f, paga: true, dataPagamento: new Date().toISOString() } : f);
      await set(ref(database, `usuarios/${usuario.uid}/faturas`), novasFaturas);
      showToast(`Fatura de ${formatarMoeda(fatura.totalFatura)} paga!`, 'sucesso');
    } catch { showToast('Erro ao pagar fatura', 'erro'); }
  };

  const handleSalvarCategorias = async (categorias: CategoriaCustomizada[]) => {
    if (!usuario) return;
    try {
      await set(ref(database, `usuarios/${usuario.uid}/categoriasCustomizadas`), categorias);
      showToast('Categorias salvas!', 'sucesso');
    } catch { showToast('Erro ao salvar categorias', 'erro'); }
  };

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#fafafa' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #e5e7eb', borderTop: '3px solid #06b6d4', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }}></div>
        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Carregando...</span>
      </div>
    </div>
  );

  if (!usuario) return null;

  const mesKey = gerarMesKey(dataReferencia);
  const transacoes = sistema.dadosPorMes[mesKey] || [];
  const dataAnterior = new Date(dataReferencia);
  dataAnterior.setMonth(dataAnterior.getMonth() - 1);
  const transacoesAnterior = sistema.dadosPorMes[gerarMesKey(dataAnterior)] || [];
  const resumo = calcularResumo(transacoes, filtro);
  const transacoesFiltradas = filtro === 'todos' ? transacoes : transacoes.filter(t => t.pessoa.toLowerCase() === filtro.toLowerCase());
  const cartaoSelecionado = sistema.cartoes.find(c => c.id === cartaoSelecionadoId);

  const calcularCategorias = (): CategoriaTotal[] => {
    const cats: { [k: string]: number } = {};
    transacoes.filter(t => t.tipo === 'despesa').forEach(d => { cats[d.categoria] = (cats[d.categoria] || 0) + d.valor; });
    const total = Object.values(cats).reduce((s, v) => s + v, 0);
    if (!total || isNaN(total)) return [];
    return Object.entries(cats).map(([nome, valor]) => ({ nome, total: valor, percentual: (valor / total) * 100, cor: '' })).sort((a, b) => b.total - a.total);
  };

  const calcularEvolucao = () => Array.from({ length: 6 }, (_, i) => {
    const data = new Date(dataReferencia);
    data.setMonth(data.getMonth() - (5 - i));
    const k = gerarMesKey(data);
    const t = sistema.dadosPorMes[k] || [];
    const receitas = t.filter(x => x.tipo === 'renda').reduce((s, x) => s + x.valor, 0);
    const despesas = t.filter(x => x.tipo === 'despesa').reduce((s, x) => s + x.valor, 0);
    return { mes: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), receitas, despesas, saldo: receitas - despesas };
  });

  const px = isMobile ? '1rem' : '3rem';
  const tabs = [
    { id: 'dashboard', label: isMobile ? '📊' : '📊 Dashboard' },
    { id: 'transacoes', label: isMobile ? '📋' : '📋 Transações' },
    { id: 'categorias', label: isMobile ? '🏷️' : '🏷️ Categorias' },
    { id: 'cartoes', label: isMobile ? '💳' : '💳 Cartões' },
    { id: 'metas', label: isMobile ? '🎯' : '🎯 Metas' },
  ];

  return (
    <>
      <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'Inter, sans-serif' }}>

        {/* Header */}
        <header style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: `0.75rem ${px}`, position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ fontSize: isMobile ? '1.125rem' : '1.5rem', fontWeight: '700' }}>💎 {!isMobile && 'FinControl'}</div>
              <div style={{ padding: '0.25rem 0.625rem', background: '#f3f4f6', borderRadius: '0.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                {isMobile ? usuario.nome.split(' ')[0] : usuario.nome}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { setDadosIniciais(null); setTransacaoEditando(null); setModalReceitaAberto(true); }}
                style={{ padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
              >
                {isMobile ? '+ 💰' : '+ Receita'}
              </button>
              <button
                onClick={() => { setDadosIniciais(null); setTransacaoEditando(null); setModalDespesaAberto(true); }}
                style={{ padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}
              >
                {isMobile ? '+ 💸' : '+ Despesa'}
              </button>
              <button
                onClick={async () => { await signOut(auth); router.push('/'); }}
                style={{ padding: isMobile ? '0.5rem 0.625rem' : '0.5rem 1rem', background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}
              >
                {isMobile ? '↩' : 'Sair'}
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: `0 ${px}`, overflowX: 'auto' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: isMobile ? '0' : '0.5rem', minWidth: 'max-content' }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setTabAtiva(tab.id)}
                style={{ padding: isMobile ? '0.875rem 1.125rem' : '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: tabAtiva === tab.id ? '2px solid #06b6d4' : '2px solid transparent', color: tabAtiva === tab.id ? '#06b6d4' : '#6b7280', fontSize: isMobile ? '1.125rem' : '0.875rem', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <main style={{ padding: `1.5rem ${px}`, maxWidth: '1400px', margin: '0 auto' }}>

          {/* Filtros de mês */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={filtro} onChange={e => setFiltro(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.875rem', background: 'white' }}>
              <option value="todos">👥 Todos</option>
              <option value="anderson ferreira">Anderson</option>
              <option value="evelin mulbaier">Evelin</option>
            </select>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={() => { const n = new Date(dataReferencia); n.setMonth(n.getMonth() - 1); setDataReferencia(n); }} style={{ padding: '0.5rem 0.75rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '1rem' }}>←</button>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', minWidth: isMobile ? '100px' : '120px', textAlign: 'center' }}>
                {isMobile ? `${String(dataReferencia.getMonth() + 1).padStart(2, '0')}/${dataReferencia.getFullYear()}` : `${obterNomeMes(dataReferencia)}/${dataReferencia.getFullYear()}`}
              </span>
              <button onClick={() => { const n = new Date(dataReferencia); n.setMonth(n.getMonth() + 1); setDataReferencia(n); }} style={{ padding: '0.5rem 0.75rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '1rem' }}>→</button>
            </div>
          </div>

          {/* Dashboard */}
          {tabAtiva === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.375rem' }}>💰 Receitas</div>
                  <div style={{ fontSize: isMobile ? '1.625rem' : '2rem', fontWeight: '700', color: '#10b981' }}>{formatarMoeda(resumo.totalReceitas)}</div>
                </div>
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.375rem' }}>💸 Despesas</div>
                  <div style={{ fontSize: isMobile ? '1.625rem' : '2rem', fontWeight: '700', color: '#ef4444' }}>{formatarMoeda(resumo.totalDespesas)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>Pago: {formatarMoeda(resumo.despesasPagas)} • Pendente: {formatarMoeda(resumo.despesasPendentes)}</div>
                </div>
                <div style={{ background: resumo.saldoDisponivel >= 0 ? '#10b981' : '#ef4444', borderRadius: '0.75rem', padding: '1.25rem', color: 'white' }}>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.375rem' }}>💵 Disponível</div>
                  <div style={{ fontSize: isMobile ? '1.625rem' : '2rem', fontWeight: '700' }}>{formatarMoeda(resumo.saldoDisponivel)}</div>
                </div>
              </div>

              <AlertaFaturas cartoes={sistema.cartoes} faturas={sistema.faturas} />
              <InsightsInteligentes transacoesAtual={transacoes} transacoesAnterior={transacoesAnterior} />

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <GraficoPizza categorias={calcularCategorias()} />
                <GraficoEvolucao dados={calcularEvolucao()} />
              </div>

              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>Top 5 Maiores Gastos do Mês</h3>
                {transacoes.filter(t => t.tipo === 'despesa').sort((a, b) => b.valor - a.valor).slice(0, 5).map((t, i) => (
                  <div key={`gasto-${t.id}-${i}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 0', borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: '700', flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600', color: '#374151', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.descricao}</div>
                        <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>{t.categoria}</div>
                      </div>
                    </div>
                    <div style={{ fontWeight: '700', fontSize: '0.9375rem', color: '#ef4444', flexShrink: 0, marginLeft: '0.5rem' }}>{formatarMoeda(t.valor)}</div>
                  </div>
                ))}
                {transacoes.filter(t => t.tipo === 'despesa').length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280', fontSize: '0.875rem' }}>Nenhuma despesa neste mês</div>
                )}
              </div>
            </div>
          )}

          {/* ATUALIZADO: ListaTransacoes com novos props */}
          {tabAtiva === 'transacoes' && (
            <ListaTransacoes
              transacoes={transacoesFiltradas}
              usuarioNome={usuario.nome}
              onEditar={handleEditar}
              onExcluir={handleExcluir}
              onMarcarPago={handleMarcarPago}
              onDuplicar={handleDuplicar}
              onInputMagico={handleInputMagico}
              onToast={showToast}
            />
          )}

          {tabAtiva === 'categorias' && <GestaoCategorias transacoes={transacoes} mesReferencia={mesKey} faturas={sistema.faturas} categoriasCustomizadas={sistema.categoriasCustomizadas || []} onSalvarCategorias={handleSalvarCategorias} />}
          {tabAtiva === 'cartoes' && <GestaoCartoes cartoes={sistema.cartoes} faturas={sistema.faturas} mesReferencia={mesKey} onCadastrarCartao={() => setModalCartaoAberto(true)} onAdicionarCompra={(id) => { setCartaoSelecionadoId(id); setModalCompraAberto(true); }} onPagarFatura={handlePagarFatura} />}
          {!['dashboard', 'transacoes', 'categorias', 'cartoes'].includes(tabAtiva) && (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Em desenvolvimento</h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Este módulo será adicionado em breve!</p>
            </div>
          )}
        </main>
      </div>

      {/* Modais */}
      <ModalReceita
        aberto={modalReceitaAberto}
        onFechar={handleFecharReceita}
        usuarioNome={usuario.nome}
        userId={usuario.uid}
        transacaoEditando={transacaoEditando?.tipo === 'renda' ? transacaoEditando : null}
        onSucesso={msg => showToast(msg, 'sucesso')}
        onErro={msg => showToast(msg, 'erro')}
      />

      {/* ATUALIZADO: ModalDespesa com dadosIniciais */}
      <ModalDespesa
        aberto={modalDespesaAberto}
        onFechar={handleFecharDespesa}
        usuarioNome={usuario.nome}
        userId={usuario.uid}
        categorias={sistema.categoriasCustomizadas || []}
        transacaoEditando={transacaoEditando?.tipo === 'despesa' ? transacaoEditando : null}
        dadosIniciais={dadosIniciais?.tipo === 'despesa' ? dadosIniciais : null}
        onSucesso={msg => showToast(msg, 'sucesso')}
        onErro={msg => showToast(msg, 'erro')}
      />

      <ModalCadastrarCartao aberto={modalCartaoAberto} onFechar={() => setModalCartaoAberto(false)} onSalvar={handleCadastrarCartao} />
      {cartaoSelecionado && (
        <ModalCompraCartao aberto={modalCompraAberto} cartaoId={cartaoSelecionado.id} cartaoNome={cartaoSelecionado.nome} onFechar={() => { setModalCompraAberto(false); setCartaoSelecionadoId(''); }} onSalvar={handleAdicionarCompra} usuarioNome={usuario.nome} />
      )}

      <Toast mensagem={toast.mensagem} tipo={toast.tipo} visivel={toast.visivel} onFechar={fecharToast} />

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}