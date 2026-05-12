'use client';

import { useState, useEffect, useRef } from 'react';
import { CartaoCredito, ItemFatura, FaturaMensal, Transacao } from '@/types';
import { formatarMoeda, gerarId } from '@/utils/financeiro';
import { useIsMobile } from '@/hooks/useIsMobile';

interface Props {
  cartoes: CartaoCredito[];
  faturas: { [mesKey: string]: FaturaMensal[] };
  mesReferencia: string;
  transacoesPorMes?: { [mesKey: string]: Transacao[] };
  onCadastrarCartao: () => void;
  onAdicionarCompra: (cartaoId: string) => void;
  onPagarFatura: (cartaoId: string, mesKey: string) => void;
  onEditarCartao: (cartao: CartaoCredito) => void;
  onExcluirCartao: (cartaoId: string) => void;
  onExcluirItemFatura: (cartaoId: string, itemId: string, mesKey: string) => void;
  onEditarItemFatura: (cartaoId: string, item: ItemFatura, mesKey: string) => void;
  onLancarItensCSV?: (cartaoId: string, itens: ItemFatura[]) => void;
}

// ─── Tipos para importação ───────────────────────────────────────────────────
interface LinhaExtrato {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
  parcelas?: { atual: number; total: number };
  status: 'pendente' | 'conciliado';
}

// ─── Parser de categorias ────────────────────────────────────────────────────
function detectarCategoriaPorDescricao(desc: string): string {
  const d = desc.toLowerCase();
  if (/gasolina|combustivel|posto|etanol|shell|ipiranga|br ?(dist)?|castelinho|carrefour canoas/.test(d)) return 'Transporte';
  if (/uber|99(app)?|taxi|onibus|metro|passagem|bilhete/.test(d)) return 'Transporte';
  if (/mercado|carrefour|extra|atacadao|assai|atakarejo|supermercado|feira|hortifruti|atacadao/.test(d)) return 'Alimentação';
  if (/zaffari|bourbon/.test(d)) return 'Alimentação';
  if (/ifood|rappi|delivery|pizza|hamburguer|mcdonalds|burger|subway|lanche|restaurante|padaria|cafe|outback/.test(d)) return 'Alimentação';
  if (/farmacia|drogaria|remedio|ultrafarma|drogaraia|pacheco|panvel|sao joao/.test(d)) return 'Saúde';
  if (/hospital|clinica|medico|consulta|dentista|laboratorio|exame|plano saude|amorsaude/.test(d)) return 'Saúde';
  if (/academia|smartfit|bodytech|bluefit|fitness|gympass|wellhub/.test(d)) return 'Saúde';
  if (/netflix|spotify|disney|hbo|globoplay|paramount|deezer|apple|claude\.ai/.test(d)) return 'Lazer';
  if (/shopping|lojas|magazine|americanas|casas bahia|renner|riachuelo|c&a|hm|shein|loja/.test(d)) return 'Vestuário';
  if (/amazon|shopee|mercado ?livre|aliexpress|submarino|kabum|pontofriocom/.test(d)) return 'Compras Online';
  if (/escola|faculdade|universidade|curso|mensalidade|colegio/.test(d)) return 'Educação';
  if (/aluguel|condominio|iptu|agua|luz|energia|gas|internet|telefone|claro|vivo|tim|oi/.test(d)) return 'Moradia';
  if (/pet|veterinario|racao|cobasi|petz|agropet|agropecuaria|petlove/.test(d)) return 'Outras Despesas';
  if (/airbnb|hotel|pousada/.test(d)) return 'Lazer';
  if (/anuidade|manutencao de conta|manutenção de conta/.test(d)) return 'Serviços';
  if (/centro automotivo|oficina|mecanico/.test(d)) return 'Manutenção Veículo';
  if (/oboticario|boticario|natura|avon|suzana cachos|vidaecor|life in/.test(d)) return 'Outras Despesas';
  return 'Outras Despesas';
}

// ─── Converte valor string BR para number ────────────────────────────────────
function converterValor(str: string): number {
  const s = str.replace(/\s/g, '');
  if (s.includes(',') && s.includes('.')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  } else if (s.includes(',')) {
    return parseFloat(s.replace(',', '.'));
  }
  return parseFloat(s);
}

// ─── Converte data DD/MM/YY ou DD/MM/YYYY para YYYY-MM-DD ───────────────────
function converterData(str: string): string {
  const partes = str.split('/');
  const dia = partes[0];
  const mes = partes[1];
  let ano = partes[2];
  if (ano.length === 2) ano = '20' + ano;
  return `${ano}-${mes}-${dia}`;
}

// ─── Infere ano para datas DD/MM sem ano (Bradescard, Bourbon, PicPay) ───────
function inferirAno(dataDDMM: string, mesRefNum: number, anoRefNum: number): string {
  const partes = dataDDMM.split('/');
  const dia = partes[0];
  const mes = parseInt(partes[1]);
  const ano = mes > mesRefNum ? anoRefNum - 1 : anoRefNum;
  return `${ano}-${String(mes).padStart(2, '0')}-${dia}`;
}

