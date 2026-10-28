'use strict';

const sessaoRepository = require('../../database/repositories/sessaoRepository');
const log = require('../../utils/logger');

async function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/, '').trim();

  if (!token) {
    return res.status(401).json({ success: false, error: 'Não autorizado. Token de acesso ausente.' });
  }

  try {
    const sessao = await sessaoRepository.buscarPorToken(token);
    if (!sessao) {
      return res.status(401).json({ success: false, error: 'Sessão inválida ou expirada.' });
    }

    req.usuario = sessao.usuario;
    req.papel = sessao.papel || 'admin';
    next();
  } catch (err) {
    log.error('AUTH:MW', 'Erro na verificação de token', err);
    return res.status(500).json({ success: false, error: 'Erro interno de autenticação.' });
  }
}

module.exports = { autenticar };
