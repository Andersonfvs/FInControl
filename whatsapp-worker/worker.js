/**
 * FinControl — Worker do Discord (canal oficial de lançamento)
 *
 * Discord: POST /discord  (interactions endpoint, slash command /add)
 * Fluxo: /add <texto> → parseia → grava no Firebase (REST) → responde embed (privado).
 *
 * Variáveis (wrangler.jsonc / painel Cloudflare):
 *   DISCORD_PUBLIC_KEY, DISCORD_APP_ID   — Discord (públicos)
 *   FIREBASE_SECRET                      — Firebase REST (secret, acesso total)
 */

const FIREBASE_DB = 'https://nossas-contas-ed340-v2-default-rtdb.firebaseio.com';
const GOLD = 0xcc9166;
const RED = 0xc0392b;
const MAX_INPUT = 200; // limite de tamanho do lançamento (anti-abuso)

// Discord: ID do usuário → UID do Firebase. Bot revela o ID se não-autorizado.
const PESSOAS_DISCORD = [
  { discordId: '1182096672050905129', uid: 'KH17mEyb6LQgRZztktRecPpvgT83', nome: 'Anderson Ferreira' },
  // { discordId: '...', uid: 'q9jbIxoA5Oh6IIuUPfi5K8PGFbD3', nome: 'Evelin Mulbaier' },
];

// ─────────────────────────────────────────────────────────────
// PARSER — cópia de parsearInputMagico (src/utils/categorias.ts)
// ─────────────────────────────────────────────────────────────

const MAPA_CATEGORIAS_PALAVRAS = [
  { palavras: ['lanche','comida','pizza','hamburguer','almoço','almoco','jantar','cafe','ifood','delivery','restaurante','mercadao','mc','mcdonalds','burguer','rancho','hortifruti','padaria','açougue','acougue','churrasco','sushi','lanchonete','sorveteria','brigadeiro'], categoria: 'Alimentação' },
  { palavras: ['onibus','ônibus','uber','taxi','combustivel','gasolina','transporte','metro','passagem','99','etanol','posto','shell','ipiranga','br dist','estacionamento','pedagio','pedágio','bicicleta','patinete','moto'], categoria: 'Transporte' },
  { palavras: ['mercado','supermercado','feira','extra','carrefour','pao de acucar','atacadao','assai','atakarejo','dia','sonda','prezunic','mundial'], categoria: 'Alimentação' },
  { palavras: ['aluguel','condominio','iptu','moradia','alugel'], categoria: 'Moradia' },
  { palavras: ['luz','agua','energia','internet','telefone','celular','gas','conta de','copel','cemig','eletropaulo','enel','sabesp','cedae','claro','vivo','tim','oi','net','nextel','sky','starlink'], categoria: 'Serviços' },
  { palavras: ['farmacia','remedio','medico','hospital','consulta','saude','dentista','plano','drogaria','ultrafarma','droga raia','pacheco','unimed','amil','bradesco saude','hapvida','clinica','exame','laboratorio','fisioterapia','psicologo','psiquiatra','nutricionista'], categoria: 'Saúde' },
  { palavras: ['escola','faculdade','curso','livro','educacao','mensalidade','universidade','colegio','material escolar','apostila','certificado'], categoria: 'Educação' },
  { palavras: ['roupa','sapato','shopping','loja','vestuario','calcado','renner','riachuelo','cea','hm','zara','forever','marisa','camiseta','calca','tenis','sandalia','bolsa','mala'], categoria: 'Vestuário' },
  { palavras: ['cinema','netflix','spotify','lazer','festa','bar','viagem','show','disney','hbo','globoplay','amazon prime','apple tv','teatro','parque','hotel','pousada','airbnb','ingresso','jogo','game','playstation','xbox','steam'], categoria: 'Lazer' },
  { palavras: ['academia','ginasio','musculacao','smartfit','bodytech','bluefit','crossfit','pilates','yoga','natacao'], categoria: 'Saúde' },
  { palavras: ['salario','salário','freelance','freela'], categoria: 'Salário' },
  { palavras: ['shopee','mercado livre','amazon','aliexpress','americanas','submarino','kabum','magalu','magazine','casas bahia'], categoria: 'Compras Online' },
  { palavras: ['pet','veterinario','racao','cobasi','petz','cachorro','gato','animal','banho tosa'], categoria: 'Outras Despesas' },
  { palavras: ['beleza','cabelo','salao','manicure','pedicure','estetica','barbearia','depilacao','maquiagem','perfume'], categoria: 'Outras Despesas' },
  { palavras: ['manutencao','manutenção','mecanico','mecânico','revisao','revisão','troca de oleo','oleo','pneu','freio','bateria','filtro','correia','funilaria','borracharia','alinhamento','balanceamento'], categoria: 'Manutenção Veículo' },
];

