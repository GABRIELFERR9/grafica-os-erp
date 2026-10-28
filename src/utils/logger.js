'use strict';

function timestamp() {
  return new Date().toISOString();
}

module.exports = {
  info: (ctx, msg, ...extra) => console.log(`[${timestamp()}] [INFO] [${ctx}] ${msg}`, ...extra),
  warn: (ctx, msg, ...extra) => console.warn(`[${timestamp()}] [WARN] [${ctx}] ${msg}`, ...extra),
  error: (ctx, msg, ...extra) => console.error(`[${timestamp()}] [ERROR] [${ctx}] ${msg}`, ...extra)
};