// ─── Detecção de parcelamento ─────────────────────────────────────────────────
function detectarParcelamento(desc: string): { atual: number; total: number } | undefined {
  const match =
    desc.match(/\b(\d{1,2})\s*[\/\-]\s*(\d{1,2})\b/) ||
    desc.match(/(\d{1,2})\s+de\s+(\d{1,2})/i) ||
    desc.match(/parc[a-z]*\.?\s*(\d{1,2})\s*[\/\-]\s*(\d{1,2})/i);
  if (!match) return undefined;
  const atual = parseInt(match[1]);
  const total = parseInt(match[2]);
  if (atual >= 1 && total >= 2 && atual <= total && total <= 72) {
    return { atual, total };
  }
  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════
// PARSER 1 — RIACHUELO / MIDWAY
// FIX REAL: está em handleArquivoSelecionado — agrupamento por Y (3px)
// + ordenação por X garante que data + desc + valor_orig + nº_parc +
// lançamento cheguem aqui na MESMA linha, e os regex abaixo funcionam.
// ═══════════════════════════════════════════════════════════════════════
function isRiachuelo(texto: string): boolean {
  return /midway|riachuelo/i.test(texto);
}

function parsearRiachuelo(texto: string): LinhaExtrato[] {
  const resultado: LinhaExtrato[] = [];
  const linhas = texto.split('\n');

  for (const linha of linhas) {
    const matchBase = linha.match(/^(\d{2}\/\d{2}\/\d{2,4})\s*(\d{3})\s+(.+)$/);
    if (!matchBase) continue;

    const [, dataStr, , resto] = matchBase;
    if (/pagamento|anuidade/i.test(resto)) continue;

    let descricao = resto.trim();
    let valor: number | undefined;
    let parcelas: { atual: number; total: number } | undefined;

    // CASO 1: parcelamento NN/TT + MENSAL
    // Formato: DESC [VALOR_ORIG] NN/TT + MENSAL
    // Queremos o MENSAL (lançamento do mês), não o valor original total
    const matchParcMensal = descricao.match(/(\d{1,2})\/(\d{1,2})\s*\+\s*([\d.,]+)/);
    if (matchParcMensal) {
      const atual = parseInt(matchParcMensal[1]);
      const total = parseInt(matchParcMensal[2]);
      if (atual >= 1 && total >= 2 && atual <= total && total <= 72) {
        parcelas = { atual, total };
        valor = converterValor(matchParcMensal[3]);
        descricao = descricao
        .replace(/\s+[\d.,]+\s+\d{1,2}\/\d{1,2}\s*\+\s*[\d.,]+.*$/, '')
        .replace(/\s+\d{1,2}\/\d{1,2}\s*\+\s*[\d.,]+.*$/, '')
        .trim();
      }
    }

    // CASO 2: compra à vista
    if (valor === undefined) {
      const matchSinal = descricao.match(/^(.+?)\s+([+-])\s+([\d.,]+)\s*$/);
      if (!matchSinal) continue;
      if (matchSinal[2] === '-') continue;
      valor = converterValor(matchSinal[3]);
      descricao = matchSinal[1].trim();
    }

    if (!valor || isNaN(valor) || valor <= 0) continue;

    resultado.push({
      id: gerarId(),
      data: converterData(dataStr),
      descricao,
      valor,
      categoria: detectarCategoriaPorDescricao(descricao),
      parcelas,
      status: 'pendente',
    });
  }

  return resultado;
}

// ═══════════════════════════════════════════════════════════════════════
// PARSER 2 — BRADESCARD / TUMELERO
// ═══════════════════════════════════════════════════════════════════════
function isBradescard(texto: string): boolean {
  return /bradescard|tumelero/i.test(texto);
}

function parsearBradescard(texto: string, mesRefNum: number, anoRefNum: number): LinhaExtrato[] {
  const resultado: LinhaExtrato[] = [];
  const linhas = texto.split('\n');

  for (const linha of linhas) {
    const matchLinha = linha.match(/^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)\s*(-?)$/);
    if (!matchLinha) continue;

    const [, dataDDMM, descRaw, valorStr, sinal] = matchLinha;

    if (sinal === '-') continue;
    if (/pagamento recebido|pagamento/i.test(descRaw)) continue;
    if (/encargos|juros|multa|mora|manutenção|manutencao|tarifa/i.test(descRaw)) continue;

    const valor = converterValor(valorStr);
    if (isNaN(valor) || valor <= 0) continue;

    const data = inferirAno(dataDDMM, mesRefNum, anoRefNum);
    let descricao = descRaw.trim();
    let parcelas: { atual: number; total: number } | undefined;

    const matchParcParen = descricao.match(/\((\d{1,2})\/(\d{1,2})\)/);
    if (matchParcParen) {
      const atual = parseInt(matchParcParen[1]);
      const total = parseInt(matchParcParen[2]);
      if (atual >= 1 && total >= 2 && atual <= total && total <= 72) parcelas = { atual, total };
      descricao = descricao.replace(matchParcParen[0], '').trim();
    }

    descricao = descricao.replace(/\s+BR\s*$/, '').trim();
    if (descricao.length < 2) continue;

    resultado.push({
      id: gerarId(),
      data,
      descricao,
      valor,
      categoria: detectarCategoriaPorDescricao(descricao),
      parcelas,
      status: 'pendente',
    });
  }

  return resultado;
}

// ═══════════════════════════════════════════════════════════════════════
// PARSER 3 — BOURBON / ZAFFARI (Banrisul)
// ═══════════════════════════════════════════════════════════════════════
function isBourbonZaffari(texto: string): boolean {
  return /bourbon|zaffari|banrisul/i.test(texto.slice(0, 2000));
}

