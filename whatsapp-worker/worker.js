/**
 * FinControl — Worker multi-canal (WhatsApp + Discord)
 *
 * WhatsApp:  POST /          (webhook Meta Cloud API)
 * Discord:   POST /discord   (interactions endpoint, slash command /add)
 *
 * Variáveis (painel Cloudflare / wrangler.jsonc):
 *   WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN  — WhatsApp
 *   DISCORD_PUBLIC_KEY, DISCORD_APP_ID             — Discord
 *   FIREBASE_SECRET                                — Firebase REST (secret)
 */

const FIREBASE_DB = 'https://nossas-contas-ed340-v2-default-rtdb.firebaseio.com';

// WhatsApp: telefone (últimos 8 dígitos) → UID
const PESSOAS = [
  { ultimos8: '95976134', uid: 'KH17mEyb6LQgRZztktRecPpvgT83', nome: 'Anderson Ferreira' },
  // { ultimos8: '00000000', uid: 'q9jbIxoA5Oh6IIuUPfi5K8PGFbD3', nome: 'Evelin Mulbaier' },
];

// Discord: ID do usuário → UID (preenchido depois do 1º /add, que revela o ID)
const PESSOAS_DISCORD = [
  { discordId: '1182096672050905129', uid: 'KH17mEyb6LQgRZztktRecPpvgT83', nome: 'Anderson Ferreira' },
  // { discordId: '...', uid: 'q9jbIxoA5Oh6IIuUPfi5K8PGFbD3', nome: 'Evelin Mulbaier' },
];

function acharPessoa(telefone) {
  const digitos = (telefone || '').replace(/\D/g, '');
  return PESSOAS.find(p => p.ultimos8 === digitos.slice(-8)) || null;
}

// ─────────────────────────────────────────────────────────────
// PARSER — cópia de parsearInputMagico
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
// HELPERS
// ─────────────────────────────────────────────────────────────

function gerarMesKey(data) { return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`; }
function gerarId() { return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; }
function formatarMoeda(valor) { return 'R$ ' + valor.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

async function fbGet(path, secret) {
  const r = await fetch(`${FIREBASE_DB}/${path}.json?auth=${secret}`);
  if (!r.ok) return null;
  return r.json();
}
async function fbPut(path, secret, data) {
  return fetch(`${FIREBASE_DB}/${path}.json?auth=${secret}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
}

// Lógica compartilhada: parseia, grava no Firebase e devolve o texto de confirmação.
async function registrar(env, uid, nome, textoEntrada) {
  const [cartoes, categoriasCustom] = await Promise.all([
    fbGet(`usuarios/${uid}/cartoes`, env.FIREBASE_SECRET),
    fbGet(`usuarios/${uid}/categoriasCustomizadas`, env.FIREBASE_SECRET),
  ]);
  const dados = parsearInputMagico(
    textoEntrada, nome,
    Array.isArray(cartoes) ? cartoes : (cartoes ? Object.values(cartoes) : undefined),
    Array.isArray(categoriasCustom) ? categoriasCustom : (categoriasCustom ? Object.values(categoriasCustom) : undefined),
  );
  if (!dados) return 'Não entendi 🤔\nMande algo como:\n"150 mercado"\n"nubank 200 gasolina"\n"300 farmacia 3x"';

  // Crédito no cartão → fatura (parcelado espalha pelos meses)
  if (dados.metodoPagamento === 'cartao' && dados.cartaoId) {
    const totalParcelas = dados.parcelas && dados.parcelas > 1 ? dados.parcelas : 1;
    const valorParcela = parseFloat((dados.valor / totalParcelas).toFixed(2));
    const faturasPath = `usuarios/${uid}/faturas`;
    const faturasAtual = await fbGet(faturasPath, env.FIREBASE_SECRET);
    const novasFaturas = (faturasAtual && typeof faturasAtual === 'object') ? faturasAtual : {};
    const mesesAfetados = [];
    for (let i = 0; i < totalParcelas; i++) {
      const dataBase = new Date(dados.data + 'T00:00:00');
      dataBase.setMonth(dataBase.getMonth() + i);
      const mesFatura = gerarMesKey(dataBase);
      mesesAfetados.push(mesFatura);
      const item = {
        id: gerarId(), cartaoId: dados.cartaoId, data: dataBase.toISOString().split('T')[0],
        descricao: dados.descricao, valor: valorParcela, categoria: dados.categoria,
        pessoa: dados.pessoa, parcelas: totalParcelas, parcelaAtual: i + 1,
      };
      if (totalParcelas > 1) item.parcelamento = { parcelaAtual: i + 1, totalParcelas };
      let listaMes = novasFaturas[mesFatura];
      listaMes = Array.isArray(listaMes) ? listaMes : (listaMes ? Object.values(listaMes) : []);
      novasFaturas[mesFatura] = listaMes;
      const existente = listaMes.find(f => f && f.cartaoId === dados.cartaoId);
      if (existente) {
        existente.itens = Array.isArray(existente.itens) ? existente.itens : (existente.itens ? Object.values(existente.itens) : []);
        existente.itens.push(item);
        existente.totalFatura = existente.itens.reduce((s, it) => s + it.valor, 0);
      } else {
        listaMes.push({ cartaoId: dados.cartaoId, mesReferencia: mesFatura, itens: [item], totalFatura: valorParcela, paga: false });
      }
    }
    await fbPut(faturasPath, env.FIREBASE_SECRET, novasFaturas);
    const linhas = [
      `💳 Compra no cartão${dados.cartaoNome ? ' ' + dados.cartaoNome : ''}`, ``,
      `${formatarMoeda(dados.valor)} — ${dados.descricao}`, `${dados.categoria}`,
    ];
    if (totalParcelas > 1) {
      linhas.push(`${totalParcelas}x de ${formatarMoeda(valorParcela)}`);
      linhas.push(`Lançado nas faturas ${mesesAfetados[0]} → ${mesesAfetados[mesesAfetados.length - 1]}`);
    } else {
      linhas.push(`Fatura ${mesesAfetados[0]}`);
    }
    return linhas.join('\n');
  }

  if (dados.metodoPagamento === 'cartao' && !dados.cartaoId) {
    return '❌ Não achei esse cartão.\nCadastre ele no app primeiro, ou escreva o nome certo.\nEx: "nubank 150 gasolina"';
  }

  // Dinheiro / débito / receita → dadosPorMes
  const transacao = {
    id: gerarId(), data: dados.data, categoria: dados.categoria, descricao: dados.descricao,
    valor: dados.valor, pessoa: dados.pessoa, tipo: dados.tipo, pago: dados.pago,
  };
  if (dados.quilometragem) transacao.quilometragem = dados.quilometragem;
  const mesKey = gerarMesKey(new Date(dados.data + 'T12:00:00'));
  const path = `usuarios/${uid}/dadosPorMes/${mesKey}`;
  const atual = await fbGet(path, env.FIREBASE_SECRET);
  const lista = Array.isArray(atual) ? atual : (atual ? Object.values(atual) : []);
  lista.push(transacao);
  await fbPut(path, env.FIREBASE_SECRET, lista);
  const emoji = dados.tipo === 'renda' ? '💰' : '✅';
  return [
    `${emoji} ${dados.tipo === 'renda' ? 'Receita' : 'Despesa'} registrada`, ``,
    `${formatarMoeda(dados.valor)} — ${dados.descricao}`, `${dados.categoria}`,
  ].join('\n');
}

