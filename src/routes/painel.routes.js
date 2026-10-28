'use strict';

const express = require('express');
const { autenticar } = require('./middlewares/autenticar');
const pedidosRepository = require('../database/repositories/pedidosRepository');
const pdfService = require('../services/pdfService');
const log = require('../utils/logger');

function criarPainelRoutes({ bot }) {
  const router = express.Router();

  // Listar todos os pedidos
  router.get('/api/pedidos', autenticar, async (req, res) => {
    try {
      const { status } = req.query;
      const lista = await pedidosRepository.listarTodos({ status });
      return res.json({ success: true, pedidos: lista });
    } catch (err) {
      log.error('API:PEDIDOS', 'Erro ao listar pedidos', err);
      return res.status(500).json({ success: false, error: 'Erro ao listar pedidos.' });
    }
  });

  // Criar novo pedido de balcão
  router.post('/api/pedidos', autenticar, async (req, res) => {
    try {
      const dados = req.body || {};
      if (!dados.cliente_nome || !dados.tipo_produto || !dados.quantidade || !dados.valor_total) {
        return res.status(400).json({ success: false, error: 'Campos obrigatórios ausentes (nome, produto, quantidade, valor_total).' });
      }

      const id = `PED_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const valorTotal = Number(dados.valor_total);
      const valorSinal = Number(dados.valor_sinal || 0);
      const valorPendente = Math.max(0, valorTotal - valorSinal);

      const novoPedido = await pedidosRepository.criar({
        id,
        cliente_nome: dados.cliente_nome,
        whatsapp: dados.whatsapp || '',
        cpf_cnpj: dados.cpf_cnpj || '',
        tipo_produto: dados.tipo_produto,
        quantidade: parseInt(dados.quantidade, 10),
        detalhes_papel: dados.detalhes_papel || '',
        acabamento: dados.acabamento || '',
        valor_total: valorTotal,
        valor_sinal: valorSinal,
        valor_pendente: valorPendente,
        status_producao: dados.status_producao || 'aguardando_arte',
        data_pedido: dados.data_pedido || new Date().toISOString().split('T')[0],
        data_previsao: dados.data_previsao || new Date().toISOString().split('T')[0],
        arquivo_arte: dados.arquivo_arte || '',
        observacoes: dados.observacoes || ''
      });

      log.info('API:PEDIDOS', `Novo pedido criado: OS #${novoPedido.numero_os} - ${novoPedido.cliente_nome}`);
      return res.json({ success: true, pedido: novoPedido });
    } catch (err) {
      log.error('API:PEDIDOS', 'Erro ao criar pedido', err);
      return res.status(500).json({ success: false, error: 'Erro interno ao criar pedido.' });
    }
  });

  // Atualizar status de produção
  router.put('/api/pedidos/:id/status', autenticar, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: 'Novo status é obrigatório.' });
      }

      const pedidoAtualizado = await pedidosRepository.atualizarStatus(id, status);
      if (!pedidoAtualizado) {
        return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
      }

      // Se mudou para 'pronto', dispara notificação no WhatsApp
      if (status === 'pronto' && bot) {
        bot.notificarPedidoPronto(pedidoAtualizado).catch(e => log.error('API:PEDIDOS', 'Erro ao notificar WhatsApp', e));
      }

      return res.json({ success: true, pedido: pedidoAtualizado });
    } catch (err) {
      log.error('API:PEDIDOS', 'Erro ao atualizar status do pedido', err);
      return res.status(500).json({ success: false, error: 'Erro ao atualizar status.' });
    }
  });

  // Gerar PDF da Ordem de Serviço
  router.get('/api/pedidos/:id/pdf_os', autenticar, async (req, res) => {
    try {
      const { id } = req.params;
      const pedido = await pedidosRepository.buscarPorId(id);
      if (!pedido) {
        return res.status(404).json({ success: false, error: 'Pedido não encontrado.' });
      }

      const pdfBuffer = await pdfService.gerarOrdemServico(pedido);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="OS_${pedido.numero_os || pedido.id}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err) {
      log.error('API:PDF', 'Erro ao gerar PDF de Ordem de Serviço', err);
      return res.status(500).json({ success: false, error: 'Erro ao gerar PDF.' });
    }
  });

  return router;
}

module.exports = criarPainelRoutes;