function parsearBourbonZaffari(texto: string, mesRefNum: number, anoRefNum: number): LinhaExtrato[] {
  const resultado: LinhaExtrato[] = [];
  const linhas = texto.split('\n');

  for (const linha of linhas) {
    if (/lei\b|quitaç|declaraç|substituindo|comprovação/i.test(linha)) return resultado;

    const matchData = linha.match(/^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)\s*$/);
    if (!matchData) continue;

    const [, dataDDMM, resto, valorStr] = matchData;

    if (/^pagamento|encargos|juros de mora|manutenção de conta|manutencao|multa/i.test(resto.trim())) continue;

    const valor = converterValor(valorStr);
    if (isNaN(valor) || valor <= 0) continue;

    const data = inferirAno(dataDDMM, mesRefNum, anoRefNum);
    let descricao = resto.trim();
    let parcelas: { atual: number; total: number } | undefined;

    const matchParc = descricao.match(/[–\-]\s*parc\.\s*(\d{1,2})\/(\d{1,2})/i);
    if (matchParc) {
      const atual = parseInt(matchParc[1]);
      const total = parseInt(matchParc[2]);
      if (atual >= 1 && total >= 2 && atual <= total && total <= 72) parcelas = { atual, total };
      descricao = descricao.replace(/\s*Parcela de Compra\s*[–\-]\s*parc\.\s*\d{1,2}\/\d{1,2}/i, '').trim();
    }

    descricao = descricao.replace(/\s*Compra à Vista\s*/i, '').trim();
    if (descricao.length < 2) continue;

    resultado.push({
      id: gerarId(),
      data,
      descricao,
      valor,
      categoria: detectarCategoriaPorDescricao(descricao),
      parcelas,
      status: 'pendente',
    });
  }

  return resultado;
}

// ═══════════════════════════════════════════════════════════════════════
// PARSER 4 — PICPAY
// ═══════════════════════════════════════════════════════════════════════
function isPicPay(texto: string): boolean {
  return /picpay/i.test(texto.slice(0, 2000));
}

function parsearPicPay(texto: string, mesRefNum: number, anoRefNum: number): LinhaExtrato[] {
  const resultado: LinhaExtrato[] = [];
  const linhas = texto.split('\n');

  for (const linha of linhas) {
    const matchData = linha.match(/^(\d{2}\/\d{2})\s+(.+?)\s+([\d.,]+)\s*$/);
    if (!matchData) continue;

    const [, dataDDMM, descRaw, valorStr] = matchData;

    if (/pagamento de fatura|pagamento|iof diario|iof adicional|^fin |subtotal|total geral/i.test(descRaw.trim())) continue;

    const valor = converterValor(valorStr);
    if (isNaN(valor) || valor <= 0) continue;

    const data = inferirAno(dataDDMM, mesRefNum, anoRefNum);
    let descricao = descRaw.trim();
    let parcelas: { atual: number; total: number } | undefined;

    const matchParcColado = descricao.match(/PARC(\d{1,2})\/(\d{1,2})$/i);
    if (matchParcColado) {
      const atual = parseInt(matchParcColado[1]);
      const total = parseInt(matchParcColado[2]);
      if (atual >= 1 && total >= 2 && atual <= total && total <= 72) parcelas = { atual, total };
      descricao = descricao.replace(/PARC\d{1,2}\/\d{1,2}$/i, '').trim();
    }

    descricao = descricao.replace(/\s+BR\s+\w{0,5}\s*$/, '').trim();
    descricao = descricao.replace(/\s+BR\s*$/, '').trim();

    if (descricao.length < 2) continue;

    resultado.push({
      id: gerarId(),
      data,
      descricao,
      valor,
      categoria: detectarCategoriaPorDescricao(descricao),
      parcelas,
      status: 'pendente',
    });
  }

  return resultado;
}

// ═══════════════════════════════════════════════════════════════════════
// PARSER 5 — NUBANK
//
// FIX 1 (principal): em handleArquivoSelecionado, o agrupamento Y+sort X
//   garante que "07 MAR" + "Shopee..." + "R$ 70,60" — que podem estar em
//   posições diferentes do stream — cheguem aqui como uma única linha
//   completa, e o regex abaixo casa direto.
//
// FIX 2 (filtro): filtro reduzido para excluir APENAS linhas onde a
//   descrição começa com "pagamento" (pagamento real da fatura).
//   Encargos positivos — multa, IOF, juros, saldo em atraso — são agora
//   INCLUÍDOS, pois representam cobranças reais que o usuário deve pagar.
//   Negativos (−R$) continuam excluídos automaticamente pelo regex.
//
// FIX 3: regex sem âncora \s*$ para tolerar lixo residual no final.
// ═══════════════════════════════════════════════════════════════════════
function isNubank(texto: string): boolean {
  return /nubank|nu pagamentos/i.test(texto);
}

