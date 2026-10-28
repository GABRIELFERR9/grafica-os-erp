'use strict';

const pool = require('../connection');
const config = require('../../config');
const log = require('../../utils/logger');

// Banco em memória fallback para testes locais sem PostgreSQL rodando
const pedidosEmMemoria = [
  {
    id: 'PED_1001',
    numero_os: 1001,
    cliente_nome: 'Gráfica Modelo Ltda',
    whatsapp: '61999998888',
    cpf_cnpj: '00.000.000/0001-91',
    tipo_produto: '1000 Cartões de Visita',
    quantidade: 1000,
    detalhes_papel: 'Couché 300g 4x4',
    acabamento: 'Laminação Fosca + Verniz UV',
    valor_total: 180.00,
    valor_sinal: 90.00,
    valor_pendente: 90.00,
    status_producao: 'impressao',
    data_pedido: '2026-07-31',
    data_previsao: '2026-08-02',
    arquivo_arte: 'arte_cartao.pdf',
    observacoes: 'Cliente solicitou entrega expressa',
    criado_em: new Date().toISOString()
  },
  {
    id: 'PED_1002',
    numero_os: 1002,
    cliente_nome: 'Marcos Silva',
    whatsapp: '61988887777',
    cpf_cnpj: '123.456.789-00',
    tipo_produto: '500 Panfletos A5',
    quantidade: 500,
    detalhes_papel: 'Couché 115g 4x0',
    acabamento: 'Corte Reta',
    valor_total: 120.00,
    valor_sinal: 120.00,
    valor_pendente: 0.00,
    status_producao: 'pronto',
    data_pedido: '2026-07-30',
    data_previsao: '2026-07-31',
    arquivo_arte: 'panfleto_marcos.pdf',
    observacoes: 'Pago total via PIX',
    criado_em: new Date().toISOString()
  }
];

let proximoNumeroOS = 1003;

module.exports = {
  async listarTodos(filtro = {}) {
    let sql = 'SELECT * FROM pedidos';
    const params = [];
    if (filtro.status) {
      params.push(filtro.status);
      sql += ` WHERE status_producao = $${params.length}`;
    }
    sql += ' ORDER BY criado_em DESC';

    if (config.env === 'production') {
      const res = await pool.query(sql, params);
      return res.rows;
    }

    try {
      const res = await pool.query(sql, params);
      return res.rows;
    } catch (err) {
      log.warn('REPO:PEDIDOS', 'PostgreSQL offline. Usando dados em memória para teste local.');
      if (filtro.status) {
        return pedidosEmMemoria.filter(p => p.status_producao === filtro.status);
      }
      return pedidosEmMemoria;
    }
  },

  async buscarPorId(id) {
    if (config.env === 'production') {
      const res = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
      return res.rows[0] || null;
    }

    try {
      const res = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (err) {
      // Fallback desenvolvimento
    }
    return pedidosEmMemoria.find(p => p.id === id) || null;
  },

  async buscarPorNumeroOS(numeroOS) {
    if (config.env === 'production') {
      const res = await pool.query('SELECT * FROM pedidos WHERE numero_os = $1', [numeroOS]);
      return res.rows[0] || null;
    }

    try {
      const res = await pool.query('SELECT * FROM pedidos WHERE numero_os = $1', [numeroOS]);
      if (res.rows.length > 0) return res.rows[0];
    } catch (err) {
      // Fallback desenvolvimento
    }
    return pedidosEmMemoria.find(p => Number(p.numero_os) === Number(numeroOS)) || null;
  },

  async criar(pedido) {
    const {
      id, cliente_nome, whatsapp, cpf_cnpj, tipo_produto, quantidade,
      detalhes_papel, acabamento, valor_total, valor_sinal, valor_pendente,
      status_producao, data_pedido, data_previsao, arquivo_arte, observacoes
    } = pedido;

    const sql = `
      INSERT INTO pedidos (
        id, cliente_nome, whatsapp, cpf_cnpj, tipo_produto, quantidade,
        detalhes_papel, acabamento, valor_total, valor_sinal, valor_pendente,
        status_producao, data_pedido, data_previsao, arquivo_arte, observacoes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *
    `;
    const params = [
      id, cliente_nome, whatsapp, cpf_cnpj || '', tipo_produto, quantidade,
      detalhes_papel || '', acabamento || '', valor_total, valor_sinal || 0, valor_pendente,
      status_producao || 'aguardando_arte', data_pedido, data_previsao, arquivo_arte || '', observacoes || ''
    ];

    if (config.env === 'production') {
      const res = await pool.query(sql, params);
      return res.rows[0];
    }

    try {
      const res = await pool.query(sql, params);
      return res.rows[0];
    } catch (err) {
      log.warn('REPO:PEDIDOS', 'Salvando pedido em memória (fallback local).');
      const novoEmMemoria = {
        ...pedido,
        numero_os: proximoNumeroOS++,
        criado_em: new Date().toISOString()
      };
      pedidosEmMemoria.unshift(novoEmMemoria);
      return novoEmMemoria;
    }
  },

  async atualizarStatus(id, novoStatus) {
    if (config.env === 'production') {
      const res = await pool.query(
        'UPDATE pedidos SET status_producao = $1 WHERE id = $2 RETURNING *',
        [novoStatus, id]
      );
      return res.rows[0] || null;
    }

    try {
      const res = await pool.query(
        'UPDATE pedidos SET status_producao = $1 WHERE id = $2 RETURNING *',
        [novoStatus, id]
      );
      if (res.rows.length > 0) return res.rows[0];
    } catch (err) {
      // Fallback desenvolvimento
    }
    const ped = pedidosEmMemoria.find(p => p.id === id);
    if (ped) {
      ped.status_producao = novoStatus;
      return ped;
    }
    return null;
  }
};
