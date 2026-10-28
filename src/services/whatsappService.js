'use strict';

const config = require('../config');
const constants = require('../config/constants');
const log = require('../utils/logger');
const pedidosRepository = require('../database/repositories/pedidosRepository');

const CTX = 'SERVICE:WHATSAPP';

function criarWhatsappBot({ aiService }) {
  return {
    async iniciar() {
      log.info(CTX, `Bot WhatsApp Gráfica iniciado com instância: ${config.evolution.instancia}`);
    },

    async enviarMensagem(numero, texto) {
      if (!config.evolution.apiUrl || !config.evolution.apiKey) {
        log.warn(CTX, 'Evolution API não configurada. Mensagem simulada no log.');
        log.info(CTX, `[SIMULAÇÃO ENVIAR -> ${numero}]: ${texto}`);
        return true;
      }

      try {
        const jid = numero.includes('@s.whatsapp.net') ? numero : `${numero.replace(/\D/g, '')}@s.whatsapp.net`;
        const res = await fetch(`${config.evolution.apiUrl}/message/sendText/${config.evolution.instancia}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': config.evolution.apiKey
          },
          body: JSON.stringify({ number: jid, text: texto })
        });
        return res.ok;
      } catch (err) {
        log.error(CTX, `Erro ao enviar mensagem para ${numero}`, err);
        return false;
      }
    },

    async notificarPedidoPronto(pedido) {
      if (!pedido || !pedido.whatsapp) return;
      const msg = `🎉 *SEU PEDIDO ESTÁ PRONTO FORA DA MÁQUINA!*

Olá, *${pedido.cliente_nome}*! 
Seu pedido *OS #${pedido.numero_os || pedido.id}* (${pedido.tipo_produto}) já foi impresso e finalizado!

📍 *Retirada:* ${constants.ENDERECO}
💰 *Saldo a Pagar na Entrega:* R$ ${Number(pedido.valor_pendente).toFixed(2)}

Aguardamos você para a retirada! 😊`;

      await this.enviarMensagem(pedido.whatsapp, msg);
    },

    async processarWebhook(event, data) {
      if (event !== 'messages.upsert') return;
      const msg = data.data || data;
      if (!msg || msg.key?.fromMe) return;

      const remoteJid = msg.key?.remoteJid || '';
      const texto = (msg.message?.conversation || msg.message?.extendedTextMessage?.text || '').trim();

      if (!texto) return;

      log.info(CTX, `Mensagem recebida de ${remoteJid}: ${texto}`);

      // Menu Numérico
      if (texto === '1') {
        await this.enviarMensagem(remoteJid, '📝 Para fazer um orçamento ou enviar sua arte, descreva o produto desejado (quantidade, tamanho, papel) ou envie o arquivo!');
      } else if (texto === '2') {
        await this.enviarMensagem(remoteJid, '🔍 Por favor, digite o número da sua Ordem de Serviço (OS) ou o seu CPF/CNPJ:');
      } else if (texto === '3') {
        await this.enviarMensagem(remoteJid, constants.PRODUTOS_TABELA);
      } else if (texto === '4') {
        await this.enviarMensagem(remoteJid, `📍 *Nossos Dados:*
${constants.ENDERECO}
📞 Contato: ${constants.CONTATO_SUPORTE}
⏰ Atendimento: Segunda a Sexta das 08h às 18h / Sábados das 08h às 12h.`);
      } else if (texto === '5') {
        await this.enviarMensagem(remoteJid, '🧑‍💼 Um de nossos atendentes do balcão irá te responder em alguns momentos! Aguarde...');
      } else if (/^\d+$/.test(texto)) {
        // Consulta de OS pelo número
        const osNum = parseInt(texto, 10);
        const pedido = await pedidosRepository.buscarPorNumeroOS(osNum);
        if (pedido) {
          const statusMap = {
            'aguardando_arte': '🟡 Aguardando Aprovação de Arte',
            'em_arte': '🎨 Em Produção de Arte / Ajuste',
            'impressao': '🖨️ Em Impressão nas Máquinas',
            'acabamento': '✂️ Em Acabamento / Corte / Dobra',
            'pronto': '🟢 PRONTO PARA RETIRADA',
            'entregue': '✅ Entregue ao Cliente'
          };
          const statusTxt = statusMap[pedido.status_producao] || pedido.status_producao;
          await this.enviarMensagem(remoteJid, `📋 *Status da OS #${pedido.numero_os}:*
• Cliente: ${pedido.cliente_nome}
• Produto: ${pedido.tipo_produto} (${pedido.quantidade} un)
• Status: *${statusTxt}*
• Previsão: ${pedido.data_previsao}
• Restante a Pagar: R$ ${Number(pedido.valor_pendente).toFixed(2)}`);
        } else {
          // Tenta IA se disponível
          const respIa = aiService ? await aiService.responderDuvida(texto) : null;
          await this.enviarMensagem(remoteJid, respIa || constants.MENU_WHATSAPP);
        }
      } else {
        // Transbordo para IA
        const respIa = aiService ? await aiService.responderDuvida(texto) : null;
        await this.enviarMensagem(remoteJid, respIa || constants.MENU_WHATSAPP);
      }
    }
  };
}

module.exports = { criarWhatsappBot };