function parsearNubank(texto: string, mesRefNum: number, anoRefNum: number): LinhaExtrato[] {
  const MESES: { [k: string]: string } = {
    JAN: '01', FEV: '02', MAR: '03', ABR: '04', MAI: '05', JUN: '06',
    JUL: '07', AGO: '08', SET: '09', OUT: '10', NOV: '11', DEZ: '12',
  };

  const resultado: LinhaExtrato[] = [];
  const linhas = texto.split('\n');

  for (const linha of linhas) {
    // FIX 3: sem \s*$ — itens negativos (−R$) não casam pois o regex
    // exige "R$" sem sinal negativo imediatamente antes do valor.
    const m = linha.match(
      /^(\d{2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s+(.+?)\s+R\$\s*([\d.,]+)/i
    );
    if (!m) continue;

    const [, dia, mesStr, descRaw, valorStr] = m;

    // FIX 2: exclui apenas "Pagamento em DD MON" (começa com "pagamento").
    // Encargos (multa, IOF, juros, saldo em atraso) são INCLUÍDOS.
    if (/^pagamento\b/i.test(descRaw.trim())) continue;

    const valor = converterValor(valorStr);
    if (isNaN(valor) || valor <= 0) continue;

    const mesNum = parseInt(MESES[mesStr.toUpperCase()]);
    const anoNum = mesNum > mesRefNum ? anoRefNum - 1 : anoRefNum;
    const data = `${anoNum}-${String(mesNum).padStart(2, '0')}-${dia}`;

    let descricao = descRaw.trim();
    let parcelas: { atual: number; total: number } | undefined;

    const matchParc = descricao.match(/[-\u2013]\s*Parcela\s+(\d{1,2})\/(\d{1,2})/i);
    if (matchParc) {
      const atual = parseInt(matchParc[1]);
      const total = parseInt(matchParc[2]);
      if (atual >= 1 && total >= 2 && atual <= total && total <= 72) parcelas = { atual, total };
      descricao = descricao.replace(/\s*[-\u2013]\s*Parcela\s+\d{1,2}\/\d{1,2}/i, '').trim();
    }

    descricao = descricao.replace(/^Parcelamento de Compra\s+/i, '').trim();
    descricao = descricao.replace(/^["""''](.+?)["""'']$/, '$1').trim();
    // Remove ícones/emojis unicode do início
    descricao = descricao.replace(/^[^a-zA-Z\u00C0-\u00FF0-9"']+/, '').trim();
    descricao = descricao.replace(/\s*[-\u2013\u2022]\s*$/, '').trim();

    if (descricao.length < 2) continue;

    resultado.push({
      id: gerarId(),
      data,
      descricao,
      valor,
      categoria: detectarCategoriaPorDescricao(descricao),
      parcelas,
      status: 'pendente',
    });
  }

  return resultado;
}

// ─── Parser universal de texto de fatura (fallback para outros bancos) ────────
function parsearGenerico(texto: string): LinhaExtrato[] {
  const linhas = texto.split('\n').map(l => l.trim()).filter(Boolean);
  const resultado: LinhaExtrato[] = [];

  const regexData = /(\d{2}\/\d{2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/;
  const regexValor = /R?\$?\s*-?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/;

  for (const linha of linhas) {
    if (/total|pagamento|saldo|limite|vencimento|fechamento|fatura|extrato|data\b.*descri|valor\b/i.test(linha)) continue;
    if (/^[-=_*#]+$/.test(linha)) continue;
    if (linha.length < 10) continue;

    const matchData = linha.match(regexData);
    const matchValor = linha.match(regexValor);

    if (!matchData || !matchValor) continue;

    let dataStr = matchData[1];
    if (dataStr.includes('/')) {
      dataStr = converterData(dataStr);
    }

    const valor = converterValor(matchValor[1]);
    if (isNaN(valor) || valor <= 0) continue;

    let descricao = linha
      .replace(matchData[1], '')
      .replace(matchValor[0], '')
      .replace(/R?\$\s*/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    descricao = descricao.replace(/^[-•*\s]+/, '').replace(/[-•*\s]+$/, '').trim();
    if (descricao.length < 3) continue;

    const parcelas = detectarParcelamento(descricao);
    const categoria = detectarCategoriaPorDescricao(descricao);

    resultado.push({
      id: gerarId(),
      data: dataStr,
      descricao,
      valor,
      categoria,
      parcelas,
      status: 'pendente',
    });
  }

  return resultado;
}

// ─── Roteador de parser ───────────────────────────────────────────────────────
function parsearTextoFatura(texto: string, mesReferencia: string): LinhaExtrato[] {
  const [anoRefStr, mesRefStr] = mesReferencia.split('-');
  const mesRefNum = parseInt(mesRefStr);
  const anoRefNum = parseInt(anoRefStr);

  if (isRiachuelo(texto)) {
    const resultado = parsearRiachuelo(texto);
    if (resultado.length > 0) return resultado;
  }

  if (isBradescard(texto)) {
    const resultado = parsearBradescard(texto, mesRefNum, anoRefNum);
    if (resultado.length > 0) return resultado;
  }

  if (isBourbonZaffari(texto)) {
    const resultado = parsearBourbonZaffari(texto, mesRefNum, anoRefNum);
    if (resultado.length > 0) return resultado;
  }

  if (isPicPay(texto)) {
    const resultado = parsearPicPay(texto, mesRefNum, anoRefNum);
    if (resultado.length > 0) return resultado;
  }

  if (isNubank(texto)) {
    const resultado = parsearNubank(texto, mesRefNum, anoRefNum);
    if (resultado.length > 0) return resultado;
  }

  return parsearGenerico(texto);
}

// ─── Comparação com transações existentes (anti-duplicação) ──────────────────
function conciliar(
  linhas: LinhaExtrato[],
  faturas: { [mesKey: string]: FaturaMensal[] },
  transacoesPorMes: { [mesKey: string]: Transacao[] } | undefined,
  cartaoId: string,
): LinhaExtrato[] {
  const itensFatura: ItemFatura[] = [];
  for (const mesKey in faturas) {
    const faturasDoMes = faturas[mesKey] || [];
    for (const f of faturasDoMes) {
      if (f.cartaoId === cartaoId) {
        (f.itens || []).forEach(i => itensFatura.push(i));
      }
    }
  }

  const transacoesCartao: Transacao[] = [];
  if (transacoesPorMes) {
    for (const mesKey in transacoesPorMes) {
      (transacoesPorMes[mesKey] || [])
        .filter(t => t.cartaoId === cartaoId)
        .forEach(t => transacoesCartao.push(t));
    }
  }

  return linhas.map(linha => {
    const dataLinha = new Date(linha.data + 'T00:00:00');

    const achouFatura = itensFatura.some(item => {
      const diffValor = Math.abs(item.valor - linha.valor);
      if (diffValor > 0.02) return false;
      const dataItem = new Date(item.data + 'T00:00:00');
      const diffDias = Math.abs((dataItem.getTime() - dataLinha.getTime()) / 86400000);
      return diffDias <= 3;
    });

    const achouTransacao = transacoesCartao.some(t => {
      const diffValor = Math.abs(t.valor - linha.valor);
      if (diffValor > 0.02) return false;
      const dataT = new Date(t.data + 'T00:00:00');
      const diffDias = Math.abs((dataT.getTime() - dataLinha.getTime()) / 86400000);
      return diffDias <= 3;
    });

    return { ...linha, status: (achouFatura || achouTransacao) ? 'conciliado' : 'pendente' };
  });
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function GestaoCartoes({
  cartoes,
  faturas,
  mesReferencia,
  transacoesPorMes,
  onCadastrarCartao,
  onAdicionarCompra,
  onPagarFatura,
  onEditarCartao,
  onExcluirCartao,
  onExcluirItemFatura,
  onEditarItemFatura,
  onLancarItensCSV,
}: Props) {
  const isMobile = useIsMobile();
  const [cartaoSelecionado, setCartaoSelecionado] = useState<string | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [itemEditando, setItemEditando] = useState<{ cartaoId: string; item: ItemFatura } | null>(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editCategoria, setEditCategoria] = useState('');

  const [modalImportAberto, setModalImportAberto] = useState(false);
  const [cartaoImportId, setCartaoImportId] = useState('');
  const [processando, setProcessando] = useState(false);
  const [erroImport, setErroImport] = useState('');
  const [linhasExtrato, setLinhasExtrato] = useState<LinhaExtrato[]>([]);
  const [lancandoId, setLancandoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfJsCarregado = useRef(false);

  useEffect(() => {
    if (pdfJsCarregado.current) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const win = window as unknown as { pdfjsLib?: { GlobalWorkerOptions: { workerSrc: string } } };
      if (win.pdfjsLib) {
        win.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      pdfJsCarregado.current = true;
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharModalImport(); };
    if (modalImportAberto) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalImportAberto]);

  const abrirModalImport = (cartaoId: string) => {
    setCartaoImportId(cartaoId);
    setLinhasExtrato([]);
    setErroImport('');
    setProcessando(false);
    setModalImportAberto(true);
  };

  const fecharModalImport = () => {
    setModalImportAberto(false);
    setLinhasExtrato([]);
    setErroImport('');
    setProcessando(false);
    setCartaoImportId('');
  };

  const handleArquivoSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.name.toLowerCase().endsWith('.pdf')) {
      setErroImport('Selecione um arquivo PDF válido.');
      return;
    }

    setProcessando(true);
    setErroImport('');
    setLinhasExtrato([]);

    try {
      const win = window as unknown as { pdfjsLib?: { getDocument: (args: unknown) => { promise: Promise<unknown> } } };
      const pdfjsLib = win.pdfjsLib;
      if (!pdfjsLib) {
        setErroImport('PDF.js não carregou ainda. Aguarde um segundo e tente novamente.');
        setProcessando(false);
        return;
      }

      const arrayBuffer = await arquivo.arrayBuffer();
      const pdf = (await pdfjsLib.getDocument({ data: arrayBuffer }).promise) as {
        numPages: number;
        getPage: (p: number) => Promise<unknown>;
      };
      let textoCompleto = '';

      for (let p = 1; p <= pdf.numPages; p++) {
        const pagina = (await pdf.getPage(p)) as {
          getTextContent: () => Promise<{ items: { str: string; transform: number[] }[] }>;
        };
        const conteudo = await pagina.getTextContent();

        // ════════════════════════════════════════════════════════════════════
        // FIX DEFINITIVO — Agrupamento por Y (tolerância 3px) + ordenação X
        //
        // O PDF.js processa itens na ordem do stream interno do PDF, que NÃO
        // é necessariamente a ordem visual esquerda→direita, cima→baixo.
        //
        // Problema Riachuelo: o PDF armazena colunas separadas no stream.
        //   Resultado antigo (stream order):
        //     linha "19/07/25 026 HNA*OBOTICARIO"   ← só data+desc
        //     linha "361,45"                         ← só valor original
        //     linha "09/10"                          ← só nº parcela
        //     linha "+ 36,14"                        ← só lançamento do mês
        //   Resultado NOVO (Y-group + X-sort):
        //     "19/07/25 026 HNA*OBOTICARIO 361,45 09/10 + 36,14" ← completo ✓
        //
        // Problema Nubank: "07 MAR" (Y=696.2) e "Shopee..." (Y=694.6) estão
        //   1.6px separados no stream, mas em posições diferentes do stream.
        //   Resultado antigo: linhas separadas → regex não casava.
        //   Resultado NOVO: |696.2 - 694.6| = 1.6 ≤ 3 → mesmo grupo → X-sort
        //   → "07 MAR Shopee *Entregabikes - Parcela 4/10 R$ 70,60" ✓
        // ════════════════════════════════════════════════════════════════════
        interface ItemTexto { str: string; x: number; y: number }
        const grupos: { yBase: number; itens: ItemTexto[] }[] = [];
        const itens = conteudo.items as { str: string; transform: number[] }[];

        for (const item of itens) {
          const y = item.transform[5];
          const x = item.transform[4];
          const str = item.str;
          if (!str.trim()) continue;

          // Procura grupo com yBase dentro de 3px de tolerância
          const grupo = grupos.find(g => Math.abs(g.yBase - y) <= 3);
          if (grupo) {
            grupo.itens.push({ str, x, y });
          } else {
            grupos.push({ yBase: y, itens: [{ str, x, y }] });
          }
        }

        // Ordena grupos de cima para baixo (Y decrescente no espaço PDF)
        grupos.sort((a, b) => b.yBase - a.yBase);

        // Dentro de cada grupo, ordena da esquerda para direita (X crescente)
        for (const grupo of grupos) {
          grupo.itens.sort((a, b) => a.x - b.x);
          const linha = grupo.itens.map(i => i.str).join(' ').trim();
          if (linha) textoCompleto += linha + '\n';
        }
      }

      if (!textoCompleto.trim()) {
        setErroImport('Não foi possível extrair texto deste PDF. Talvez seja um PDF escaneado (imagem).');
        setProcessando(false);
        return;
      }

      // DEBUG — salva o texto extraído para diagnóstico
      (window as unknown as Record<string, unknown>).__lastPdfText = textoCompleto;

      const linhasParsadas = parsearTextoFatura(textoCompleto, mesReferencia);

      if (linhasParsadas.length === 0) {
        setErroImport('Nenhuma transação encontrada. Verifique se é uma fatura de cartão com data e valor.');
        setProcessando(false);
        return;
      }

      const linhasConciliadas = conciliar(linhasParsadas, faturas, transacoesPorMes, cartaoImportId);
      setLinhasExtrato(linhasConciliadas);
    } catch (err) {
      console.error(err);
      setErroImport('Erro ao processar o PDF. Tente novamente.');
    } finally {
      setProcessando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLancarItem = (linha: LinhaExtrato) => {
    if (!onLancarItensCSV) return;
    setLancandoId(linha.id);

    const [anoRef, mesRef] = mesReferencia.split('-').map(Number);
    const dataFatura = new Date(anoRef, mesRef - 1, 1);

    const parcelas = linha.parcelas;
    const itens: ItemFatura[] = [];

    if (parcelas && parcelas.atual <= parcelas.total) {
      for (let i = parcelas.atual; i <= parcelas.total; i++) {
        const dataParcela = new Date(dataFatura);
        dataParcela.setMonth(dataFatura.getMonth() + (i - parcelas.atual));
        itens.push({
          id: gerarId(),
          cartaoId: cartaoImportId,
          data: dataParcela.toISOString().split('T')[0],
          descricao: `${linha.descricao.replace(/\s*\d{1,2}\/\d{1,2}\s*/g, '').trim()} (${i}/${parcelas.total})`,
          valor: linha.valor,
          categoria: linha.categoria,
          pessoa: 'Anderson Ferreira',
          parcelas: parcelas.total,
          parcelaAtual: i,
          parcelamento: { parcelaAtual: i, totalParcelas: parcelas.total },
        });
      }
    } else {
      itens.push({
        id: gerarId(),
        cartaoId: cartaoImportId,
        data: dataFatura.toISOString().split('T')[0],
        descricao: linha.descricao,
        valor: linha.valor,
        categoria: linha.categoria,
        pessoa: 'Anderson Ferreira',
        parcelas: 1,
        parcelaAtual: 1,
      });
    }

    onLancarItensCSV(cartaoImportId, itens);
    setLinhasExtrato(prev =>
      prev.map(l => l.id === linha.id ? { ...l, status: 'conciliado' } : l)
    );
    setLancandoId(null);
  };

  const handleLancarTodos = () => {
    const pendentes = linhasExtrato.filter(l => l.status === 'pendente');
    pendentes.forEach(l => handleLancarItem(l));
  };

  const obterFatura = (cartaoId: string): FaturaMensal | null => {
    const faturasDoMes = faturas[mesReferencia] || [];
    return faturasDoMes.find((f: FaturaMensal) => f.cartaoId === cartaoId) || null;
  };

  const handleExcluirCartao = (cartaoId: string) => {
    if (confirmandoExclusao === cartaoId) {
      onExcluirCartao(cartaoId);
      setConfirmandoExclusao(null);
      setMenuAberto(null);
    } else {
      setConfirmandoExclusao(cartaoId);
      setTimeout(() => setConfirmandoExclusao(null), 3000);
    }
  };

  const abrirEdicaoItem = (cartaoId: string, item: ItemFatura) => {
    setItemEditando({ cartaoId, item });
    setEditDescricao(item.descricao);
    setEditValor(String(item.valor));
    setEditCategoria(item.categoria);
  };

  const salvarEdicaoItem = () => {
    if (!itemEditando) return;
    const valorNum = parseFloat(editValor.replace(',', '.'));
    if (isNaN(valorNum) || valorNum <= 0) return;
    const itemAtualizado: ItemFatura = {
      ...itemEditando.item,
      descricao: editDescricao.trim() || itemEditando.item.descricao,
      valor: valorNum,
      categoria: editCategoria,
    };
    onEditarItemFatura(itemEditando.cartaoId, itemAtualizado, mesReferencia);
    setItemEditando(null);
  };

  const pendentes = linhasExtrato.filter(l => l.status === 'pendente').length;
  const conciliados = linhasExtrato.filter(l => l.status === 'conciliado').length;

  if (cartoes.length === 0) {
    return (
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '3rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Nenhum cartão cadastrado</h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Cadastre seus cartões de crédito para gerenciar as faturas</p>
        <button onClick={onCadastrarCartao} style={{ padding: '0.75rem 1.5rem', background: '#06b6d4', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}>
          + Cadastrar Primeiro Cartão
        </button>
      </div>
    );
  }

  return (
    <>
      <div onClick={() => setMenuAberto(null)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Meus Cartões</h3>
          <button onClick={onCadastrarCartao} style={{ padding: '0.5rem 1rem', background: '#06b6d4', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}>
            + {isMobile ? 'Novo' : 'Novo Cartão'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {cartoes.map(cartao => {
            const fatura = obterFatura(cartao.id);
            const totalFatura = fatura?.totalFatura || 0;
            const itensFatura = fatura?.itens || [];
            const estaPaga = fatura?.paga || false;
            const excluindo = confirmandoExclusao === cartao.id;
            const menuEsteAberto = menuAberto === cartao.id;

            return (
              <div key={cartao.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
                <div style={{ background: cartao.cor || '#06b6d4', padding: '1.5rem', color: 'white', position: 'relative', minHeight: isMobile ? '120px' : '160px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.9, marginBottom: '0.25rem' }}>{cartao.bandeira}</div>
                      <div style={{ fontSize: isMobile ? '1.125rem' : '1.25rem', fontWeight: '700' }}>{cartao.nome}</div>
                    </div>

                    <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuAberto(menuEsteAberto ? null : cartao.id)}
                        style={{ background: menuEsteAberto ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '0.375rem', color: 'white', cursor: 'pointer', padding: '0.2rem 0.75rem', fontSize: '1.375rem', fontWeight: '700', lineHeight: '1', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                        onMouseLeave={e => { if (!menuEsteAberto) e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                        title="Opções do cartão"
                      >
                        ···
                      </button>

                      {menuEsteAberto && (
                        <div style={{ position: 'absolute', top: '110%', right: 0, background: 'white', borderRadius: '0.5rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 50, minWidth: '190px', overflow: 'hidden' }}>
                          <button onClick={() => { onEditarCartao(cartao); setMenuAberto(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#374151', textAlign: 'left' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            ✏️ Editar Cartão
                          </button>
                          <div style={{ height: '1px', background: '#f3f4f6' }} />
                          <button onClick={() => { abrirModalImport(cartao.id); setMenuAberto(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#374151', textAlign: 'left' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                            📂 Importar Extrato
                          </button>
                          <div style={{ height: '1px', background: '#f3f4f6' }} />
                          <button onClick={() => handleExcluirCartao(cartao.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.75rem 1rem', background: excluindo ? '#fef2f2' : 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: excluindo ? '#dc2626' : '#6b7280', textAlign: 'left', fontWeight: excluindo ? '700' : '400' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}
                            onMouseLeave={e => { if (!excluindo) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#6b7280'; } }}>
                            {excluindo ? '⚠️ Confirmar?' : '🗑️ Excluir Cartão'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', opacity: 0.9 }}>Limite: {formatarMoeda(cartao.limite)}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.25rem' }}>
                    Vencimento: dia {cartao.diaVencimento} • Fechamento: dia {cartao.diaFechamento}
                  </div>
                </div>

                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Fatura atual</div>
                      <div style={{ fontSize: isMobile ? '1.375rem' : '1.5rem', fontWeight: '700', color: estaPaga && totalFatura > 0 ? '#10b981' : totalFatura > 0 ? '#ef4444' : '#374151' }}>
                        {formatarMoeda(totalFatura)}
                      </div>
                    </div>
                    {estaPaga && totalFatura > 0 ? (
                      <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600' }}>✓ Paga</div>
                    ) : totalFatura > 0 ? (
                      <div style={{ background: '#fef2f2', color: '#991b1b', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600' }}>⏳ Pendente</div>
                    ) : null}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                    {itensFatura.length} {itensFatura.length === 1 ? 'compra' : 'compras'} neste mês
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => onAdicionarCompra(cartao.id)}
                      style={{ flex: 1, padding: '0.625rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer' }}>
                      + Compra
                    </button>
                    {totalFatura > 0 && !estaPaga && (
                      <button onClick={() => onPagarFatura(cartao.id, mesReferencia)}
                        style={{ flex: 1, padding: '0.625rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer' }}>
                        {isMobile ? 'Pagar' : 'Pagar Fatura'}
                      </button>
                    )}
                    {itensFatura.length > 0 && (
                      <button onClick={() => setCartaoSelecionado(cartaoSelecionado === cartao.id ? null : cartao.id)}
                        style={{ padding: '0.625rem 0.75rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
                        {cartaoSelecionado === cartao.id ? '▼' : '▶'}
                      </button>
                    )}
                  </div>

                  {cartaoSelecionado === cartao.id && itensFatura.length > 0 && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>Itens da Fatura:</div>
                      {itensFatura.map((item: ItemFatura) => {
                        const esteItemEditando = itemEditando?.item.id === item.id && itemEditando?.cartaoId === cartao.id;
                        return (
                          <div key={item.id}>
                            {!esteItemEditando && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.8125rem' }}>
                                <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                                  <div style={{ fontWeight: '500', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.descricao}
                                    {item.parcelamento && (
                                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6b7280', background: '#f3f4f6', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
                                        {item.parcelamento.parcelaAtual}/{item.parcelamento.totalParcelas}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                    {item.categoria} • {new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                                  <span style={{ fontWeight: '600', color: '#ef4444', marginRight: '0.25rem', fontSize: '0.875rem' }}>{formatarMoeda(item.valor)}</span>
                                  <button onClick={() => abrirEdicaoItem(cartao.id, item)} title="Editar item"
                                    style={{ background: '#f3f4f6', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}>✏️</button>
                                  <button onClick={() => { if (confirm(`Remover "${item.descricao}" da fatura?`)) onExcluirItemFatura(cartao.id, item.id, mesReferencia); }} title="Remover da fatura"
                                    style={{ background: '#fef2f2', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', padding: '0.2rem 0.45rem', fontSize: '0.75rem' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>🗑️</button>
                                </div>
                              </div>
                            )}

                            {esteItemEditando && (
                              <div style={{ padding: '0.75rem', margin: '0.25rem 0 0.5rem', background: '#f0f9ff', borderRadius: '0.5rem', border: '1px solid #bae6fd' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0369a1', marginBottom: '0.5rem' }}>✏️ Editando item</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  <input type="text" value={editDescricao} onChange={e => setEditDescricao(e.target.value)} placeholder="Descrição"
                                    style={{ padding: '0.5rem 0.625rem', border: '1px solid #bae6fd', borderRadius: '0.375rem', fontSize: '0.8125rem', outline: 'none', background: 'white' }} />
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <input type="number" value={editValor} onChange={e => setEditValor(e.target.value)} placeholder="Valor"
                                      style={{ padding: '0.5rem 0.625rem', border: '1px solid #bae6fd', borderRadius: '0.375rem', fontSize: '0.8125rem', outline: 'none', background: 'white' }} />
                                    <input type="text" value={editCategoria} onChange={e => setEditCategoria(e.target.value)} placeholder="Categoria"
                                      style={{ padding: '0.5rem 0.625rem', border: '1px solid #bae6fd', borderRadius: '0.375rem', fontSize: '0.8125rem', outline: 'none', background: 'white' }} />
                                  </div>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={salvarEdicaoItem}
                                      style={{ flex: 1, padding: '0.5rem', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.8125rem', fontWeight: '600', cursor: 'pointer' }}>💾 Salvar</button>
                                    <button onClick={() => setItemEditando(null)}
                                      style={{ flex: 1, padding: '0.5rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.375rem', fontSize: '0.8125rem', cursor: 'pointer' }}>Cancelar</button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Modal de Importação de Extrato PDF ─────────────────────────────────── */}
      {modalImportAberto && (
        <div onClick={fecharModalImport}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#374151', margin: 0 }}>📂 Importar Extrato PDF</h3>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                  Cartão: <strong>{cartoes.find(c => c.id === cartaoImportId)?.nome}</strong> · Fatura: <strong>{mesReferencia}</strong>
                </div>
              </div>
              <button onClick={fecharModalImport} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1 }}>
              {linhasExtrato.length === 0 && (
                <div>
                  <div onClick={() => fileInputRef.current?.click()}
                    style={{ border: '2px dashed #e5e7eb', borderRadius: '0.75rem', padding: '2.5rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#06b6d4'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = '#e5e7eb'}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📄</div>
                    <div style={{ fontWeight: '600', color: '#374151', marginBottom: '0.375rem' }}>
                      {processando ? 'Processando...' : 'Clique para selecionar o PDF'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Fatura do cartão em PDF — Riachuelo, Bradescard/Tumelero, Bourbon/Zaffari, PicPay, Nubank e outros
                    </div>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleArquivoSelecionado} style={{ display: 'none' }} />

                  {processando && (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#6b7280' }}>
                      <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTop: '3px solid #06b6d4', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem' }} />
                      Extraindo texto do PDF...
                    </div>
                  )}

                  {erroImport && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.875rem', marginTop: '1rem', fontSize: '0.875rem', color: '#991b1b' }}>
                      ⚠️ {erroImport}
                    </div>
                  )}

                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem', padding: '0.875rem', marginTop: '1rem', fontSize: '0.8rem', color: '#0369a1' }}>
                    💡 <strong>Como funciona:</strong> todos os itens são lançados na fatura do mês selecionado no dashboard. Parcelas futuras vão automaticamente para os próximos meses.
                  </div>
                </div>
              )}

              {linhasExtrato.length > 0 && (
                <div>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem', padding: '0.75rem 1rem', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>{conciliados}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>✅ Conciliados</div>
                    </div>
                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>{pendentes}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>⚠️ Pendentes</div>
                    </div>
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem 1rem', flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#374151' }}>{linhasExtrato.length}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total lido</div>
                    </div>
                  </div>

                  {pendentes > 1 && (
                    <button onClick={handleLancarTodos}
                      style={{ width: '100%', padding: '0.75rem', background: 'linear-gradient(135deg, #06b6d4, #0284c7)', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', marginBottom: '1rem' }}>
                      ⚡ Lançar Todos os Pendentes ({pendentes})
                    </button>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {linhasExtrato.map(linha => (
                      <div key={linha.id} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: '0.5rem',
                        background: linha.status === 'conciliado' ? '#f0fdf4' : '#fafafa',
                        border: `1px solid ${linha.status === 'conciliado' ? '#bbf7d0' : '#e5e7eb'}`,
                      }}>
                        <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>{linha.status === 'conciliado' ? '✅' : '⚠️'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {linha.descricao}
                            {linha.parcelas && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: '#e0f2fe', color: '#0369a1', padding: '0.1rem 0.35rem', borderRadius: '0.25rem' }}>
                                {linha.parcelas.atual}/{linha.parcelas.total} — lança do {linha.parcelas.atual}º ao {linha.parcelas.total}º
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {new Date(linha.data + 'T00:00:00').toLocaleDateString('pt-BR')} · {linha.categoria}
                          </div>
                        </div>
                        <div style={{ fontWeight: '700', color: '#ef4444', fontSize: '0.9rem', flexShrink: 0 }}>{formatarMoeda(linha.valor)}</div>
                        {linha.status === 'pendente' && onLancarItensCSV && (
                          <button onClick={() => handleLancarItem(linha)} disabled={lancandoId === linha.id}
                            style={{ padding: '0.375rem 0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {lancandoId === linha.id ? '...' : '+ Lançar'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button onClick={() => { setLinhasExtrato([]); setErroImport(''); }}
                    style={{ width: '100%', padding: '0.625rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', cursor: 'pointer', marginTop: '1rem' }}>
                    📂 Carregar outro PDF
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', flexShrink: 0 }}>
              <button onClick={fecharModalImport}
                style={{ width: '100%', padding: '0.75rem', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}