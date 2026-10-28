'use strict';

// TOKEN DE AUTENTICAÇÃO E ESTADO GLOBAL
let authToken = localStorage.getItem('artonline_token') || null;
let pedidosCache = [];

document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        validarTokenESubir();
    } else {
        document.getElementById('tela-login').style.display = 'flex';
        document.getElementById('app-principal').style.display = 'none';
    }
});

// LOGICA DE LOGIN
async function fazerLogin() {
    const userInp = document.getElementById('username');
    const passInp = document.getElementById('password');
    const errDiv = document.getElementById('erro-login');

    const username = userInp.value.trim();
    const password = passInp.value;

    if (!username || !password) {
        errDiv.innerText = 'Preencha usuário e senha!';
        errDiv.style.display = 'block';
        return;
    }

    errDiv.style.display = 'none';

    try {
        const res = await fetch('/api/login_ponte', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
            authToken = data.token;
            localStorage.setItem('artonline_token', authToken);
            document.getElementById('tela-login').style.display = 'none';
            document.getElementById('app-principal').style.display = 'block';
            carregarPedidos();
            carregarInsumos();
        } else {
            errDiv.innerText = data.error || data.erro || 'Credenciais inválidas!';
            errDiv.style.display = 'block';
        }
    } catch (err) {
        console.error('Erro de login:', err);
        errDiv.innerText = 'Erro de conexão com o servidor.';
        errDiv.style.display = 'block';
    }
}

function fazerLogout() {
    authToken = null;
    localStorage.removeItem('artonline_token');
    document.getElementById('tela-login').style.display = 'flex';
    document.getElementById('app-principal').style.display = 'none';
}

function validarTokenESubir() {
    document.getElementById('tela-login').style.display = 'none';
    document.getElementById('app-principal').style.display = 'block';
    carregarPedidos();
    carregarInsumos();
}

// NAVEGAÇÃO DE ABAS
function mudarAba(nomeAba, elementoLink) {
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    if (elementoLink) elementoLink.classList.add('active');

    document.querySelectorAll('.aba-conteudo').forEach(a => a.style.display = 'none');
    
    const abaAlvo = document.getElementById(`aba-${nomeAba}`);
    if (abaAlvo) abaAlvo.style.display = 'block';

    const titulos = {
        pedidos: 'Ordens de Serviço',
        producao: 'Fila de Produção (Kanban)',
        orcamento: 'Calculadora Comercial Pro Max',
        insumos: 'Estoque & Matéria-Prima',
        caixa: 'Caixa & Faturamento Diário'
    };
    document.getElementById('tituloPagina').innerText = titulos[nomeAba] || 'Painel de Controle';

    if (nomeAba === 'producao') renderizarKanban();
    if (nomeAba === 'insumos') carregarInsumos();
    if (nomeAba === 'caixa') atualizarCaixa();
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('open');
    const overlay = document.getElementById('overlay');
    overlay.style.display = overlay.style.display === 'block' ? 'none' : 'block';
}

// CARREGAR PEDIDOS DA API (Header Bearer)
async function carregarPedidos() {
    try {
        const res = await fetch('/api/pedidos', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.status === 401) {
            fazerLogout();
            return;
        }

        const data = await res.json();
        pedidosCache = data.pedidos || [];

        renderizarTabelaPedidos(pedidosCache);
        renderizarKanban();
        atualizarBadgeContadores();
        atualizarCaixa();
    } catch (err) {
        console.error('Erro ao carregar pedidos:', err);
    }
}

