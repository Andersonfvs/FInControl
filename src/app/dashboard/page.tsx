'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, onValue, set, get } from 'firebase/database';
import { auth, database } from '@/lib/firebase';
import { SistemaFinanceiro, Usuario, Transacao, CartaoCredito, ItemFatura, CategoriaTotal, CategoriaCustomizada, FaturaMensal } from '@/types';
import { gerarMesKey, calcularResumo, formatarMoeda, obterNomeMes, gerarId } from '@/utils/financeiro';
import { DadosInputMagico } from '@/utils/categorias';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useDarkMode } from '@/hooks/useDarkMode';
import Toast from '@/components/Toast';
import InputMagico from '@/components/InputMagico';
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
import AtalhosRapidos from '@/components/AtalhosRapidos';
import ReservaEmergencia from '@/components/ReservaEmergencia';
import MelhorCartao from '@/components/MelhorCartao';
import CustoKm from '@/components/CustoKm';

type ToastTipo = 'sucesso' | 'erro' | 'aviso' | 'info';

export default function DashboardPage() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const { darkMode, toggleDarkMode } = useDarkMode();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [sistema, setSistema] = useState<SistemaFinanceiro>({
    dadosPorMes: {}, pessoasCadastradas: [], metas: [],
    reservaEmergencia: { transacoes: [], taxaCDIAnual: 14.9 },
    cartoes: [], faturas: {}, categoriasCustomizadas: [],
  });
  const [dataReferencia, setDataReferencia] = useState(new Date());
  const [filtro, setFiltro] = useState('todos');
  const [tabAtiva, setTabAtiva] = useState('dashboard');

  const [modalReceitaAberto, setModalReceitaAberto] = useState(false);
  const [modalDespesaAberto, setModalDespesaAberto] = useState(false);
  const [modalCartaoAberto, setModalCartaoAberto] = useState(false);
  const [modalCompraAberto, setModalCompraAberto] = useState(false);
  const [cartaoSelecionadoId, setCartaoSelecionadoId] = useState('');
  const [transacaoEditando, setTransacaoEditando] = useState<Transacao | null>(null);
  const [cartaoEditando, setCartaoEditando] = useState<CartaoCredito | null>(null);

  const [categoriaPreenchida, setCategoriaPreenchida] = useState('');
  const [descricaoPreenchida, setDescricaoPreenchida] = useState('');
  const [dadosIniciais, setDadosIniciais] = useState<DadosInputMagico | null>(null);

  const [toast, setToast] = useState({ visivel: false, mensagem: '', tipo: 'sucesso' as ToastTipo });
  const showToast = useCallback((mensagem: string, tipo: ToastTipo = 'sucesso') => setToast({ visivel: true, mensagem, tipo }), []);
  const fecharToast = useCallback(() => setToast(t => ({ ...t, visivel: false })), []);

  // ─── AUTH ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const email = user.email?.toLowerCase().trim() || '';
        let nome = 'Usuário';
        if (email === 'andersonfvsti@gmail.com') nome = 'Anderson Ferreira';
        else if (email === 'evelinmulbaier@gmail.com') nome = 'Evelin Mulbaier';
        setUsuario({ uid: user.uid, nome, email: user.email || '' });
        setCarregando(false);
      } else {
        router.replace('/');
      }
    });
  return () => unsubscribe();
  }, [router]);

  // ─── Firebase ─────────────────────────────────────────────────────────────
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
        const lista: Transacao[] = Array.isArray(dadosPorMesOriginal[mesKey])
          ? (dadosPorMesOriginal[mesKey] as Transacao[])
          : Object.values(dadosPorMesOriginal[mesKey] || {} as Record<string, Transacao>);
        dadosPorMesMigrado[mesKey] = lista.map((t: Transacao) => {
          if (!t?.id) { precisaMigrar = true; return { ...t, id: gerarId() }; }
          return t;
        });
      }
      if (precisaMigrar) set(ref(database, `usuarios/${usuario.uid}/dadosPorMes`), dadosPorMesMigrado).catch(console.error);

      const faturasOriginal = dados.faturas || {};
      let precisaMigrarFaturas = false;
      const faturasMigradas: { [mesKey: string]: FaturaMensal[] } = {};
      for (const mesKey in faturasOriginal) {
        const lista: FaturaMensal[] = Array.isArray(faturasOriginal[mesKey])
          ? (faturasOriginal[mesKey] as FaturaMensal[])
          : Object.values(faturasOriginal[mesKey] || {} as Record<string, FaturaMensal>);
        faturasMigradas[mesKey] = lista.map((f: FaturaMensal) => {
          if (!f) return f;
          if (!f.itens) { precisaMigrarFaturas = true; return { ...f, itens: [], totalFatura: f.totalFatura || 0 } as FaturaMensal; }
          if (!Array.isArray(f.itens)) { precisaMigrarFaturas = true; return { ...f, itens: Object.values(f.itens || {}) } as FaturaMensal; }
          return f;
        });
      }
      if (precisaMigrarFaturas) set(ref(database, `usuarios/${usuario.uid}/faturas`), faturasMigradas).catch(console.error);

      const reservaRaw = dados.reservaEmergencia || {};
      const reservaNormalizada = {
        transacoes: Array.isArray(reservaRaw.transacoes) ? reservaRaw.transacoes : Object.values(reservaRaw.transacoes || {}),
        taxaCDIAnual: reservaRaw.taxaCDIAnual || 14.9,
        meta: reservaRaw.meta,
        ultimoCreditoCDI: reservaRaw.ultimoCreditoCDI,
      };

      setSistema({
        dadosPorMes: dadosPorMesMigrado,
        pessoasCadastradas: dados.pessoasCadastradas || [],
        metas: dados.metas || [],
        reservaEmergencia: reservaNormalizada,
        cartoes: dados.cartoes || [],
        faturas: precisaMigrarFaturas ? faturasMigradas : faturasOriginal,
        categoriasCustomizadas: dados.categoriasCustomizadas || [],
      });
    });
  return () => unsubscribe();
  }, [usuario]);

  const handleEditar = (transacao: Transacao) => {
    setTransacaoEditando(transacao);
    setDadosIniciais(null);
    setCategoriaPreenchida('');
    setDescricaoPreenchida('');
    if (transacao.tipo === 'despesa') setModalDespesaAberto(true);
    else setModalReceitaAberto(true);
  };

  const handleFecharDespesa = () => {
    setModalDespesaAberto(false);
    setTransacaoEditando(null);
    setDadosIniciais(null);
    setCategoriaPreenchida('');
    setDescricaoPreenchida('');
  };

  const handleFecharReceita = () => {
    setModalReceitaAberto(false);
    setTransacaoEditando(null);
    setDadosIniciais(null);
  };

  const handleInputMagico = useCallback(async (dados: DadosInputMagico) => {
    if (!usuario) return;
    try {
      if (dados.metodoPagamento === 'cartao' && dados.cartaoId) {
        const totalParcelas = dados.parcelas && dados.parcelas > 1 ? dados.parcelas : 1;
        const valorParcela = parseFloat((dados.valor / totalParcelas).toFixed(2));
        const novasFaturas = { ...sistema.faturas };
        for (let i = 0; i < totalParcelas; i++) {
          const dataBase = new Date(dados.data + 'T00:00:00');
          dataBase.setMonth(dataBase.getMonth() + i);
          const mesKey = gerarMesKey(dataBase);
          const item: ItemFatura = {
            id: gerarId(), cartaoId: dados.cartaoId,
            data: dataBase.toISOString().split('T')[0],
            descricao: dados.descricao, valor: valorParcela,
            categoria: dados.categoria, pessoa: dados.pessoa,
            parcelas: totalParcelas, parcelaAtual: i + 1,
            ...(totalParcelas > 1 && { parcelamento: { parcelaAtual: i + 1, totalParcelas } }),
          };
          if (!novasFaturas[mesKey]) novasFaturas[mesKey] = [];
          const existente = novasFaturas[mesKey].find(f => f.cartaoId === dados.cartaoId);
          if (existente) {
            existente.itens.push(item);
            existente.totalFatura = existente.itens.reduce((s, it) => s + it.valor, 0);
          } else {
            novasFaturas[mesKey].push({ cartaoId: dados.cartaoId, mesReferencia: mesKey, itens: [item], totalFatura: valorParcela, paga: false });
          }
        }
        await set(ref(database, `usuarios/${usuario.uid}/faturas`), novasFaturas);
        const textoParcelamento = totalParcelas > 1 ? ` em ${totalParcelas}x de ${formatarMoeda(valorParcela)}` : '';
        showToast(`💳 ${dados.descricao}${textoParcelamento} adicionada à fatura do ${dados.cartaoNome || 'cartão'}!`, 'sucesso');
      } else if (dados.metodoPagamento === 'cartao' && !dados.cartaoId) {
        showToast('❌ Cartão não encontrado. Cadastre o cartão primeiro!', 'erro');
      } else {
        const novaTransacao: Transacao = {
          id: gerarId(), data: dados.data, categoria: dados.categoria,
          descricao: dados.descricao, valor: dados.valor, pessoa: dados.pessoa,
          tipo: dados.tipo, pago: dados.pago,
        };
        const mesKey = gerarMesKey(new Date(dados.data + 'T00:00:00'));
        const dbRef = ref(database, `usuarios/${usuario.uid}/dadosPorMes/${mesKey}`);
        const snapshot = await get(dbRef);
        const existentes = snapshot.exists()
          ? (Array.isArray(snapshot.val()) ? snapshot.val() : Object.values(snapshot.val()))
          : [];
        await set(dbRef, [...existentes, novaTransacao]);
        showToast(`${dados.tipo === 'despesa' ? '💸' : '💰'} ${dados.descricao} adicionada!`, 'sucesso');
      }
    } catch { showToast('Erro ao adicionar transação', 'erro'); }
  }, [usuario, sistema.faturas, showToast]);

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
      const transacao = transacoes.find(t => t.id === id);
      if (transacao?.cartaoId && transacao.categoria === 'Cartão de Crédito') {
        const novasFaturas = JSON.parse(JSON.stringify(sistema.faturas));
        if (novasFaturas[mesKey]) {
          novasFaturas[mesKey] = (novasFaturas[mesKey] as FaturaMensal[]).map((f: FaturaMensal) => {
            if (f.cartaoId !== transacao.cartaoId) return f;
            const { dataPagamento, ...resto } = f;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const _ = dataPagamento;
            return { ...resto, paga: false };
          });
          await set(ref(database, `usuarios/${usuario.uid}/faturas`), novasFaturas);
        }
        showToast('Pagamento removido — fatura voltou para pendente!', 'aviso');
      } else {
        showToast('Transação excluída!', 'info');
      }
      await set(ref(database, `usuarios/${usuario.uid}/dadosPorMes/${mesKey}`), transacoes.filter(t => t.id !== id));
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

  const handleSalvarCartao = async (cartao: CartaoCredito) => {
    if (!usuario) return;
    try {
      let novosCartoes: CartaoCredito[];
      if (cartaoEditando) {
        novosCartoes = sistema.cartoes.map(c => c.id === cartao.id ? cartao : c);
        showToast(`Cartão ${cartao.nome} atualizado!`, 'sucesso');
      } else {
        novosCartoes = [...sistema.cartoes, cartao];
        showToast(`Cartão ${cartao.nome} cadastrado!`, 'sucesso');
      }
      await set(ref(database, `usuarios/${usuario.uid}/cartoes`), novosCartoes);
      setCartaoEditando(null);
    } catch { showToast('Erro ao salvar cartão', 'erro'); }
  };

  const handleEditarCartao = (cartao: CartaoCredito) => { setCartaoEditando(cartao); setModalCartaoAberto(true); };

  const handleExcluirCartao = async (cartaoId: string) => {
    if (!usuario) return;
    try {
      await set(ref(database, `usuarios/${usuario.uid}/cartoes`), sistema.cartoes.filter(c => c.id !== cartaoId));
      showToast('Cartão excluído!', 'info');
    } catch { showToast('Erro ao excluir cartão', 'erro'); }
  };

  const handleExcluirItemFatura = async (cartaoId: string, itemId: string, mesKey: string) => {
    if (!usuario) return;
    try {
      const novasFaturas = { ...sistema.faturas };
      if (!novasFaturas[mesKey]) return;
      novasFaturas[mesKey] = novasFaturas[mesKey].map(f => {
        if (f.cartaoId !== cartaoId) return f;
        const novosItens = (f.itens || []).filter(i => i.id !== itemId);
        return { ...f, itens: novosItens, totalFatura: novosItens.reduce((s, i) => s + i.valor, 0) };
      });
      await set(ref(database, `usuarios/${usuario.uid}/faturas`), novasFaturas);
      showToast('Item removido da fatura!', 'info');
    } catch { showToast('Erro ao remover item', 'erro'); }
  };

  const handleEditarItemFatura = async (cartaoId: string, item: ItemFatura, mesKey: string) => {
    if (!usuario) return;
    try {
      const novasFaturas = { ...sistema.faturas };
      if (!novasFaturas[mesKey]) return;
      novasFaturas[mesKey] = novasFaturas[mesKey].map(f => {
        if (f.cartaoId !== cartaoId) return f;
        const novosItens = (f.itens || []).map(i => i.id === item.id ? item : i);
        return { ...f, itens: novosItens, totalFatura: novosItens.reduce((s, i) => s + i.valor, 0) };
      });
      await set(ref(database, `usuarios/${usuario.uid}/faturas`), novasFaturas);
      showToast('Item da fatura atualizado!', 'sucesso');
    } catch { showToast('Erro ao editar item', 'erro'); }
  };

  const handleAdicionarCompra = async (itens: ItemFatura[]) => {
    if (!usuario) return;
    try {
      const novasFaturas = JSON.parse(JSON.stringify(sistema.faturas));
      const porMes: { [k: string]: ItemFatura[] } = {};
      itens.forEach(item => {
        const k = gerarMesKey(new Date(item.data + 'T00:00:00'));
        if (!porMes[k]) porMes[k] = [];
        porMes[k].push(item);
      });
      for (const mesKey in porMes) {
        if (!novasFaturas[mesKey]) novasFaturas[mesKey] = [];
        const itensDoMes = porMes[mesKey];
        const cartaoId = itensDoMes[0].cartaoId;
        const existente = (novasFaturas[mesKey] as FaturaMensal[]).find((f: FaturaMensal) => f.cartaoId === cartaoId);
        if (existente) {
          existente.itens = existente.itens || [];
          existente.itens.push(...itensDoMes);
          existente.totalFatura = existente.itens.reduce((s: number, i: ItemFatura) => s + i.valor, 0);
        } else {
          novasFaturas[mesKey].push({ cartaoId, mesReferencia: mesKey, itens: itensDoMes, totalFatura: itensDoMes.reduce((s, i) => s + i.valor, 0), paga: false });
        }
      }
      await set(ref(database, `usuarios/${usuario.uid}/faturas`), novasFaturas);
      showToast('Compra adicionada ao cartão!', 'sucesso');
    } catch { showToast('Erro ao adicionar compra', 'erro'); }
  };

  // ─── Lançar itens importados do PDF ──────────────────────────────────────
  const handleLancarItensCSV = useCallback(async (cartaoId: string, itens: ItemFatura[]) => {
    if (!usuario) return;
    try {
      await handleAdicionarCompra(itens);
      const total = itens.reduce((s, i) => s + i.valor, 0);
      showToast(`✅ ${itens.length} item(s) lançado(s) — ${formatarMoeda(total)}`, 'sucesso');
    } catch { showToast('Erro ao lançar itens', 'erro'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, sistema.faturas]);

  const handleDesfazerPagamento = async (cartaoId: string, mesKey: string) => {
    if (!usuario) return;
    try {
      // Remove a transação de pagamento gerada por handlePagarFatura
      const transacoes = sistema.dadosPorMes[mesKey] || [];
      const semPagamento = transacoes.filter(
        t => !(t.cartaoId === cartaoId && t.categoria === 'Cartão de Crédito' && t.tipo === 'despesa')
      );
      await set(ref(database, `usuarios/${usuario.uid}/dadosPorMes/${mesKey}`), semPagamento);
      // Marca a fatura como não paga
      const novasFaturas = { ...sistema.faturas };
      if (novasFaturas[mesKey]) {
        novasFaturas[mesKey] = novasFaturas[mesKey].map(f => {
          if (f.cartaoId !== cartaoId) return f;
          const { dataPagamento, ...resto } = f as FaturaMensal & { dataPagamento?: string };
          void dataPagamento;
          return { ...resto, paga: false };
        });
        await set(ref(database, `usuarios/${usuario.uid}/faturas`), novasFaturas);
      }
      showToast('Pagamento desfeito — fatura voltou para pendente', 'aviso');
    } catch { showToast('Erro ao desfazer pagamento', 'erro'); }
  };

  const handlePagarFatura = async (cartaoId: string, mesKey: string) => {
    if (!usuario) return;
    try {
      const fatura = (sistema.faturas[mesKey] || []).find(f => f.cartaoId === cartaoId);
      const cartao = sistema.cartoes.find(c => c.id === cartaoId);
      if (!fatura || !cartao) { showToast('Fatura ou cartão não encontrado', 'erro'); return; }
      const despesa: Transacao = {
        id: gerarId(), data: new Date().toISOString().split('T')[0],
        categoria: 'Cartão de Crédito', descricao: `Fatura ${cartao.nome}`,
        valor: fatura.totalFatura, pessoa: usuario.nome, tipo: 'despesa', pago: true, cartaoId,
      };
      await set(ref(database, `usuarios/${usuario.uid}/dadosPorMes/${mesKey}`), [...(sistema.dadosPorMes[mesKey] || []), despesa]);
      const novasFaturas = { ...sistema.faturas };
      novasFaturas[mesKey] = novasFaturas[mesKey].map(f =>
        f.cartaoId === cartaoId ? { ...f, paga: true, dataPagamento: new Date().toISOString() } : f
      );
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

  const handleSalvarReserva = async (reserva: SistemaFinanceiro['reservaEmergencia']) => {
    if (!usuario) return;
    try {
      await set(ref(database, `usuarios/${usuario.uid}/reservaEmergencia`), reserva);
    } catch { showToast('Erro ao salvar reserva', 'erro'); }
  };

  const calcularSaldoVale = () => {
    const mesKey = gerarMesKey(dataReferencia);
    const transacoes = sistema.dadosPorMes[mesKey] || [];
    const receitasVale = transacoes.filter(t => t.tipo === 'renda' && t.categoria === 'Vale Alimentação').reduce((acc, t) => acc + t.valor, 0);
    const despesasVale = transacoes.filter(t => t.tipo === 'despesa' && t.metodoPagamento === 'vale_alimentacao').reduce((acc, t) => acc + t.valor, 0);
    return receitasVale - despesasVale;
  };

  if (carregando) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000000' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '1.5px solid #2e3038', borderTop: '1.5px solid #cc9166', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <span style={{ color: '#5e616e', fontSize: '13px', letterSpacing: '-0.007em' }}>Carregando...</span>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (!usuario) return null;

  const mesKey = gerarMesKey(dataReferencia);
  const transacoes = sistema.dadosPorMes[mesKey] || [];
  const dataAnterior = new Date(dataReferencia);
  dataAnterior.setMonth(dataAnterior.getMonth() - 1);
  const transacoesAnterior = sistema.dadosPorMes[gerarMesKey(dataAnterior)] || [];
  const resumo = calcularResumo(transacoes, filtro);
  const transacoesFiltradas = filtro === 'todos' ? transacoes : transacoes.filter((t: Transacao) => t.pessoa.toLowerCase() === filtro.toLowerCase());
  const cartaoSelecionado = sistema.cartoes.find(c => c.id === cartaoSelecionadoId);
  const saldoVale = calcularSaldoVale();
  const totalFaturasPendentes = (sistema.faturas[mesKey] || []).filter(f => !f.paga).reduce((s, f) => s + f.totalFatura, 0);

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

  const px = isMobile ? '1rem' : '2.5rem';
  const tabs = [
    { id: 'dashboard', label: isMobile ? 'Home' : 'Dashboard' },
    { id: 'transacoes', label: isMobile ? 'Trans.' : 'Transações' },
    { id: 'categorias', label: isMobile ? 'Cat.' : 'Categorias' },
    { id: 'cartoes', label: isMobile ? 'Cartões' : 'Cartões' },
    { id: 'metas', label: 'Metas' },
  ];

  // Slash design tokens — dark mode full spec, light mode clean variant
  const bg = darkMode ? '#000000' : '#f5f4f0';
  const bgCard = darkMode ? '#1c1d22' : '#ffffff';
  const bgRaised = darkMode ? '#121317' : '#f9f8f5';
  const borderColor = darkMode ? '#2e3038' : '#e0ddd6';
  const borderDefault = darkMode ? '#5e616e' : '#c8c5be';
  const textPrimary = darkMode ? '#e2e3e9' : '#1a1a18';
  const textMuted = darkMode ? '#777a88' : '#7a7a75';
  const textFaint = darkMode ? '#5e616e' : '#9a9a95';
  const gold = '#cc9166';

  return (
    <>
      <div style={{ minHeight: '100vh', background: bg, fontFamily: "'Inter', -apple-system, system-ui, sans-serif" }}>
        <header style={{ background: bg, borderBottom: `1px solid ${borderColor}`, padding: `0 ${px}`, height: '52px', display: 'flex', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0' : '28px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: textPrimary, letterSpacing: '-0.007em' }}>
                Fin<span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontWeight: 400, color: gold }}>Control</span>
              </div>
              {!isMobile && (
                <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setTabAtiva(tab.id)}
                      style={{ padding: '6px 14px', background: 'transparent', border: 'none', borderBottom: tabAtiva === tab.id ? `2px solid ${gold}` : '2px solid transparent', color: tabAtiva === tab.id ? textPrimary : textMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.007em', whiteSpace: 'nowrap', height: '52px', transition: 'color 0.15s' }}>
                      {tab.label}
                    </button>
                  ))}
                </nav>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isMobile && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px 5px 5px', background: bgRaised, borderRadius: '2px', border: `1px solid ${borderColor}` }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: gold + '20', border: `1px solid ${gold}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: gold }}>
                    {usuario.nome.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                  </div>
                  <span style={{ fontSize: '13px', color: textMuted, letterSpacing: '-0.007em' }}>{usuario.nome.split(' ')[0]}</span>
                </div>
              )}
              <button onClick={() => { setDadosIniciais(null); setTransacaoEditando(null); setCategoriaPreenchida(''); setDescricaoPreenchida(''); setModalReceitaAberto(true); }}
                style={{ padding: '6px 14px', background: 'transparent', color: textPrimary, border: `1px solid ${borderDefault}`, borderRadius: '2px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.007em' }}>
                {isMobile ? '+ Rec.' : '+ Receita'}
              </button>
              <button onClick={() => { setDadosIniciais(null); setTransacaoEditando(null); setCategoriaPreenchida(''); setDescricaoPreenchida(''); setModalDespesaAberto(true); }}
                style={{ padding: '6px 14px', background: '#ffffff', color: '#08080a', border: '1px solid #ffffff', borderRadius: '2px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.007em' }}>
                {isMobile ? '+ Desp.' : '+ Despesa'}
              </button>
              <button onClick={toggleDarkMode} title={darkMode ? 'Modo claro' : 'Modo escuro'}
                style={{ width: '32px', height: '32px', padding: '0', background: 'transparent', color: textFaint, border: `1px solid ${borderColor}`, borderRadius: '2px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {darkMode ? '○' : '●'}
              </button>
              <button onClick={async () => { await signOut(auth); router.replace('/'); }}
                style={{ padding: '6px 12px', background: 'transparent', color: textMuted, border: `1px solid ${borderColor}`, borderRadius: '2px', fontSize: '13px', fontWeight: 400, cursor: 'pointer', letterSpacing: '-0.007em' }}>
                Sair
              </button>
            </div>
          </div>
        </header>

        {isMobile && (
          <div style={{ background: bg, borderBottom: `1px solid ${borderColor}`, padding: `0 ${px}`, overflowX: 'auto' }}>
            <div style={{ display: 'flex', minWidth: 'max-content' }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setTabAtiva(tab.id)}
                  style={{ padding: '12px 14px', background: 'transparent', border: 'none', borderBottom: tabAtiva === tab.id ? `2px solid ${gold}` : '2px solid transparent', color: tabAtiva === tab.id ? textPrimary : textMuted, fontSize: '13px', fontWeight: 500, cursor: 'pointer', letterSpacing: '-0.007em', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <main style={{ padding: `1.5rem ${px}`, maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={filtro} onChange={e => setFiltro(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: '2px', border: `1px solid ${borderColor}`, fontSize: '12px', background: bgRaised, color: textMuted, fontFamily: "'Inter', sans-serif", letterSpacing: '-0.007em' }}>
              <option value="todos">Todos</option>
              <option value="anderson ferreira">Anderson</option>
              <option value="evelin mulbaier">Evelin</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${borderColor}`, borderRadius: '2px', overflow: 'hidden' }}>
              <button onClick={() => { const n = new Date(dataReferencia); n.setMonth(n.getMonth() - 1); setDataReferencia(n); }}
                style={{ width: '28px', height: '28px', background: bgRaised, border: 'none', borderRight: `1px solid ${borderColor}`, color: textFaint, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <span style={{ padding: '0 14px', height: '28px', display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 500, color: textPrimary, background: bgRaised, letterSpacing: '-0.007em', minWidth: isMobile ? '90px' : '120px', justifyContent: 'center', whiteSpace: 'nowrap' }}>
                {isMobile ? `${String(dataReferencia.getMonth() + 1).padStart(2, '0')}/${dataReferencia.getFullYear()}` : `${obterNomeMes(dataReferencia)} ${dataReferencia.getFullYear()}`}
              </span>
              <button onClick={() => { const n = new Date(dataReferencia); n.setMonth(n.getMonth() + 1); setDataReferencia(n); }}
                style={{ width: '28px', height: '28px', background: bgRaised, border: 'none', borderLeft: `1px solid ${borderColor}`, color: textFaint, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
          </div>
        
          {tabAtiva === 'dashboard' && ( 
            <div>
              <MelhorCartao cartoes={sistema.cartoes} />
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
                <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>Receitas</div>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.625rem', fontWeight: 600, color: textPrimary, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatarMoeda(resumo.totalReceitas)}</div>
                </div>
                <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>Despesas</div>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.625rem', fontWeight: 600, color: gold, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatarMoeda(resumo.totalDespesas)}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: textFaint, letterSpacing: '-0.007em' }}>
                      pago {formatarMoeda(resumo.despesasPagas)}
                    </span>
                    {resumo.despesasPendentes > 0 && (
                      <span style={{ fontSize: '11px', color: textMuted, letterSpacing: '-0.007em' }}>
                        · pend. {formatarMoeda(resumo.despesasPendentes)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ background: bgCard, border: `1px solid ${totalFaturasPendentes > 0 ? gold + '40' : borderColor}`, borderRadius: '10px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>Fat. Pendentes</div>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.625rem', fontWeight: 600, color: totalFaturasPendentes > 0 ? gold : textPrimary, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatarMoeda(totalFaturasPendentes)}</div>
                  <div style={{ fontSize: '11px', color: textFaint, marginTop: '6px' }}>{totalFaturasPendentes > 0 ? 'a pagar' : 'em dia'}</div>
                </div>
                <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '18px 20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>Disponível</div>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.625rem', fontWeight: 600, color: resumo.saldoDisponivel < 0 ? gold : textPrimary, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatarMoeda(resumo.saldoDisponivel)}</div>
                  {totalFaturasPendentes > 0 && <div style={{ fontSize: '11px', color: textFaint, marginTop: '6px' }}>-{formatarMoeda(totalFaturasPendentes)} faturas</div>}
                </div>
                <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '18px 20px', gridColumn: isMobile ? 'span 2' : 'auto' }}>
                  <div style={{ fontSize: '11px', fontWeight: 500, color: textFaint, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>Vale Alimentação</div>
                  <div style={{ fontSize: isMobile ? '1.25rem' : '1.625rem', fontWeight: 600, color: textPrimary, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{formatarMoeda(saldoVale)}</div>
                </div>
              </div>

              <InputMagico usuarioNome={usuario.nome} cartoes={sistema.cartoes} categoriasCustomizadas={sistema.categoriasCustomizadas} onTransacaoCriada={handleInputMagico} />

              <AtalhosRapidos
                userId={usuario.uid}
                onAtalhoClick={(cat, desc, tipo) => {
                  if (tipo === 'receita') {
                    setDadosIniciais({ tipo: 'renda', categoria: cat, descricao: desc, valor: 0, data: '', pessoa: usuario.nome, pago: true });
                    setModalReceitaAberto(true);
                  } else {
                    setCategoriaPreenchida(cat);
                    setDescricaoPreenchida(desc);
                    setTransacaoEditando(null);
                    setDadosIniciais(null);
                    setModalDespesaAberto(true);
                  }
                }}
              />

              <AlertaFaturas cartoes={sistema.cartoes} faturas={sistema.faturas} />
              <InsightsInteligentes transacoesAtual={transacoes} transacoesAnterior={transacoesAnterior} />

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <GraficoPizza categorias={calcularCategorias()} />
                <GraficoEvolucao dados={calcularEvolucao()} />
              </div>

              <ReservaEmergencia reserva={sistema.reservaEmergencia} onSalvar={handleSalvarReserva} />
                <CustoKm dadosPorMes={sistema.dadosPorMes} />
              <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '20px 24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: textFaint, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '16px' }}>Maiores gastos do mês</div>
                {transacoes.filter(t => t.tipo === 'despesa').sort((a, b) => b.valor - a.valor).slice(0, 5).map((t, i) => (
                  <div key={`gasto-${t.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '11px 0', borderBottom: i < 4 ? `1px solid ${bgRaised}` : 'none' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: bgRaised, color: gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, flexShrink: 0, border: `1px solid ${borderColor}` }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, color: textPrimary, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.007em' }}>{t.descricao}</div>
                      <div style={{ fontSize: '11px', color: textFaint, marginTop: '1px', letterSpacing: '-0.007em' }}>{t.categoria}</div>
                    </div>
                    <div style={{ fontWeight: 500, fontSize: '14px', color: gold, flexShrink: 0, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.007em' }}>{formatarMoeda(t.valor)}</div>
                  </div>
                ))}
                {transacoes.filter(t => t.tipo === 'despesa').length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: textFaint, fontSize: '13px' }}>Nenhuma despesa neste mês</div>
                )}
              </div>
            </div>
          )}

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

          {tabAtiva === 'categorias' && (
            <GestaoCategorias
              transacoes={transacoes}
              mesReferencia={mesKey}
              faturas={sistema.faturas}
              categoriasCustomizadas={sistema.categoriasCustomizadas || []}
              onSalvarCategorias={handleSalvarCategorias}
            />
          )}

          {tabAtiva === 'cartoes' && (
            <GestaoCartoes
              cartoes={sistema.cartoes}
              faturas={sistema.faturas}
              mesReferencia={mesKey}
              transacoesPorMes={sistema.dadosPorMes}
              onCadastrarCartao={() => { setCartaoEditando(null); setModalCartaoAberto(true); }}
              onAdicionarCompra={(id) => { setCartaoSelecionadoId(id); setModalCompraAberto(true); }}
              onPagarFatura={handlePagarFatura}
              onEditarCartao={handleEditarCartao}
              onExcluirCartao={handleExcluirCartao}
              onExcluirItemFatura={handleExcluirItemFatura}
              onEditarItemFatura={handleEditarItemFatura}
              onLancarItensCSV={handleLancarItensCSV}
              onDesfazerPagamento={handleDesfazerPagamento}
            />
          )}

          {!['dashboard', 'transacoes', 'categorias', 'cartoes'].includes(tabAtiva) && (
            <div style={{ background: bgCard, border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '3rem', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: textFaint, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>Em desenvolvimento</div>
              <p style={{ color: textMuted, fontSize: '13px', letterSpacing: '-0.007em' }}>Este módulo será adicionado em breve.</p>
            </div>
          )}
        </main>
      </div>

      <ModalReceita
        aberto={modalReceitaAberto}
        onFechar={handleFecharReceita}
        usuarioNome={usuario.nome}
        userId={usuario.uid}
        transacaoEditando={transacaoEditando?.tipo === 'renda' ? transacaoEditando : null}
        onSucesso={msg => showToast(msg, 'sucesso')}
        onErro={msg => showToast(msg, 'erro')}
        dadosIniciais={dadosIniciais}
        categoriasCustomizadas={sistema.categoriasCustomizadas}
      />

      <ModalDespesa
        aberto={modalDespesaAberto}
        onFechar={handleFecharDespesa}
        userId={usuario.uid}
        categoriaPreenchida={categoriaPreenchida}
        descricaoPreenchida={descricaoPreenchida}
        categoriasCustomizadas={sistema.categoriasCustomizadas}
        transacaoParaEditar={
          transacaoEditando?.tipo === 'despesa'
            ? {
                id: transacaoEditando.id,
                descricao: transacaoEditando.descricao,
                valor: transacaoEditando.valor,
                categoria: transacaoEditando.categoria,
                pessoa: transacaoEditando.pessoa,
                data: transacaoEditando.data,
                metodoPagamento: transacaoEditando.metodoPagamento,
                mesKey: gerarMesKey(new Date(transacaoEditando.data + 'T00:00:00')),
              }
            : undefined
        }
      />

      <ModalCadastrarCartao
        key={modalCartaoAberto ? 'aberto' : 'fechado'}
        aberto={modalCartaoAberto}
        onFechar={() => { setModalCartaoAberto(false); setCartaoEditando(null); }}
        onSalvar={handleSalvarCartao}
        cartaoEditando={cartaoEditando}
      />
      {cartaoSelecionado && (
        <ModalCompraCartao
          aberto={modalCompraAberto}
          cartaoId={cartaoSelecionado.id}
          cartaoNome={cartaoSelecionado.nome}
          onFechar={() => { setModalCompraAberto(false); setCartaoSelecionadoId(''); }}
          onSalvar={handleAdicionarCompra}
          usuarioNome={usuario.nome}
        />
      )}

      <Toast mensagem={toast.mensagem} tipo={toast.tipo} visivel={toast.visivel} onFechar={fecharToast} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}