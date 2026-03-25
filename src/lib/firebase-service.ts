// ===== SERVIÇO DE FIREBASE PARA NEXT.JS =====
import { database } from './firebase';
import { ref, set, get, update, remove, onValue } from 'firebase/database';

// ===== TIPOS =====
export interface SistemaFinanceiro {
  receitas: Receita[];
  despesas: Despesa[];
  cartoes: Cartao[];
  metas: Meta[];
  reservaEmergencia?: ReservaEmergencia;
  configuracoes?: Configuracoes;
}

export interface Receita {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  pessoa: 'Anderson' | 'Evelin' | 'Ambos';
  recorrente?: boolean;
  categoria?: string;
}

export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  pessoa: 'Anderson' | 'Evelin' | 'Ambos';
  categoria: string;
  pago: boolean;
  cartaoId?: string;
  parcelas?: number;
  parcelaAtual?: number;
  dividir5050?: boolean;
}

export interface Cartao {
  id: string;
  nome: string;
  bandeira: string;
  limite: number;
  vencimento: number;
  pessoa: 'Anderson' | 'Evelin';
  compras: CompraCartao[];
}

export interface CompraCartao {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  pago: boolean;
}

export interface Meta {
  id: string;
  descricao: string;
  valorAlvo: number;
  valorAtual: number;
  prazo: string;
  pessoa: 'Anderson' | 'Evelin' | 'Ambos';
}

export interface ReservaEmergencia {
  valorInicial: number;
  valorAtual: number;
  dataInicio: string;
  taxaCDI: number;
  depositos: Deposito[];
}

export interface Deposito {
  id: string;
  valor: number;
  data: string;
}

export interface Configuracoes {
  tema?: 'claro' | 'escuro';
  idioma?: string;
}

// ===== FUNÇÕES DE FIREBASE =====

/**
 * Salvar todos os dados do usuário no Firebase
 */