function renderizarTabelaPedidos(lista) {
    const tbody = document.getElementById('tabela-pedidos-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    document.getElementById('contagem-os').innerText = `${lista.length} registros`;

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted);">Nenhuma Ordem de Serviço encontrada.</td></tr>`;
        return;
    }

    lista.forEach(p => {
        const tr = document.createElement('tr');
        
        const valorTotal = parseFloat(p.valor_total || 0);
        const valorSinal = parseFloat(p.valor_sinal || 0);
        const pendente = Math.max(0, valorTotal - valorSinal);

        tr.innerHTML = `
            <td class="mono" style="font-weight:700;color:var(--emerald);">#${String(p.id).padStart(4, '0')}</td>
            <td>
                <strong>${p.cliente_nome}</strong><br>
                <small class="mono" style="color:var(--text-sub);">📱 ${p.cliente_whatsapp}</small>
            </td>
            <td>
                <strong>${p.tipo_produto}</strong><br>
                <small style="color:var(--text-muted);">${p.quantidade} un.</small>
            </td>
            <td class="mono">${p.data_previsao}</td>
            <td class="mono" style="font-weight:600;">R$ ${valorTotal.toFixed(2)}</td>
            <td class="mono" style="font-weight:700;color:${pendente > 0 ? '#ef4444' : '#10b981'};">
                R$ ${pendente.toFixed(2)}
            </td>
            <td style="text-align:center;">
                <span class="badge badge-${p.status}">${p.status.replace('_', ' ').toUpperCase()}</span>
            </td>
            <td style="text-align:right;">
                <button class="btn btn-xs btn-ghost" onclick="gerarPDF(${p.id})">📄 PDF</button>
                <button class="btn btn-xs btn-primary" onclick="avancarEtapa(${p.id}, '${p.status}')">▶ Avançar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// FILA DE PRODUÇÃO (KANBAN)
function renderizarKanban() {
    const etapas = ['aguardando_arte', 'impressao', 'acabamento', 'pronto'];
    const coresBorder = {
        aguardando_arte: 'var(--amber)',
        impressao: 'var(--cyan)',
        acabamento: 'var(--purple)',
        pronto: 'var(--emerald)'
    };

    etapas.forEach(etapa => {
        const div = document.getElementById(`kanban-${etapa}`);
        if (!div) return;
        div.innerHTML = '';

        const itens = pedidosCache.filter(p => p.status === etapa);

        if (itens.length === 0) {
            div.innerHTML = `<div style="text-align:center;padding:24px;color:var(--text-muted);font-size:12px;">Nenhum pedido nesta etapa</div>`;
            return;
        }

        itens.forEach(p => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.padding = '14px';
            card.style.borderLeft = `4px solid ${coresBorder[etapa] || 'var(--emerald)'}`;

            card.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span class="mono" style="font-weight:700;font-size:11px;color:var(--emerald);">OS #${String(p.id).padStart(4, '0')}</span>
                    <span class="mono" style="font-size:11px;color:var(--rose);font-weight:600;">📅 ${p.data_previsao}</span>
                </div>
                <div style="font-weight:700;font-size:13px;color:var(--text-main);margin-bottom:2px;">${p.cliente_nome}</div>
                <div style="font-size:12px;color:var(--text-sub);margin-bottom:10px;">${p.tipo_produto} (${p.quantidade} un.)</div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <button class="btn btn-xs btn-ghost" onclick="gerarPDF(${p.id})">📄 PDF</button>
                    <button class="btn btn-xs btn-primary" onclick="avancarEtapa(${p.id}, '${p.status}')">Avançar ➔</button>
                </div>
            `;
            div.appendChild(card);
        });
    });
}