const CARTOES_CONHECIDOS = { nubank:'Nubank', nu:'Nubank', inter:'Inter', c6:'C6 Bank', itau:'Itaú', 'itaú':'Itaú', bradesco:'Bradesco', santander:'Santander', caixa:'Caixa', bb:'Banco do Brasil', sicoob:'Sicoob', sicredi:'Sicredi' };

function buscarCartaoPorNome(resto, cartoes) {
  for (const cartao of cartoes) {
    const palavras = cartao.nome.toLowerCase().split(/\s+/);
    if (palavras.some(p => p.length > 2 && resto.includes(p))) {
      let restoAtualizado = resto;
      palavras.forEach(p => { if (p.length > 2) restoAtualizado = restoAtualizado.replace(p, '').trim(); });
      return { cartaoId: cartao.id, cartaoNome: cartao.nome, restoAtualizado };
    }
  }
  return null;
}

function parsearInputMagico(input, usuarioNome, cartoes, categoriasCustom) {
  const texto = (input || '').trim();
  if (!texto) return null;
  let resto = texto.toLowerCase();

  const matchValor = resto.match(/(\d+(?:[.,]\d{1,2})?)/);
  if (!matchValor) return null;
  const valor = parseFloat(matchValor[1].replace(',', '.'));
  if (isNaN(valor) || valor <= 0) return null;
  resto = resto.replace(matchValor[1], '').trim();

  let quilometragem;
  const matchKm = resto.match(/(\d{1,6}(?:[.,]\d{3})?)\s*km\b/i);
  if (matchKm) {
    const kmNum = parseInt(matchKm[1].replace(/[.,]/g, ''));
    if (!isNaN(kmNum) && kmNum > 0) quilometragem = kmNum;
    resto = resto.replace(matchKm[0], '').trim();
  }

  const dataBR = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d);
  let data = dataBR(new Date());
  if (resto.includes('ontem')) {
    data = dataBR(new Date(Date.now() - 24 * 60 * 60 * 1000));
    resto = resto.replace('ontem', '').trim();
  } else if (resto.includes('hoje')) {
    resto = resto.replace('hoje', '').trim();
  } else {
    const matchData = resto.match(/(\d{1,2})[\/\-](\d{1,2})/);
    if (matchData) {
      const dia = parseInt(matchData[1]); const mes = parseInt(matchData[2]);
      const ano = parseInt(dataBR(new Date()).slice(0, 4));
      if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
        data = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        resto = resto.replace(matchData[0], '').trim();
      }
    }
  }

  let pessoa = usuarioNome;
  if (resto.includes('anderson')) { pessoa = 'Anderson Ferreira'; resto = resto.replace(/anderson(\s+ferreira)?/, '').trim(); }
  else if (resto.includes('evelin')) { pessoa = 'Evelin Mulbaier'; resto = resto.replace(/evelin(\s+mulbaier)?/, '').trim(); }

  const forcaReceita = resto.includes('receita') || resto.includes('renda') || resto.includes('salario') || resto.includes('salário');
  if (forcaReceita) resto = resto.replace(/receita|renda|salario|salário/g, '').trim();

  let parcelas;
  const matchParcelas = resto.match(/(\d+)\s*x\b/);
  if (matchParcelas) { const n = parseInt(matchParcelas[1]); if (n > 1 && n <= 72) parcelas = n; resto = resto.replace(matchParcelas[0], '').trim(); }

  let metodoPagamento = 'dinheiro';
  let cartaoId, cartaoNome;
  let pago = true;

  const ehDebito = /\bdebito\b|\bdébito\b/.test(resto);
  if (ehDebito) resto = resto.replace(/\bdebito\b|\bdébito\b/g, '').trim();

  const temCreditoExplicito = /credito|crédito|cartao|cartão/.test(resto);
  if (temCreditoExplicito) resto = resto.replace(/credito|crédito|cartao|cartão/g, '').trim();

  let achouCartao = false;
  for (const [palavra, nomeCartao] of Object.entries(CARTOES_CONHECIDOS)) {
    const re = new RegExp(`\\b${palavra}\\b`);
    if (re.test(resto)) {
      cartaoNome = nomeCartao; resto = resto.replace(re, '').trim();
      if (cartoes) { const enc = cartoes.find(c => c.nome.toLowerCase().includes(palavra) || nomeCartao.toLowerCase().includes(c.nome.toLowerCase())); if (enc) { cartaoId = enc.id; cartaoNome = enc.nome; } }
      achouCartao = true; break;
    }
  }
  if (!achouCartao && cartoes) {
    const r = buscarCartaoPorNome(resto, cartoes);
    if (r) { cartaoId = r.cartaoId; cartaoNome = r.cartaoNome; resto = r.restoAtualizado; achouCartao = true; }
  }

  if (!ehDebito && (achouCartao || temCreditoExplicito || (parcelas && parcelas > 1))) {
    metodoPagamento = 'cartao'; pago = false;
    if (!cartaoId && cartoes && cartoes.length === 1) { cartaoId = cartoes[0].id; cartaoNome = cartoes[0].nome; }
  }

  const tipo = forcaReceita ? 'renda' : 'despesa';
  let categoria = tipo === 'renda' ? 'Outras Receitas' : 'Outras Despesas';

  if (tipo === 'renda') {
    if (categoriasCustom) for (const cat of categoriasCustom) {
      if (cat.tipo !== 'renda' || !cat.palavrasChave) continue;
      if (cat.palavrasChave.some(p => p.trim() && resto.includes(p.toLowerCase().trim()))) { categoria = cat.nome; break; }
    }
    if (categoria === 'Outras Receitas') {
      if (resto.includes('salario') || resto.includes('salário')) categoria = 'Salário';
      else if (resto.includes('vale')) categoria = 'Vale Alimentação';
      else if (resto.includes('shopee')) categoria = 'Venda Shopee';
      else if (resto.includes('freelance') || resto.includes('freela')) categoria = 'Freelance';
    }
  } else {
    let achouCustom = false;
    if (categoriasCustom) for (const cat of categoriasCustom) {
      if (cat.tipo !== 'despesa' || !cat.palavrasChave) continue;
      if (cat.palavrasChave.some(p => p.trim() && resto.includes(p.toLowerCase().trim()))) { categoria = cat.nome; achouCustom = true; break; }
    }
    if (!achouCustom) for (const { palavras, categoria: cat } of MAPA_CATEGORIAS_PALAVRAS) {
      if (palavras.some(p => resto.includes(p))) { categoria = cat; break; }
    }
  }

  const IGNORAR = new Set(['de','do','da','dos','das','no','na','nos','nas','em','a','o','e','r$','reais','real','pra','pro','para','com','um','uma']);
  const palavrasResto = resto.replace(/[^\w\s]/g, '').split(/\s+/).filter(p => p.length > 1 && !IGNORAR.has(p));
  const descricao = palavrasResto.slice(0, 4).join(' ');
  const descricaoFinal = descricao ? descricao.charAt(0).toUpperCase() + descricao.slice(1) : (tipo === 'renda' ? 'Receita' : 'Despesa');

  return { valor, descricao: descricaoFinal, data, pessoa, categoria, tipo, metodoPagamento, cartaoId, cartaoNome, pago, parcelas, quilometragem };
}

