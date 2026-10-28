'use strict';

const config = require('../config');
const constants = require('../config/constants');
const log = require('../utils/logger');

const CTX = 'SERVICE:AI';

module.exports = {
  /**
   * Responde perguntas do cliente via Gemini Flash-Lite
   */
  async responderDuvida(mensagemCliente, contextoCliente = {}) {
    if (!config.ia.ativa || !config.ia.geminiKey) {
      log.info(CTX, 'IA desativada ou sem chave GEMINI_API_KEY. Usando fallback.');
      return null;
    }

    try {
      const promptFinal = `${constants.PROMPT_IA_GRAFICA}

Contexto do Cliente:
Nome: ${contextoCliente.nome || 'Cliente'}
Histórico/Dúvida: "${mensagemCliente}"

Responda em tom profissional, rápido e amigável:`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${config.ia.geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptFinal }] }]
        })
      });

      if (!response.ok) {
        log.warn(CTX, `Gemini API retornou erro HTTP ${response.status}`);
        return null;
      }

      const data = await response.json();
      const texto = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return texto.trim();
    } catch (err) {
      log.error(CTX, 'Erro ao chamar Gemini API', err);
      return null;
    }
  }
};
