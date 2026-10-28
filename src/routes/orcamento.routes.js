'use strict';

const express = require('express');
const { autenticar } = require('./middlewares/autenticar');

function criarOrcamentoRoutes() {
  const router = express.Router();

  /**
   * Calculadora Gráfica
   * Calcula preço baseado na tiragem, papel, acabamentos e margem
   */
  router.post('/api/orcamento/calcular', autenticar, (req, res) => {
    try {
      const { produto, quantidade, papel, acabamento, urgencia } = req.body || {};

      const qtd = parseInt(quantidade, 10) || 100;
      let precoBaseUnitario = 0.50; // valor base

      // Ajuste por produto
      if (produto === 'cartao_visita') precoBaseUnitario = 0.15;
      else if (produto === 'panfleto') precoBaseUnitario = 0.35;
      else if (produto === 'banner') precoBaseUnitario = 45.00;
      else if (produto === 'adesivo') precoBaseUnitario = 0.60;

      // Desconto por volume
      if (qtd >= 1000) precoBaseUnitario *= 0.6;
      else if (qtd >= 500) precoBaseUnitario *= 0.75;

      // Adicional por papel especial
      let valorPapel = 0;
      if (papel === 'couche_300g') valorPapel = 0.05 * qtd;
      else if (papel === 'offset_90g') valorPapel = 0.02 * qtd;
      else if (papel === 'vinil') valorPapel = 5.00 * (qtd / 10);

      // Adicional por acabamento
      let valorAcabamento = 0;
      if (acabamento === 'laminacao_fosca') valorAcabamento = 0.08 * qtd;
      else if (acabamento === 'verniz_localizado') valorAcabamento = 0.15 * qtd;
      else if (acabamento === 'ilhós') valorAcabamento = 10.00;

      let subtotal = (precoBaseUnitario * qtd) + valorPapel + valorAcabamento;

      // Taxa de urgência (produção expressa em 24h)
      if (urgencia) {
        subtotal *= 1.25;
      }

      const totalCalculado = Math.max(15.00, subtotal); // valor mínimo R$ 15,00
      const sinalSugerido = totalCalculado * 0.5;

      return res.json({
        success: true,
        orcamento: {
          produto,
          quantidade: qtd,
          papel,
          acabamento,
          valorTotal: totalCalculado.toFixed(2),
          sinal50: sinalSugerido.toFixed(2),
          restante50: (totalCalculado - sinalSugerido).toFixed(2)
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Erro ao calcular orçamento.' });
    }
  });

  return router;
}

module.exports = criarOrcamentoRoutes;
