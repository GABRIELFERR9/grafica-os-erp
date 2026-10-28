'use strict';

const pool = require('../connection');
const config = require('../../config');
const log = require('../../utils/logger');

const CTX = 'REPO:SESSAO';
const sessoesEmMemoria = new Map();

module.exports = {
  async criar(token, usuario, papel = 'admin') {
    const agora = Date.now();
    if (config.env === 'production') {
      await pool.query(
        'INSERT INTO sessoes (token, usuario, papel, criado_em) VALUES ($1, $2, $3, $4)',
        [token, usuario, papel, agora]
      );
    } else {
      sessoesEmMemoria.set(token, { token, usuario, papel, criado_em: agora });
      try {
        await pool.query(
          'INSERT INTO sessoes (token, usuario, papel, criado_em) VALUES ($1, $2, $3, $4)',
          [token, usuario, papel, agora]
        );
      } catch (e) {
        // Modo desenvolvimento: usa fallback em memória
      }
    }
    log.info(CTX, `Sessão criada: ${usuario} (${papel})`);
  },

  async buscarPorToken(token) {
    let sessao = null;
    if (config.env === 'production') {
      const res = await pool.query('SELECT * FROM sessoes WHERE token = $1', [token]);
      sessao = res.rows[0] || null;
    } else {
      try {
        const res = await pool.query('SELECT * FROM sessoes WHERE token = $1', [token]);
        sessao = res.rows[0] || null;
      } catch (e) {
        sessao = sessoesEmMemoria.get(token) || null;
      }
    }

    if (!sessao) return null;

    // Validação estrita de expiração por TTL (config.painel.ttlMs)
    const agora = Date.now();
    const criadoEm = Number(sessao.criado_em);
    const ttlMs = config.painel.ttlMs || (30 * 24 * 60 * 60 * 1000);

    if (agora - criadoEm > ttlMs) {
      log.warn(CTX, `Sessão expirada para o token (criada há ${Math.round((agora - criadoEm) / (1000 * 60 * 60 * 24))} dias).`);
      await this.deletar(token).catch(() => {});
      return null;
    }

    return sessao;
  },

  async deletar(token) {
    sessoesEmMemoria.delete(token);
    if (config.env === 'production') {
      await pool.query('DELETE FROM sessoes WHERE token = $1', [token]);
    } else {
      try {
        await pool.query('DELETE FROM sessoes WHERE token = $1', [token]);
      } catch (e) {}
    }
  },

  async limparExpiradas(ttlMs = config.painel.ttlMs) {
    const limite = Date.now() - (ttlMs || (30 * 24 * 60 * 60 * 1000));
    if (config.env === 'production') {
      await pool.query('DELETE FROM sessoes WHERE criado_em < $1', [limite]);
    } else {
      try {
        await pool.query('DELETE FROM sessoes WHERE criado_em < $1', [limite]);
      } catch (e) {}
    }
  }
};
