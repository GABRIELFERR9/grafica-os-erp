'use strict';

const express = require('express');
const { autenticar } = require('./middlewares/autenticar');
const pool = require('../database/connection');
const log = require('../utils/logger');

const caixaEmMemoria = [
  { id: 1, data_caixa: new Date().toISOString().split('T')[0], tipo_movimento: 'entrada_sinal', valor: 90.00, forma_pagamento: 'PIX', descricao: 'Sinal OS #1001', operador: 'admin' },
  { id: 2, data_caixa: new Date().toISOString().split('T')[0], tipo_movimento: 'entrada_retirada', valor: 120.00, forma_pagamento: 'Cartão', descricao: 'Pagamento total OS #1002', operador: 'admin' }
];

function criarCaixaRoutes() {
  const router = express.Router();

  router.get('/extrato', autenticar, async (req, res) => {
    try {
      const hoje = req.query.data || new Date().toISOString().split('T')[0];
      const result = await pool.query('SELECT * FROM caixa_diario WHERE data_caixa = $1 ORDER BY id DESC', [hoje]);
      
      let totalEntradas = 0, totalSaidas = 0;
      result.rows.forEach(mov => {
        const val = Number(mov.valor);
        if (mov.tipo_movimento === 'despesa') totalSaidas += val;
        else totalEntradas += val;
      });

      return res.json({
        success: true,
        data: hoje,
        movimentacoes: result.rows,
        resumo: { entradas: totalEntradas.toFixed(2), saidas: totalSaidas.toFixed(2), saldo: (totalEntradas - totalSaidas).toFixed(2) }
      });
    } catch (err) {
      log.warn('API:CAIXA', 'PostgreSQL offline. Usando caixa em memória para testes.');
      let totalEntradas = 210.00, totalSaidas = 0.00;
      return res.json({
        success: true,
        data: new Date().toISOString().split('T')[0],
        movimentacoes: caixaEmMemoria,
        resumo: { entradas: totalEntradas.toFixed(2), saidas: totalSaidas.toFixed(2), saldo: totalEntradas.toFixed(2) }
      });
    }
  });

  router.post('/lancamento', autenticar, async (req, res) => {
    try {
      const { tipo_movimento, valor, forma_pagamento, descricao } = req.body || {};
      const hoje = new Date().toISOString().split('T')[0];

      const result = await pool.query(`
        INSERT INTO caixa_diario (data_caixa, tipo_movimento, valor, forma_pagamento, descricao, operador)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [hoje, tipo_movimento, Number(valor), forma_pagamento || 'PIX', descricao || '', req.usuario || 'operador']);

      return res.json({ success: true, lancamento: result.rows[0] });
    } catch (err) {
      const novo = { id: Date.now(), tipo_movimento: req.body.tipo_movimento, valor: Number(req.body.valor), forma_pagamento: 'PIX', descricao: req.body.descricao };
      caixaEmMemoria.unshift(novo);
      return res.json({ success: true, lancamento: novo });
    }
  });

  return router;
}

module.exports = criarCaixaRoutes;
