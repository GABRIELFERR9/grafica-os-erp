'use strict';

const pool = require('./connection');
const log = require('../utils/logger');

const config = require('../config');

const CTX = 'DB:SCHEMA';

const DDL = `
  CREATE TABLE IF NOT EXISTS pedidos (
    id             TEXT PRIMARY KEY,
    numero_os      SERIAL UNIQUE,
    cliente_nome   TEXT NOT NULL,
    whatsapp       TEXT,
    cpf_cnpj       TEXT DEFAULT '',
    tipo_produto   TEXT NOT NULL,
    quantidade     INTEGER NOT NULL,
    detalhes_papel TEXT DEFAULT '',
    acabamento     TEXT DEFAULT '',
    valor_total    NUMERIC(10,2) NOT NULL,
    valor_sinal    NUMERIC(10,2) DEFAULT 0.00,
    valor_pendente NUMERIC(10,2) NOT NULL,
    status_producao TEXT DEFAULT 'aguardando_arte',
    data_pedido    TEXT NOT NULL,
    data_previsao  TEXT NOT NULL,
    arquivo_arte   TEXT DEFAULT '',
    observacoes    TEXT DEFAULT '',
    criado_em      TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS ordens_servico (
    id              SERIAL PRIMARY KEY,
    pedido_id       TEXT REFERENCES pedidos(id) ON DELETE CASCADE,
    designer_resp   TEXT DEFAULT '',
    impressor_resp  TEXT DEFAULT '',
    checklist_cmyk  BOOLEAN DEFAULT false,
    checklist_dpi   BOOLEAN DEFAULT false,
    checklist_sangria BOOLEAN DEFAULT false,
    observacoes_tecnicas TEXT DEFAULT '',
    criado_em       TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS insumos (
    id             SERIAL PRIMARY KEY,
    nome_item      TEXT NOT NULL,
    quantidade     INTEGER NOT NULL,
    qtd_minima     INTEGER DEFAULT 100,
    status         TEXT DEFAULT 'OK',
    fornecedor     TEXT DEFAULT '',
    atualizado_em  TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS sessoes (
    token        TEXT PRIMARY KEY,
    usuario      TEXT NOT NULL,
    papel        TEXT DEFAULT 'admin',
    criado_em    BIGINT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversas (
    chat_id       TEXT PRIMARY KEY,
    estado        TEXT DEFAULT 'inicio',
    dados         TEXT DEFAULT '{}',
    atualizado_em BIGINT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS log_acoes (
    id            SERIAL PRIMARY KEY,
    usuario       TEXT DEFAULT 'sistema',
    acao          TEXT NOT NULL,
    detalhes      TEXT DEFAULT '',
    criado_em     TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS caixa_diario (
    id             SERIAL PRIMARY KEY,
    data_caixa     TEXT NOT NULL,
    tipo_movimento TEXT NOT NULL,
    valor          NUMERIC(10,2) NOT NULL,
    forma_pagamento TEXT DEFAULT 'PIX',
    descricao      TEXT DEFAULT '',
    operador       TEXT DEFAULT 'sistema',
    criado_em      TIMESTAMPTZ DEFAULT now()
  );
`;

async function aplicarSchema() {
  try {
    await pool.query(DDL);
    log.info(CTX, 'Schema do Banco de Dados para Gráfica OS aplicado no PostgreSQL.');
  } catch (err) {
    if (config.env === 'production') {
      log.error(CTX, 'FATAL: Falha ao conectar/aplicar schema no PostgreSQL em PRODUÇÃO. Encerrando processo.', err);
      process.exit(1);
    }
    log.warn(CTX, 'PostgreSQL não detectado no localhost. O sistema funcionará com modo fallback em memória para testes locais instantâneos.');
  }
}

module.exports = { aplicarSchema };
