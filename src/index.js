'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const log = require('./utils/logger');

const pool = require('./database/connection');
const { aplicarSchema } = require('./database/schema');

const aiService = require('./services/aiService');
const { criarWhatsappBot } = require('./services/whatsappService');

const CTX = 'BOOT';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));
app.use(cors({ origin: config.corsOrigin }));

// Headers de segurança
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', sistema: 'Gráfica OS', ts: Date.now() }));

// Servir frontend SPA estático
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiter em memória para login (máximo 10 tentativas por IP a cada 15 min)
const loginTentativasMap = new Map();
const LOGIN_MAX_TENTATIVAS = 10;
const LOGIN_JANELA_MS = 15 * 60 * 1000;

// Limpeza periódica do Map de rate limit (evita vazamento de memória)
const intervalLimpezaRateLimit = setInterval(() => {
  const agora = Date.now();
  for (const [ip, dados] of loginTentativasMap.entries()) {
    if (agora - dados.janelaInicio > LOGIN_JANELA_MS) {
      loginTentativasMap.delete(ip);
    }
  }
}, LOGIN_JANELA_MS);
if (intervalLimpezaRateLimit.unref) intervalLimpezaRateLimit.unref();

function rateLimitLogin(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const agora = Date.now();
  let registro = loginTentativasMap.get(ip);

  if (!registro || (agora - registro.janelaInicio > LOGIN_JANELA_MS)) {
    registro = { count: 0, janelaInicio: agora };
    loginTentativasMap.set(ip, registro);
  }

  if (registro.count >= LOGIN_MAX_TENTATIVAS) {
    return res.status(429).json({
      success: false,
      error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    });
  }

  registro.count++;
  next();
}

// Instancia Bot de WhatsApp + IA
const bot = criarWhatsappBot({ aiService });

// Ponte de Login (protegida por Rate Limit)
const sessaoRepository = require('./database/repositories/sessaoRepository');
const crypto = require('crypto');

app.post('/api/login_ponte', rateLimitLogin, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Usuário e senha necessários.' });
  }

  if (username === config.painel.usuario && password === config.painel.senha) {
    const token = crypto.randomBytes(32).toString('hex');
    try {
      await sessaoRepository.criar(token, username, 'admin');
    } catch (e) {
      if (config.env === 'production') {
        log.error(CTX, 'Erro ao criar sessão no PostgreSQL em PRODUÇÃO', e);
        return res.status(500).json({ success: false, error: 'Erro ao registrar sessão.' });
      }
    }
    return res.json({ success: true, token, papel: 'admin' });
  }

  return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
});

// Webhook Evolution API
app.post(`/webhook/evolution/${config.evolution.webhookSecret}`, (req, res) => {
  res.sendStatus(200);
  const { event, data } = req.body || {};
  if (event && data) {
    bot.processarWebhook(event, data).catch(err => log.error(CTX, 'Erro no webhook Evolution', err));
  }
});

// Importa e conecta as rotas da Gráfica
const criarPainelRoutes = require('./routes/painel.routes');
const criarOrcamentoRoutes = require('./routes/orcamento.routes');
const criarInsumosRoutes = require('./routes/insumos.routes');
const criarCaixaRoutes = require('./routes/caixa.routes');

app.use('/', criarPainelRoutes({ bot }));
app.use('/', criarOrcamentoRoutes());
app.use('/', criarInsumosRoutes());
app.use('/api/caixa', criarCaixaRoutes());

// Limpeza periódica de sessões expiradas a cada 1 hora
const intervalLimpezaSessoes = setInterval(() => {
  sessaoRepository.limparExpiradas().catch(() => {});
}, 60 * 60 * 1000);
if (intervalLimpezaSessoes.unref) intervalLimpezaSessoes.unref();

// INICIALIZAÇÃO DO SERVIDOR (Diferencia Produção de Desenvolvimento)
async function iniciarServidor() {
  if (config.env === 'production') {
    log.info(CTX, 'Iniciando Gráfica OS em ambiente de PRODUÇÃO...');
    try {
      await aplicarSchema();
      bot.iniciar();
    } catch (err) {
      log.error(CTX, 'FATAL: PostgreSQL indisponível em PRODUÇÃO. Encerrando...', err);
      process.exit(1);
    }
  } else {
    log.info(CTX, 'Iniciando Gráfica OS em ambiente de DESENVOLVIMENTO...');
    aplicarSchema().then(() => bot.iniciar()).catch(() => {});
  }

  app.listen(config.porta, () => {
    log.info(CTX, `🚀 Sistema Gráfica OS rodando em http://localhost:${config.porta}`);
  });
}

iniciarServidor();

process.on('SIGINT', async () => {
  log.info(CTX, 'Encerrando Gráfica OS...');
  try { await pool.end(); } catch (e) {}
  process.exit(0);
});
