import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Process, ProcessHistory } from '@/types/process';
import { createDateFromString } from '@/lib/utils';

export interface ExportData {
  data: string;
  local: string;
  status: string;
  titulo?: string;
  prioridade?: string;
  responsavel?: string;
  numero_processo?: string;
  observacoes?: string;
}

export class ExcelExportService {
  /**
   * Converte um contrato para o formato de exportação
   */
  private static processToExportData(process: Process, latestProgress?: ProcessHistory | null): ExportData {
    // Mapear status para português
    const statusMap = {
      'pendente': 'Pendente',
      'em_andamento': 'Em Andamento',
      'concluido': 'Concluído',
      'cancelado': 'Cancelado'
    };

    // Usar data do último andamento se disponível, senão usar data do processo
    const dataToUse = latestProgress?.new_values?.data || process.data;
    const localToUse = latestProgress?.new_values?.local || process.local;
    
    return {
      data: createDateFromString(dataToUse).toLocaleDateString('pt-BR'),
      local: localToUse,
      status: statusMap[process.status],
      titulo: process.titulo,
      prioridade: process.prioridade,
      responsavel: process.responsavel,
      numero_processo: process.numero_processo,
      observacoes: latestProgress?.notes || ''
    };
  }

  /**
   * Busca todo o histórico de um contrato
   */
  private static async getProcessHistory(processId: string): Promise<ProcessHistory[]> {
    try {
      // Importar dentro da função para evitar problemas de importação circular
      const { processService } = await import('@/lib/firebase-services');
      const history = await processService.getProcessHistory(processId);
      return history;
    } catch (error) {
      console.error('Erro ao buscar histórico do contrato:', error);
      return [];
    }
  }

  /**
   * Cria uma planilha formatada para um contrato específico com seu histórico
   */
  private static createWorksheetForProcess(
    process: Process, 
    history: ProcessHistory[]
  ): XLSX.WorkSheet {
    // Cabeçalhos
    const headers = ['Data', 'Local', 'Status'];
    
    // Converter histórico para dados da planilha
    const rows: { data: Date, local: string, status: string }[] = [];
    
    const statusMap = {
      'pendente': 'Pendente',
      'em_andamento': 'Em Andamento', 
      'concluido': 'Concluído',
      'cancelado': 'Cancelado'
    };

    // Adicionar entrada inicial do contrato (criação)
    rows.push({
      data: createDateFromString(process.data),
      local: process.local,
      status: statusMap[process.status]
    });

    // Adicionar entradas do histórico
    history
      .filter(entry => entry.action === 'progress_update')
      .forEach(entry => {
        if (entry.new_values?.data && entry.new_values?.local) {
          // Usar as observações se disponível, senão usar informações do andamento
          let status = entry.notes || 'Andamento registrado';
          
          // Se montou processo, mostrar essa informação
          if (entry.new_values.montou_processo && entry.new_values.numero_processo) {
            status = entry.notes || `Montou processo: ${entry.new_values.numero_processo}`;
          }
          
          rows.push({
            data: createDateFromString(entry.new_values.data),
            local: entry.new_values.local,
            status: status
          });
        }
      });

    // Ordenar por data (mais antiga primeiro = ordem cronológica crescente)
    rows.sort((a, b) => a.data.getTime() - b.data.getTime());

    // Converter para formato da planilha
    const formattedRows = rows.map(row => [
      row.data.toLocaleDateString('pt-BR'),
      row.local,
      row.status
    ]);

    // Se não há dados, pelo menos mostrar o contrato inicial
    if (formattedRows.length === 0) {
      formattedRows.push([
        createDateFromString(process.data).toLocaleDateString('pt-BR'),
        process.local,
        statusMap[process.status]
      ]);
    }

    // Criar worksheet
    const wsData = [headers, ...formattedRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Definir larguras das colunas
    ws['!cols'] = [
      { width: 12 }, // Data
      { width: 25 }, // Local
      { width: 50 }, // Status/Observações
    ];

    // Aplicar formatação aos cabeçalhos (cor amarela como no print)
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1:C1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "FFFF99" } }, // Amarelo como no print
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }

    // Aplicar bordas às células de dados
    if (formattedRows.length > 0) {
      const dataRange = XLSX.utils.decode_range(ws['!ref'] || 'A1:C1');
      for (let row = 1; row <= dataRange.e.r; row++) {
        for (let col = dataRange.s.c; col <= dataRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddress]) ws[cellAddress] = { v: '' };
          
          ws[cellAddress].s = {
            border: {
              top: { style: "thin", color: { rgb: "CCCCCC" } },
              bottom: { style: "thin", color: { rgb: "CCCCCC" } },
              left: { style: "thin", color: { rgb: "CCCCCC" } },
              right: { style: "thin", color: { rgb: "CCCCCC" } }
            },
            alignment: { horizontal: "left", vertical: "center" }
          };
        }
      }
    }

    return ws;
  }

  /**
   * Exporta os contratos para Excel - cada contrato em uma aba
   */
  static async exportToExcel(
    processes: Process[],
    filename: string = 'contratos'
  ): Promise<void> {
    try {
      // Criar workbook
      const wb = XLSX.utils.book_new();

      // Criar uma sheet para cada contrato
      for (const process of processes) {
        try {
          // Buscar histórico do contrato
          const history = await this.getProcessHistory(process.id);
          
          // Criar worksheet para o contrato
          const ws = this.createWorksheetForProcess(process, history);
          
          // Limitar nome da sheet a 31 caracteres (limite do Excel)
          let sheetName = process.titulo.substring(0, 31);
          
          // Remover caracteres inválidos para nome de sheet
          sheetName = sheetName.replace(/[\\\/\?\*\[\]:]/g, '');
          
          // Garantir que o nome não seja vazio
          if (!sheetName.trim()) {
            sheetName = `Contrato ${process.id.substring(0, 8)}`;
          }
          
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        } catch (error) {
          console.error(`Erro ao processar contrato ${process.id}:`, error);
          // Continuar com os outros contratos mesmo se um falhar
        }
      }

      // Se não houver sheets, criar uma vazia
      if (wb.SheetNames.length === 0) {
        const emptyWs = XLSX.utils.aoa_to_sheet([['Data', 'Local', 'Status']]);
        XLSX.utils.book_append_sheet(wb, emptyWs, 'Contratos');
      }

      // Gerar arquivo e fazer download
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Nome do arquivo com timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const finalFilename = `${filename}_${timestamp}.xlsx`;
      
      saveAs(blob, finalFilename);
      
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      throw new Error('Erro ao gerar arquivo Excel. Tente novamente.');
    }
  }

}
