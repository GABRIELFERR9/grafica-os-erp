#!/usr/bin/env bash
# ============================================================================
# scripts/backup.sh — Script de backup diário do banco de dados Gráfica OS
# ============================================================================

set -e

# Diretório raiz do projeto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Carrega .env se existir
if [ -f "$PROJECT_DIR/.env" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
fi

# Conexão PostgreSQL lida de DATABASE_URL ou fallback
DB_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/grafica_db}"

# Diretório de saída para backups
BACKUP_DIR="$PROJECT_DIR/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/grafica_${TIMESTAMP}.sql.gz"

echo "[$(date)] Iniciando backup do banco de dados Gráfica OS..."

# Executa pg_dump comprimido com gzip
pg_dump "$DB_URL" | gzip > "$BACKUP_FILE"

echo "[$(date)] Backup concluído com sucesso: $BACKUP_FILE"

# Apaga backups antigos com mais de 14 dias
find "$BACKUP_DIR" -type f -name "grafica_*.sql.gz" -mtime +14 -delete

echo "[$(date)] Limpeza de backups antigos (> 14 dias) concluída."
