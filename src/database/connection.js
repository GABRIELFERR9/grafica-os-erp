'use strict';

const { Pool } = require('pg');
const config = require('../config');
const log = require('../utils/logger');

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  log.error('DB:POOL', 'Erro inesperado no pool do PostgreSQL', err);
});

module.exports = pool;
