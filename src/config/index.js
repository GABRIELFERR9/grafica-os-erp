'use strict';
require('dotenv').config();

module.exports = {
  porta: process.env.PORT || 3010,
  env: process.env.NODE_ENV || 'development',
  corsOrigin: '*',
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/grafica_db',
  painel: {
    usuario: process.env.PAINEL_USUARIO || 'admin',
    senha: process.env.PAINEL_SENHA,
    ttlMs: 30 * 24 * 60 * 60 * 1000 // 30 dias de sessão
  },
  evolution: {
    apiUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instancia: process.env.EVOLUTION_INSTANCE || 'grafica',
    webhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET || 'segredo_grafica'
  },
  ia: {
    ativa: process.env.IA_CONVERSACIONAL_ATIVA === 'true',
    geminiKey: process.env.GEMINI_API_KEY || ''
  }
};
