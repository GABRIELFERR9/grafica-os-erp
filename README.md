# 🖨️ Gráfica OS — Sistema de Gestão & Produção para Gráficas

Sistema completo de gestão comercial, ordens de serviço, orçamento automático e automação de atendimento via WhatsApp adaptado para Gráficas Rápidas, Copiadoras e Gráficas Offset.

## 🚀 Tecnologias

- **Backend:** Node.js + Express
- **Banco de Dados:** PostgreSQL
- **Integração WhatsApp:** Evolution API (Baileys) + Gemini Flash-Lite (IA)
- **Gerador de PDFs:** pdf-lib (Geração de OS com termos de aprovação)
- **Frontend:** Single Page Application (SPA) em HTML5, CSS3 Vanilla com Glassmorphic UI e JavaScript nativo.

## 📦 Estrutura de Módulos

1. **Ordens de Serviço (OS):** Cadastro de pedidos com valor total, sinal de entrada (50%) e valor pendente na entrega.
2. **Fila de Produção:** Kanban visual para acompanhamento da pré-impressão, impressão, acabamento e retirada.
3. **Calculadora Gráfica:** Precificação automática de cartões, panfletos, banners e adesivos por papel e tiragem.
4. **Matéria-Prima & Papéis:** Alerta em vermelho ("⚠ SOLICITAR") quando a quantidade em estoque atinge o limite mínimo.
5. **Caixa Financeiro:** Balanço em tempo real de entradas, saídas e saldo acumulado no dia.
6. **Automação WhatsApp:** Disparo automático de mensagem quando a OS é marcada como "PRONTO PARA RETIRADA".

## 🛠️ Como Rodar Localmente

1. Navegue até a pasta do projeto:
   ```bash
   cd C:\Users\CBRO\Desktop\Projetos\grafica-os
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie o arquivo `.env` baseado no `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Inicie o servidor:
   ```bash
   npm start
   ```
5. Acesse o painel em `http://localhost:3010`.

## 💾 Backup Diário (Cron)

O script `scripts/backup.sh` realiza o dump comprimido do PostgreSQL e remove cópias com mais de 14 dias.

Linha de cron recomendada no servidor de produção (execução diária às 03:00):
```cron
0 3 * * * /caminho/para/grafica-os/scripts/backup.sh >> /var/log/grafica_backup.log 2>&1
```

## 💼 Credenciais Padrão do Painel
- **Usuário:** `admin`
- **Senha:** a definida em `PAINEL_SENHA` no `.env`

---
Feito por [Gabriel Ferreira](https://github.com/GABRIELFERR9).