// ─────────────────────────────────────────────────────────────
// FIREBASE (REST) + HELPERS
// ─────────────────────────────────────────────────────────────

function gerarMesKey(data) { return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`; }
function gerarId() { return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
function formatarMoeda(valor) { return 'R$ ' + valor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
const comoArray = (v) => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);

async function fbGet(path, secret) {
  const r = await fetch(`${FIREBASE_DB}/${path}.json?auth=${encodeURIComponent(secret)}`);
  if (!r.ok) throw new Error('fbGet ' + r.status);
  return r.json();
}
async function fbPut(path, secret, data) {
  const r = await fetch(`${FIREBASE_DB}/${path}.json?auth=${encodeURIComponent(secret)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error('fbPut ' + r.status);
  return r;
}

// Parseia, grava (read-modify-write) e devolve um resultado estruturado pro embed.
async function registrar(env, uid, nome, textoEntrada) {
  const [cartoes, categoriasCustom] = await Promise.all([
    fbGet(`usuarios/${uid}/cartoes`, env.FIREBASE_SECRET).catch(() => null),
    fbGet(`usuarios/${uid}/categoriasCustomizadas`, env.FIREBASE_SECRET).catch(() => null),
  ]);

  const dados = parsearInputMagico(textoEntrada, nome, comoArray(cartoes) || undefined, comoArray(categoriasCustom) || undefined);
  if (!dados) {
    return { erro: true, titulo: '🤔 Não entendi', descricao: 'Manda algo como:\n`150 mercado`\n`nubank 200 gasolina`\n`300 farmacia 3x`' };
  }

  // ── Crédito → fatura (parcelado espalha pelos meses) ──
  if (dados.metodoPagamento === 'cartao' && dados.cartaoId) {
    const totalParcelas = dados.parcelas && dados.parcelas > 1 ? dados.parcelas : 1;
    const valorParcela = parseFloat((dados.valor / totalParcelas).toFixed(2));
    const faturasPath = `usuarios/${uid}/faturas`;
    const faturasAtual = await fbGet(faturasPath, env.FIREBASE_SECRET).catch(() => null);
    const faturas = (faturasAtual && typeof faturasAtual === 'object') ? faturasAtual : {};
    const meses = [];
    for (let i = 0; i < totalParcelas; i++) {
      const dataBase = new Date(dados.data + 'T00:00:00');
      dataBase.setMonth(dataBase.getMonth() + i);
      const mesFatura = gerarMesKey(dataBase);
      meses.push(mesFatura);
      const item = {
        id: gerarId(), cartaoId: dados.cartaoId, data: dataBase.toISOString().split('T')[0],
        descricao: dados.descricao, valor: valorParcela, categoria: dados.categoria,
        pessoa: dados.pessoa, parcelas: totalParcelas, parcelaAtual: i + 1,
      };
      if (totalParcelas > 1) item.parcelamento = { parcelaAtual: i + 1, totalParcelas };
      const listaMes = comoArray(faturas[mesFatura]);
      faturas[mesFatura] = listaMes;
      const existente = listaMes.find(f => f && f.cartaoId === dados.cartaoId);
      if (existente) {
        existente.itens = comoArray(existente.itens);
        existente.itens.push(item);
        existente.totalFatura = existente.itens.reduce((s, it) => s + it.valor, 0);
      } else {
        listaMes.push({ cartaoId: dados.cartaoId, mesReferencia: mesFatura, itens: [item], totalFatura: valorParcela, paga: false });
      }
    }
    await fbPut(faturasPath, env.FIREBASE_SECRET, faturas);

    let descricao = `**${formatarMoeda(dados.valor)}** — ${dados.descricao}\n${dados.categoria}`;
    descricao += totalParcelas > 1
      ? `\n${totalParcelas}x de ${formatarMoeda(valorParcela)} · faturas ${meses[0]} → ${meses[meses.length - 1]}`
      : `\nFatura ${meses[0]}`;
    return { titulo: `💳 ${dados.cartaoNome || 'Cartão'}`, descricao };
  }

  // ── Mencionou cartão mas não achei qual ──
  if (dados.metodoPagamento === 'cartao' && !dados.cartaoId) {
    return { erro: true, titulo: '❌ Cartão não encontrado', descricao: 'Cadastre o cartão no app, ou escreva o nome certo.\nEx: `nubank 150 gasolina`' };
  }

  // ── Dinheiro / débito / receita → dadosPorMes ──
  const transacao = {
    id: gerarId(), data: dados.data, categoria: dados.categoria, descricao: dados.descricao,
    valor: dados.valor, pessoa: dados.pessoa, tipo: dados.tipo, pago: dados.pago,
  };
  if (dados.quilometragem) transacao.quilometragem = dados.quilometragem;
  const mesKey = gerarMesKey(new Date(dados.data + 'T12:00:00'));
  const path = `usuarios/${uid}/dadosPorMes/${mesKey}`;
  const lista = comoArray(await fbGet(path, env.FIREBASE_SECRET).catch(() => null));
  lista.push(transacao);
  await fbPut(path, env.FIREBASE_SECRET, lista);

  return {
    titulo: dados.tipo === 'renda' ? '💰 Receita registrada' : '✅ Despesa registrada',
    descricao: `**${formatarMoeda(dados.valor)}** — ${dados.descricao}\n${dados.categoria}`,
  };
}

function montarEmbed(res) {
  return { color: res.erro ? RED : GOLD, title: res.titulo, description: res.descricao, footer: { text: 'FinControl' } };
}

// ─────────────────────────────────────────────────────────────
// DISCORD — verificação Ed25519 + roteamento
// ─────────────────────────────────────────────────────────────

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}
async function verificarDiscord(request, rawBody, publicKeyHex) {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');
  if (!signature || !timestamp) return false;
  try {
    const key = await crypto.subtle.importKey('raw', hexToBytes(publicKeyHex), { name: 'Ed25519' }, false, ['verify']);
    const data = new TextEncoder().encode(timestamp + rawBody);
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, hexToBytes(signature), data);
  } catch { return false; }
}
const jsonResp = (obj) => new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } });
const ephem = (content) => jsonResp({ type: 4, data: { content, flags: 64 } });

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/discord' && request.method === 'POST') {
      const raw = await request.text();
      if (!(await verificarDiscord(request, raw, env.DISCORD_PUBLIC_KEY))) {
        return new Response('invalid request signature', { status: 401 });
      }

      let interaction;
      try { interaction = JSON.parse(raw); } catch { return new Response('bad request', { status: 400 }); }

      if (interaction.type === 1) return jsonResp({ type: 1 }); // PING → PONG

      if (interaction.type === 2) { // slash command
        const userId = interaction.member?.user?.id || interaction.user?.id;
        const pessoa = PESSOAS_DISCORD.find(p => p.discordId === userId);
        if (!pessoa) {
          return ephem(`👋 Seu ID do Discord é \`${userId}\`.\nPasse esse ID pro admin autorizar você no FinControl.`);
        }

        const texto = (interaction.data?.options?.[0]?.value || '').trim();
        if (!texto) return ephem('Escreva o lançamento. Ex: `/add 150 mercado`');
        if (texto.length > MAX_INPUT) return ephem(`Texto muito longo (máx ${MAX_INPUT} caracteres).`);

        // Discord exige resposta em 3s → defere (privado) e termina o trabalho em background.
        ctx.waitUntil((async () => {
          let res;
          try { res = await registrar(env, pessoa.uid, pessoa.nome, texto); }
          catch (e) { console.error('registrar falhou:', e.message); res = { erro: true, titulo: '⚠️ Erro ao registrar', descricao: 'Tenta de novo daqui a pouco.' }; }
          await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${interaction.token}/messages/@original`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [montarEmbed(res)] }),
          }).catch((e) => console.error('follow-up falhou:', e.message));
        })());

        return jsonResp({ type: 5, data: { flags: 64 } }); // DEFERRED + EPHEMERAL (só o usuário vê)
      }

      return ephem('Comando não reconhecido.');
    }

    return new Response('FinControl Discord Worker', { status: 200 });
  },
};
