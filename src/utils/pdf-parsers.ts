import { gerarId } from './financeiro';

export interface LinhaExtrato {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  categoria: string;
  parcelas?: { atual: number; total: number };
  status: 'pendente' | 'conciliado';
}

function converterValor(str: string): number {
  const s = str.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.').trim();
  return parseFloat(s);
}

function inferirAno(dataDDMM: string, mesRefNum: number, anoRefNum: number): string {
  const [dia, mes] = dataDDMM.split('/').map(Number);
  const ano = mes > mesRefNum ? anoRefNum - 1 : anoRefNum;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

const MESES: { [k: string]: string } = {
  JAN: '01', FEV: '02', MAR: '03', ABR: '04', MAI: '05', JUN: '06',
  JUL: '07', AGO: '08', SET: '09', OUT: '10', NOV: '11', DEZ: '12',
};

export function parsearBourbonZaffari(texto: string, mesRefNum: number, anoRefNum: number): LinhaExtrato[] {
  const partes = texto.split('Demonstrativo de Lançamentos');
  if (partes.length < 2) return [];
  const corpoTabela = partes[1];

  const regex = /(\d{2}\/\d{2})\s+(.*?)\s+(\d+,\d{2})/g;
  const resultado: LinhaExtrato[] = [];
  let match;

  while ((match = regex.exec(corpoTabela)) !== null) {
    const [, dataDDMM, descRaw, valorStr] = match;
    if (/pagamento|encargos|juros|manutenção|multa|saldo|total|lei\s+12\.007|quitação/i.test(descRaw)) continue;

    const valor = converterValor(valorStr);
    if (isNaN(valor) || valor <= 0) continue;

    const data = inferirAno(dataDDMM, mesRefNum, anoRefNum);
    resultado.push({
      id: gerarId(),
      data,
      descricao: descRaw.trim(),
      valor,
      categoria: 'Outras Despesas',
      status: 'pendente',
    });
  }
  return resultado;
}

export function parsearNubank(texto: string, mesRefNum: number, anoRefNum: number): LinhaExtrato[] {
  const regex = /(\d{1,2}\s+[A-Z]{3})\n+(?:.*?\n+)?(.*?)\n+(?:R\$\s+)?(\d+,\d{2})/g;
  const resultado: LinhaExtrato[] = [];
  let match;

  while ((match = regex.exec(texto)) !== null) {
    const [, dataBR, descRaw, valorStr] = match;
    if (/pagamento|estorno|crédito|recebido|transferência/i.test(descRaw)) continue;

    const [dia, mesStr] = dataBR.split(' ');
    const mesNum = parseInt(MESES[mesStr.toUpperCase()]);
    const anoNum = mesNum > mesRefNum ? anoRefNum - 1 : anoRefNum;
    const data = `${anoNum}-${String(mesNum).padStart(2, '0')}-${dia.padStart(2, '0')}`;

    const valor = converterValor(valorStr);
    if (isNaN(valor) || valor <= 0) continue;

    resultado.push({
      id: gerarId(),
      data,
      descricao: descRaw.trim(),
      valor,
      categoria: 'Outras Despesas',
      status: 'pendente',
    });
  }
  return resultado;
}
