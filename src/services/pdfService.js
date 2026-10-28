'use strict';

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const constants = require('../config/constants');

module.exports = {
  /**
   * Gera PDF da Ordem de Serviço (OS de Balcão/Produção)
   */
  async gerarOrdemServico(pedido) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 em pontos (72 dpi)
    const fontHelvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    let y = height - 50;

    // Cabeçalho
    page.drawText(constants.NOME_GRAFICA.toUpperCase(), { x: 50, y, size: 20, font: fontBold, color: rgb(0.1, 0.2, 0.5) });
    y -= 25;
    page.drawText(`ORDEM DE SERVIÇO Nº ${pedido.numero_os || pedido.id}`, { x: 50, y, size: 14, font: fontBold, color: rgb(0.8, 0.1, 0.1) });
    y -= 15;
    page.drawText(`Data do Pedido: ${pedido.data_pedido} | Previsão: ${pedido.data_previsao}`, { x: 50, y, size: 10, font: fontHelvetica, color: rgb(0.3, 0.3, 0.3) });
    
    // Linha Divisória
    y -= 15;
    page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });

    // Dados do Cliente
    y -= 25;
    page.drawText('DADOS DO CLIENTE', { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    y -= 18;
    page.drawText(`Cliente: ${pedido.cliente_nome}`, { x: 50, y, size: 11, font: fontHelvetica });
    y -= 15;
    page.drawText(`WhatsApp: ${pedido.whatsapp || 'Não informado'} | CPF/CNPJ: ${pedido.cpf_cnpj || 'Não informado'}`, { x: 50, y, size: 11, font: fontHelvetica });

    // Especificações Técnicas
    y -= 30;
    page.drawText('ESPECIFICAÇÕES TÉCNICAS DO PEDIDO', { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    y -= 20;
    page.drawText(`Produto: ${pedido.tipo_produto}`, { x: 50, y, size: 11, font: fontBold });
    y -= 15;
    page.drawText(`Quantidade: ${pedido.quantidade} un.`, { x: 50, y, size: 11, font: fontHelvetica });
    y -= 15;
    page.drawText(`Papel / Material: ${pedido.detalhes_papel || 'Padrão'}`, { x: 50, y, size: 11, font: fontHelvetica });
    y -= 15;
    page.drawText(`Acabamentos: ${pedido.acabamento || 'Sem acabamento especial'}`, { x: 50, y, size: 11, font: fontHelvetica });
    if (pedido.observacoes) {
      y -= 15;
      page.drawText(`Obs: ${pedido.observacoes}`, { x: 50, y, size: 10, font: fontHelvetica, color: rgb(0.4, 0.4, 0.4) });
    }

    // Tabela Financeira
    y -= 35;
    page.drawText('VALORES E PAGAMENTO', { x: 50, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    y -= 20;
    page.drawText(`Valor Total: R$ ${Number(pedido.valor_total).toFixed(2)}`, { x: 50, y, size: 11, font: fontHelvetica });
    y -= 15;
    page.drawText(`Sinal / Entrada: R$ ${Number(pedido.valor_sinal || 0).toFixed(2)}`, { x: 50, y, size: 11, font: fontHelvetica });
    y -= 15;
    page.drawText(`Restante na Retirada: R$ ${Number(pedido.valor_pendente).toFixed(2)}`, { x: 50, y, size: 12, font: fontBold, color: rgb(0.8, 0.1, 0.1) });

    // Termos e Assinatura
    y -= 60;
    page.drawText('Concordo com as especificações e aprovação de arte registradas nesta Ordem de Serviço.', { x: 50, y, size: 8, font: fontHelvetica, color: rgb(0.5, 0.5, 0.5) });
    y -= 40;
    page.drawLine({ start: { x: 150, y }, end: { x: width - 150, y }, thickness: 1, color: rgb(0.3, 0.3, 0.3) });
    y -= 15;
    page.drawText('Assinatura do Cliente', { x: (width / 2) - 50, y, size: 10, font: fontHelvetica, color: rgb(0.3, 0.3, 0.3) });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }
};
