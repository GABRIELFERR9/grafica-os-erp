'use strict';

const express = require('express');
const { autenticar } = require('./middlewares/autenticar');
const pool = require('../database/connection');
const log = require('../utils/logger');

const insumosEmMemoria = [
  { id: 1, nome_item: 'Papel Couché 300g A4', quantidade: 450, qtd_minima: 500, status: 'SOLICITAR', fornecedor: 'Papelaria Central' },
  { id: 2, nome_item: 'Papel Offset 90g A4', quantidade: 2500, qtd_minima: 1000, status: 'OK', fornecedor: 'Distribuidora Alvorada' },
  { id: 3, nome_item: 'Lona 440g (Rolo 1.60m)', quantidade: 80, qtd_minima: 100, status: 'SOLICITAR', fornecedor: 'Mídia Visual Brasil' },
  { id: 4, nome_item: 'Tinta Cyan Eco-Solvente (1L)', quantidade: 5, qtd_minima: 2, status: 'OK', fornecedor: 'Impressão & Cia' }
];

function criarInsumosRoutes() {
  const router = express.Router();

  router.get('/api/insumos', autenticar, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM insumos ORDER BY id ASC');
      const requerAtencao = result.rows.some(i => i.quantidade < i.qtd_minima || i.status === 'SOLICITAR');
      return res.json({ success: true, insumos: result.rows, requerAtencao });
    } catch (err) {
      log.warn('API:INSUMOS', 'PostgreSQL offline. Usando estoque em memória para testes.');
      const requerAtencao = insumosEmMemoria.some(i => i.quantidade < i.qtd_minima || i.status === 'SOLICITAR');
      return res.json({ success: true, insumos: insumosEmMemoria, requerAtencao });
    }
  });

  router.post('/api/insumos', autenticar, async (req, res) => {
    try {
      const { nome_item, quantidade, qtd_minima, fornecedor } = req.body || {};
      const qtd = parseInt(quantidade, 10);
      const min = parseInt(qtd_minima || 100, 10);
      const status = qtd < min ? 'SOLICITAR' : 'OK';

      const result = await pool.query(`
        INSERT INTO insumos (nome_item, quantidade, qtd_minima, status, fornecedor)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [nome_item, qtd, min, status, fornecedor || '']);

      return res.json({ success: true, insumo: result.rows[0] });
    } catch (err) {
      const novo = { id: Date.now(), nome_item: req.body.nome_item, quantidade: req.body.quantidade, qtd_minima: 100, status: 'OK' };
      insumosEmMemoria.push(novo);
      return res.json({ success: true, insumo: novo });
    }
  });

  return router;
}

module.exports = criarInsumosRoutes;