async function responderWhatsApp(env, para, texto) {
  const r = await fetch(`https://graph.facebook.com/v21.0/${env.PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: para, type: 'text', text: { body: texto } }),
  });
  const corpo = await r.text();
  console.log('[REPLY] para=' + para + ' status=' + r.status + ' resp=' + corpo);
}

// ─── Discord: verificação de assinatura Ed25519 ───
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

// ─────────────────────────────────────────────────────────────
// WORKER
// ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ─── DISCORD (POST /discord) ───
    if (url.pathname === '/discord' && request.method === 'POST') {
      const raw = await request.text();
      const valido = await verificarDiscord(request, raw, env.DISCORD_PUBLIC_KEY);
      if (!valido) return new Response('invalid request signature', { status: 401 });

      const interaction = JSON.parse(raw);
      if (interaction.type === 1) return jsonResp({ type: 1 }); // PING → PONG

      if (interaction.type === 2) { // slash command
        const userId = interaction.member?.user?.id || interaction.user?.id;
        const pessoa = PESSOAS_DISCORD.find(p => p.discordId === userId);
        if (!pessoa) {
          return jsonResp({ type: 4, data: { content: `👋 Seu ID do Discord é \`${userId}\`.\nPasse esse ID pro admin autorizar você no FinControl.`, flags: 64 } });
        }
        const texto = interaction.data?.options?.[0]?.value || '';
        // Responde "pensando..." e faz o trabalho em background (limite de 3s do Discord)
        ctx.waitUntil((async () => {
          let resultado;
          try { resultado = await registrar(env, pessoa.uid, pessoa.nome, texto); }
          catch (e) { resultado = '⚠️ Deu um erro ao registrar. Tenta de novo.'; }
          await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APP_ID}/${interaction.token}/messages/@original`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: resultado }),
          });
        })());
        return jsonResp({ type: 5, data: { flags: 64 } }); // DEFERRED + EPHEMERAL (só o usuário vê)
      }
      return jsonResp({ type: 4, data: { content: 'Comando não reconhecido.' } });
    }

    // ─── WHATSAPP: verificação do webhook (GET /) ───
    if (request.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      if (mode === 'subscribe' && token === env.VERIFY_TOKEN) return new Response(challenge, { status: 200 });
      return new Response('Forbidden', { status: 403 });
    }

    // ─── WHATSAPP: mensagem recebida (POST /) ───
    if (request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return new Response('OK', { status: 200 }); }
      try {
        const valor = body?.entry?.[0]?.changes?.[0]?.value;
        if (valor?.statuses) console.log('[STATUS] ' + JSON.stringify(valor.statuses));
        const msg = valor?.messages?.[0];
        if (!msg || msg.type !== 'text') return new Response('OK', { status: 200 });

        const de = msg.from;
        console.log('[FROM] ' + de + ' texto=' + msg.text.body);
        const pessoa = acharPessoa(de);
        if (!pessoa) {
          await responderWhatsApp(env, de, 'Número não autorizado para o FinControl.');
          return new Response('OK', { status: 200 });
        }
        const resultado = await registrar(env, pessoa.uid, pessoa.nome, msg.text.body);
        await responderWhatsApp(env, de, resultado);
        return new Response('OK', { status: 200 });
      } catch (e) {
        return new Response('OK', { status: 200 });
      }
    }

    return new Response('FinControl Worker (WhatsApp + Discord)', { status: 200 });
  },
};