export async function salvarDadosCompletos(
  userId: string, 
  dados: SistemaFinanceiro
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = ref(database, `usuarios/${userId}`);
    await set(userRef, {
      ...dados,
      ultimaAtualizacao: new Date().toISOString()
    });
    
    console.log('✅ Dados salvos no Firebase');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Erro ao salvar dados:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Carregar todos os dados do usuário do Firebase
 */
export async function carregarDadosCompletos(
  userId: string
): Promise<{ success: boolean; dados?: SistemaFinanceiro; error?: string }> {
  try {
    const userRef = ref(database, `usuarios/${userId}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const dados = snapshot.val();
      console.log('✅ Dados carregados do Firebase');
      return { success: true, dados };
    } else {
      console.log('⚠️ Nenhum dado encontrado no Firebase');
      return { success: true, dados: getDadosVazios() };
    }
  } catch (error: any) {
    console.error('❌ Erro ao carregar dados:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualizar dados parciais no Firebase
 */
export async function atualizarDadosParciais(
  userId: string,
  caminho: string,
  dados: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = ref(database, `usuarios/${userId}/${caminho}`);
    await update(userRef, dados);
    
    console.log(`✅ Dados atualizados no Firebase: ${caminho}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Erro ao atualizar dados:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Adicionar receita
 */
export async function adicionarReceita(
  userId: string,
  receita: Receita
): Promise<{ success: boolean; error?: string }> {
  try {
    const resultado = await carregarDadosCompletos(userId);
    if (!resultado.success || !resultado.dados) {
      throw new Error('Erro ao carregar dados');
    }

    const dadosAtualizados = {
      ...resultado.dados,
      receitas: [...resultado.dados.receitas, receita]
    };

    return await salvarDadosCompletos(userId, dadosAtualizados);
  } catch (error: any) {
    console.error('❌ Erro ao adicionar receita:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Adicionar despesa
 */
export async function adicionarDespesa(
  userId: string,
  despesa: Despesa
): Promise<{ success: boolean; error?: string }> {
  try {
    const resultado = await carregarDadosCompletos(userId);
    if (!resultado.success || !resultado.dados) {
      throw new Error('Erro ao carregar dados');
    }

    const dadosAtualizados = {
      ...resultado.dados,
      despesas: [...resultado.dados.despesas, despesa]
    };

    return await salvarDadosCompletos(userId, dadosAtualizados);
  } catch (error: any) {
    console.error('❌ Erro ao adicionar despesa:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Adicionar cartão
 */
export async function adicionarCartao(
  userId: string,
  cartao: Cartao
): Promise<{ success: boolean; error?: string }> {
  try {
    const resultado = await carregarDadosCompletos(userId);
    if (!resultado.success || !resultado.dados) {
      throw new Error('Erro ao carregar dados');
    }

    const dadosAtualizados = {
      ...resultado.dados,
      cartoes: [...resultado.dados.cartoes, cartao]
    };

    return await salvarDadosCompletos(userId, dadosAtualizados);
  } catch (error: any) {
    console.error('❌ Erro ao adicionar cartão:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualizar cartão existente
 */
export async function atualizarCartao(
  userId: string,
  cartaoId: string,
  cartaoAtualizado: Partial<Cartao>
): Promise<{ success: boolean; error?: string }> {
  try {
    const resultado = await carregarDadosCompletos(userId);
    if (!resultado.success || !resultado.dados) {
      throw new Error('Erro ao carregar dados');
    }

    const dadosAtualizados = {
      ...resultado.dados,
      cartoes: resultado.dados.cartoes.map(c => 
        c.id === cartaoId ? { ...c, ...cartaoAtualizado } : c
      )
    };

    return await salvarDadosCompletos(userId, dadosAtualizados);
  } catch (error: any) {
    console.error('❌ Erro ao atualizar cartão:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Adicionar compra a um cartão
 */
export async function adicionarCompraCartao(
  userId: string,
  cartaoId: string,
  compra: CompraCartao
): Promise<{ success: boolean; error?: string }> {
  try {
    const resultado = await carregarDadosCompletos(userId);
    if (!resultado.success || !resultado.dados) {
      throw new Error('Erro ao carregar dados');
    }

    const dadosAtualizados = {
      ...resultado.dados,
      cartoes: resultado.dados.cartoes.map(c => 
        c.id === cartaoId 
          ? { ...c, compras: [...c.compras, compra] }
          : c
      )
    };

    return await salvarDadosCompletos(userId, dadosAtualizados);
  } catch (error: any) {
    console.error('❌ Erro ao adicionar compra:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ouvir mudanças em tempo real
 */
export function ouvirMudancas(
  userId: string,
  callback: (dados: SistemaFinanceiro | null) => void
): () => void {
  const userRef = ref(database, `usuarios/${userId}`);
  
  const unsubscribe = onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  });

  return unsubscribe;
}

/**
 * Migrar dados do localStorage para Firebase
 */
export async function migrarLocalStorageParaFirebase(
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Verificar se já tem dados no Firebase
    const resultado = await carregarDadosCompletos(userId);
    
    if (resultado.success && resultado.dados && 
        (resultado.dados.receitas.length > 0 || 
         resultado.dados.despesas.length > 0 ||
         resultado.dados.cartoes.length > 0)) {
      console.log('⚠️ Usuário já tem dados no Firebase. Migração cancelada.');
      return { 
        success: false, 
        message: 'Você já tem dados no Firebase. Migração não necessária.' 
      };
    }
    
    // Buscar dados do localStorage
    const chaveLocalStorage = `sistemaFinanceiro_${userId}`;
    const dadosLocal = localStorage.getItem(chaveLocalStorage);
    
    if (!dadosLocal) {
      console.log('⚠️ Nenhum dado encontrado no localStorage');
      return { 
        success: false, 
        message: 'Nenhum dado encontrado no localStorage para migrar.' 
      };
    }
    
    // Converter e salvar no Firebase
    const dados = JSON.parse(dadosLocal);
    await salvarDadosCompletos(userId, dados);
    
    console.log('✅ Migração concluída com sucesso!');
    
    // Backup do localStorage (não remove ainda)
    localStorage.setItem(`${chaveLocalStorage}_backup`, dadosLocal);
    
    return { 
      success: true, 
      message: 'Dados migrados com sucesso! Um backup foi mantido no localStorage.' 
    };
  } catch (error: any) {
    console.error('❌ Erro na migração:', error);
    return { 
      success: false, 
      message: `Erro ao migrar dados: ${error.message}` 
    };
  }
}

/**
 * Retornar estrutura vazia
 */
function getDadosVazios(): SistemaFinanceiro {
  return {
    receitas: [],
    despesas: [],
    cartoes: [],
    metas: [],
    configuracoes: {
      tema: 'escuro',
      idioma: 'pt-BR'
    }
  };
}

// ===== EXPORTAÇÕES =====
export default {
  salvarDadosCompletos,
  carregarDadosCompletos,
  atualizarDadosParciais,
  adicionarReceita,
  adicionarDespesa,
  adicionarCartao,
  atualizarCartao,
  adicionarCompraCartao,
  ouvirMudancas,
  migrarLocalStorageParaFirebase
};