// AVANÇAR ETAPA DO PEDIDO
async function avancarEtapa(id, statusAtual) {
    const fluxo = {
        'aguardando_arte': 'impressao',
        'impressao': 'acabamento',
        'acabamento': 'pronto',
        'pronto': 'entregue'
    };

    const novoStatus = fluxo[statusAtual];
    if (!novoStatus) return;

    try {
        const res = await fetch(`/api/pedidos/${id}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: novoStatus })
        });

        if (res.ok) {
            Swal.fire({ icon: 'success', title: 'Status Atualizado!', timer: 1200, showConfirmButton: false, background: '#141c2e', color: '#fff' });
            carregarPedidos();
        } else {
            Swal.fire({ icon: 'error', title: 'Erro ao atualizar status', background: '#141c2e', color: '#fff' });
        }
    } catch (err) {
        console.error('Erro ao avançar etapa:', err);
    }
}

// GERAR PDF DA OS
async function gerarPDF(id) {
    try {
        const res = await fetch(`/api/pedidos/${id}/pdf`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            window.open(url, '_blank');
        } else {
            Swal.fire({ icon: 'error', title: 'Falha ao gerar PDF da OS', background: '#141c2e', color: '#fff' });
        }
    } catch (err) {
        console.error('Erro ao gerar PDF:', err);
    }
}

// MODAL NOVA OS
function abrirModalNovaOS() {
    document.getElementById('modal-os').style.display = 'flex';
}
function fecharModalNovaOS() {
    document.getElementById('modal-os').style.display = 'none';
}

async function salvarNovaOS(event) {
    event.preventDefault();

    const novo = {
        cliente_nome: document.getElementById('os-cliente').value,
        cliente_whatsapp: document.getElementById('os-whatsapp').value,
        tipo_produto: document.getElementById('os-produto').value,
        quantidade: parseInt(document.getElementById('os-qtd').value),
        data_previsao: document.getElementById('os-previsao').value,
        valor_total: parseFloat(document.getElementById('os-valor-total').value),
        valor_sinal: parseFloat(document.getElementById('os-valor-sinal').value) || 0
    };

    try {
        const res = await fetch('/api/pedidos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(novo)
        });

        if (res.ok) {
            fecharModalNovaOS();
            Swal.fire({ icon: 'success', title: 'OS Criada com Sucesso!', timer: 1500, background: '#141c2e', color: '#fff' });
            carregarPedidos();
        } else {
            Swal.fire({ icon: 'error', title: 'Erro ao criar Ordem de Serviço', background: '#141c2e', color: '#fff' });
        }
    } catch (err) {
        console.error('Erro ao salvar OS:', err);
    }
}

// CALCULADORA DE ORÇAMENTO
async function calcularOrcamento() {
    const produto = document.getElementById('calc-produto').value;
    const quantidade = parseInt(document.getElementById('calc-qtd').value);
    const papel = document.getElementById('calc-papel').value;
    const acabamento = document.getElementById('calc-acabamento').value;

    try {
        const res = await fetch('/api/orcamento/calcular', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ produto, quantidade, papel, acabamento })
        });

        const data = await res.json();

        if (res.ok) {
            document.getElementById('box-resultado-calc').style.display = 'block';
            document.getElementById('res-val-total').innerText = `R$ ${parseFloat(data.valor_total).toFixed(2)}`;
            document.getElementById('res-val-sinal').innerText = `R$ ${parseFloat(data.valor_sinal_50).toFixed(2)}`;
        }
    } catch (err) {
        console.error('Erro no cálculo:', err);
    }
}

// INSUMOS & CAIXA
async function carregarInsumos() {
    try {
        const res = await fetch('/api/insumos', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        const tbody = document.getElementById('tabela-insumos-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        let temEstoqueBaixo = false;

        (data.insumos || []).forEach(i => {
            const tr = document.createElement('tr');
            const ehRepor = i.status === 'SOLICITAR';
            if (ehRepor) temEstoqueBaixo = true;

            tr.innerHTML = `
                <td><strong>${i.nome_item}</strong></td>
                <td class="mono">${i.quantidade} un.</td>
                <td class="mono">${i.qtd_minima} un.</td>
                <td>${i.fornecedor || 'PADRÃO'}</td>
                <td style="text-align:center;">
                    <span class="badge ${ehRepor ? 'badge-aguardando_arte' : 'badge-pronto'}">
                        ${ehRepor ? '⚠ REPOR ESTOQUE' : 'ESTOQUE OK'}
                    </span>
                </td>
            `;
            tbody.appendChild(tr);
        });

        const badgeEstoque = document.getElementById('badge-insumos');
        if (badgeEstoque) badgeEstoque.style.display = temEstoqueBaixo ? 'inline-flex' : 'none';
    } catch (err) {
        console.error('Erro ao carregar insumos:', err);
    }
}

function atualizarCaixa() {
    let entradas = 0;
    pedidosCache.forEach(p => {
        entradas += parseFloat(p.valor_sinal || 0);
        if (p.status === 'entregue') {
            entradas += (parseFloat(p.valor_total || 0) - parseFloat(p.valor_sinal || 0));
        }
    });

    const entradasEl = document.getElementById('caixa-entradas-val');
    const saldoEl = document.getElementById('caixa-saldo-val');
    if (entradasEl) entradasEl.innerText = `R$ ${entradas.toFixed(2)}`;
    if (saldoEl) saldoEl.innerText = `R$ ${entradas.toFixed(2)}`;
}

function atualizarBadgeContadores() {
    const osBadge = document.getElementById('badge-pedidos');
    const prodBadge = document.getElementById('badge-producao');

    if (osBadge) osBadge.innerText = pedidosCache.length;
    if (prodBadge) {
        const emProducao = pedidosCache.filter(p => ['aguardando_arte', 'impressao', 'acabamento'].includes(p.status));
        prodBadge.innerText = emProducao.length;
    }
}

function filtrarTabelaOS() {
    const q = document.getElementById('search-os').value.toLowerCase();
    const filtrados = pedidosCache.filter(p => 
        p.cliente_nome.toLowerCase().includes(q) ||
        p.cliente_whatsapp.includes(q) ||
        p.tipo_produto.toLowerCase().includes(q) ||
        String(p.id).includes(q)
    );
    renderizarTabelaPedidos(filtrados);
}
