// ====== BANCO DE DADOS LOCAL ======
let transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];
let cartoes = JSON.parse(localStorage.getItem('cartoes')) || [];
let metas = JSON.parse(localStorage.getItem('metas')) || [];
let dashChartObj = null;

// Categorias
const catReceitas = ["Salário", "Freelance", "Investimentos", "Rendimento", "Outros"];
const catDespesas = ["Alimentação", "Transporte", "Moradia", "Lazer", "Compras", "Saúde", "Educação", "Outros"];

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

window.onload = () => {
    // Aplicar Tema
    const isDark = localStorage.getItem('theme') === 'dark';
    if(isDark) {
        document.body.classList.add('dark-mode');
        document.getElementById('btn-theme').innerText = '☀️';
    }
    
    preencherAnosFiltro();
    renderAll();
};

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    document.getElementById('btn-theme').innerText = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    renderDashboard(); 
}

function showSection(sectionId, element = null) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    // Titulo Topo
    let titulos = { 'dashboard': 'Dashboard', 'receitas': 'Receitas', 'despesas': 'Despesas', 'cartoes': 'Cartões de Crédito', 'metas': 'Metas Cofrinhos', 'configuracoes': 'Configurações' };
    document.getElementById('page-title').innerText = titulos[sectionId];
    
    // Classe ativa no menu
    if(element) {
        document.querySelectorAll('#menu-list a').forEach(a => a.classList.remove('active'));
        element.classList.add('active');
    }
    renderAll();
}

// ====== GERENCIAMENTO DE MODAIS ======
function openModal(id) { 
    document.getElementById(id).classList.add('active'); 
}

function closeModal(id) { 
    document.getElementById(id).classList.remove('active');
    if(id === 'modal-transacao') document.getElementById('form-transacao').reset();
    if(id === 'modal-cartao') {
        document.getElementById('form-cartao').reset();
        document.getElementById('cartao-id').value = '';
        document.getElementById('titulo-modal-cartao').innerText = 'Novo Cartão';
    }
    if(id === 'modal-meta') {
        document.getElementById('form-meta').reset();
        document.getElementById('meta-id').value = '';
        document.getElementById('titulo-modal-meta').innerText = 'Novo Cofrinho';
    }
    if(id === 'modal-mov-meta') {
        document.getElementById('form-mov-meta').reset();
    }
}

function openModalCartao() {
    document.getElementById('form-cartao').reset();
    document.getElementById('cartao-id').value = '';
    document.getElementById('titulo-modal-cartao').innerText = "Novo Cartão";
    openModal('modal-cartao');
}

function openModalMeta() {
    document.getElementById('form-meta').reset();
    document.getElementById('meta-id').value = '';
    document.getElementById('titulo-modal-meta').innerText = "Novo Cofrinho";
    openModal('modal-meta');
}

function openModalTransacao(tipo) {
    document.getElementById('transacao-id').value = '';
    document.getElementById('transacao-tipo').value = tipo;
    
    const selectCat = document.getElementById('transacao-cat');
    selectCat.innerHTML = '';
    const categorias = tipo === 'receita' ? catReceitas : catDespesas;
    categorias.forEach(c => selectCat.innerHTML += `<option value="${c}">${c}</option>`);

    const divPagamento = document.getElementById('div-pagamento');
    if(tipo === 'despesa') {
        divPagamento.style.display = 'block';
        const selectPag = document.getElementById('transacao-pagamento');
        selectPag.innerHTML = `<option value="Dinheiro/Pix">Dinheiro / Pix</option>`;
        cartoes.forEach(c => selectPag.innerHTML += `<option value="${c.banco}">${c.banco} (Cartão)</option>`);
    } else {
        divPagamento.style.display = 'none';
    }

    document.getElementById('titulo-modal-transacao').innerText = tipo === 'receita' ? "Nova Receita" : "Nova Despesa";
    openModal('modal-transacao');
}

// ====== SALVAR E GERENCIAR TRANSAÇÕES ======
function salvarTransacao(e) {
    e.preventDefault();
    const id = document.getElementById('transacao-id').value;
    const tipo = document.getElementById('transacao-tipo').value;
    const desc = document.getElementById('transacao-desc').value;
    const valor = parseFloat(document.getElementById('transacao-valor').value);
    const cat = document.getElementById('transacao-cat').value;
    const data = document.getElementById('transacao-data').value;
    const pagamento = tipo === 'despesa' ? document.getElementById('transacao-pagamento').value : 'N/A';

    if (id) {
        const index = transacoes.findIndex(t => t.id == id);
        transacoes[index] = { id: parseFloat(id), tipo, desc, valor, cat, data, pagamento };
    } else {
        transacoes.push({ id: Date.now(), tipo, desc, valor, cat, data, pagamento });
    }

    localStorage.setItem('transacoes', JSON.stringify(transacoes));
    closeModal('modal-transacao');
    preencherAnosFiltro();
    renderAll();
}

function excluirTransacao(id) {
    if(confirm("Excluir lançamento?")) {
        transacoes = transacoes.filter(t => t.id !== id);
        localStorage.setItem('transacoes', JSON.stringify(transacoes));
        renderAll();
    }
}

// ====== DASHBOARD: FILTROS E LÓGICA ======
function preencherAnosFiltro() {
    const anos = [...new Set(transacoes.map(t => t.data.split('-')[0]))].sort((a,b) => b - a);
    const selAno = document.getElementById('dash-filtro-ano');
    let options = '<option value="">Ano (Todos)</option>';
    anos.forEach(ano => options += `<option value="${ano}">${ano}</option>`);
    if(selAno) selAno.innerHTML = options;
}

function limparFiltroDash() {
    document.getElementById('dash-filtro-data').value = '';
    document.getElementById('dash-filtro-mes').value = '';
    document.getElementById('dash-filtro-ano').value = '';
    renderDashboard();
}

function getTransacoesFiltradasDash() {
    let dados = [...transacoes];
    const fData = document.getElementById('dash-filtro-data').value;
    const fMes = document.getElementById('dash-filtro-mes').value;
    const fAno = document.getElementById('dash-filtro-ano').value;

    if(fData) dados = dados.filter(t => t.data === fData);
    if(fMes) dados = dados.filter(t => t.data.split('-')[1] === fMes);
    if(fAno) dados = dados.filter(t => t.data.split('-')[0] === fAno);

    return dados;
}

// ====== RENDERIZAÇÕES ======
function renderAll() {
    renderDashboard();
    renderTabelas('receita');
    renderTabelas('despesa');
    renderCartoes();
    renderMetas();
}

function renderDashboard() {
    const dados = getTransacoesFiltradasDash();
    
    const totalRec = dados.filter(t => t.tipo === 'receita').reduce((a, t) => a + t.valor, 0);
    const totalDesp = dados.filter(t => t.tipo === 'despesa').reduce((a, t) => a + t.valor, 0);
    const faturas = dados.filter(t => t.tipo === 'despesa' && t.pagamento !== 'Dinheiro/Pix').reduce((a, t) => a + t.valor, 0);
    const economia = metas.reduce((a, m) => a + m.guardado, 0);

    document.getElementById('dash-receitas').innerText = formatCurrency(totalRec);
    document.getElementById('dash-despesas').innerText = formatCurrency(totalDesp);
    document.getElementById('dash-saldo').innerText = formatCurrency(totalRec - totalDesp);
    document.getElementById('dash-faturas').innerText = formatCurrency(faturas);
    document.getElementById('dash-economia').innerText = formatCurrency(economia);

    // Insight
    const tx = document.getElementById('insight-text');
    if(totalDesp > totalRec && totalRec > 0) {
        tx.innerText = "Alerta: Suas despesas estão superando suas receitas neste período!";
        tx.style.borderLeftColor = "var(--red)";
    } else if (economia > 0 && totalRec > 0) {
        tx.innerText = "Ótimo trabalho! Você está mantendo o foco nas suas metas.";
        tx.style.borderLeftColor = "var(--green)";
    } else {
        tx.innerText = "Continue registrando suas movimentações para gerar insights precisos.";
        tx.style.borderLeftColor = "var(--primary)";
    }

    // Listas Top Gastos
    const despesasSort = dados.filter(t => t.tipo === 'despesa').sort((a,b) => b.valor - a.valor).slice(0, 4);
    const divGastos = document.getElementById('lista-top-gastos');
    if(despesasSort.length === 0) divGastos.innerHTML = "Sem gastos no período.";
    else {
        divGastos.innerHTML = despesasSort.map(d => `
            <div class="list-item">
                <div class="list-item-info"><strong>${d.desc}</strong><span>${d.cat} • ${d.data.split('-').reverse().join('/')}</span></div>
                <div class="list-item-value text-red">${formatCurrency(d.valor)}</div>
            </div>
        `).join('');
    }

    // Últimas Movimentações
    const ultimas = [...dados].sort((a,b) => new Date(b.data) - new Date(a.data)).slice(0, 5);
    const divUltimas = document.getElementById('lista-ultimas-mov');
    if(ultimas.length === 0) divUltimas.innerHTML = "Nenhuma movimentação.";
    else {
        divUltimas.innerHTML = ultimas.map(u => `
            <div class="list-item">
                <div class="list-item-info"><strong>${u.desc}</strong><span>${u.cat}</span></div>
                <div class="list-item-value ${u.tipo === 'receita' ? 'text-green' : 'text-red'}">${u.tipo === 'receita' ? '+' : '-'}${formatCurrency(u.valor)}</div>
            </div>
        `).join('');
    }

    renderChartBar(totalRec, totalDesp);
}

function renderChartBar(rec, desp) {
    const ctx = document.getElementById('dashBarChart').getContext('2d');
    if(dashChartObj) dashChartObj.destroy();
    
    const style = getComputedStyle(document.body);
    const colorText = style.getPropertyValue('--text-muted').trim();
    const colorRec = style.getPropertyValue('--green').trim() || '#05CD99';
    const colorDesp = style.getPropertyValue('--red').trim() || '#EE5D50';

    dashChartObj = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Receitas', 'Despesas'],
            datasets: [{
                data: [rec, desp],
                backgroundColor: [colorRec, colorDesp],
                borderRadius: 8,
                barPercentage: 0.5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false }, ticks: { color: colorText } },
                x: { grid: { display: false }, ticks: { color: colorText } }
            }
        }
    });
}

function renderTabelas(tipo) {
    const dados = transacoes.filter(t => t.tipo === tipo).sort((a,b) => new Date(b.data) - new Date(a.data));
    const tbody = document.querySelector(`#table-${tipo}s tbody`);
    if(!tbody) return;
    tbody.innerHTML = '';
    
    dados.forEach(item => {
        const tr = document.createElement('tr');
        const dataF = item.data.split('-').reverse().join('/');
        let html = `<td>${dataF}</td><td>${item.desc}</td><td>${item.cat}</td>`;
        if(tipo === 'despesa') html += `<td>${item.pagamento}</td>`;
        html += `<td class="${tipo === 'receita' ? 'text-green' : 'text-red'}">${formatCurrency(item.valor)}</td>
                 <td><button onclick="excluirTransacao(${item.id})" class="btn-secondary" style="padding: 4px 8px;">🗑️</button></td>`;
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

// ====== CARTÕES (SALVAR, EDITAR, EXCLUIR, RENDERIZAR) ======
function salvarCartao(e) {
    e.preventDefault();
    const id = document.getElementById('cartao-id').value;
    const banco = document.getElementById('cartao-banco').value.trim();
    const nome = document.getElementById('cartao-nome').value.trim();
    const limite = parseFloat(document.getElementById('cartao-limite').value);
    const fechamento = parseInt(document.getElementById('cartao-fechamento').value);
    const vencimento = parseInt(document.getElementById('cartao-vencimento').value);
    const cor = document.getElementById('cartao-cor').value;

    if (!banco || !nome || isNaN(limite) || isNaN(fechamento) || isNaN(vencimento)) {
        alert('Por favor, preencha todos os campos do cartão corretamente.');
        return;
    }

    if (id) {
        const index = cartoes.findIndex(c => c.id == id);
        if (index !== -1) {
            const oldBanco = cartoes[index].banco;
            cartoes[index] = { id: parseFloat(id), banco, nome, limite, fechamento, vencimento, cor };

            // Se o nome do Banco mudou, atualizamos as transações vinculadas a esse cartão
            if (oldBanco !== banco) {
                transacoes.forEach(t => {
                    if (t.pagamento === oldBanco) {
                        t.pagamento = banco;
                    }
                });
                localStorage.setItem('transacoes', JSON.stringify(transacoes));
            }
        }
    } else {
        cartoes.push({ id: Date.now(), banco, nome, limite, fechamento, vencimento, cor });
    }

    localStorage.setItem('cartoes', JSON.stringify(cartoes));
    closeModal('modal-cartao');
    renderAll();
}

function editarCartao(id) {
    const cartao = cartoes.find(c => c.id === id);
    if (!cartao) return;

    document.getElementById('cartao-id').value = cartao.id;
    document.getElementById('cartao-banco').value = cartao.banco;
    document.getElementById('cartao-nome').value = cartao.nome;
    document.getElementById('cartao-limite').value = cartao.limite;
    document.getElementById('cartao-fechamento').value = cartao.fechamento;
    document.getElementById('cartao-vencimento').value = cartao.vencimento;
    document.getElementById('cartao-cor').value = cartao.cor || '#4318FF';

    document.getElementById('titulo-modal-cartao').innerText = "Editar Cartão";
    openModal('modal-cartao');
}

function excluirCartao(id) {
    if(confirm("Deseja realmente excluir este cartão?")) {
        cartoes = cartoes.filter(c => c.id !== id);
        localStorage.setItem('cartoes', JSON.stringify(cartoes));
        renderAll();
    }
}

function renderCartoes() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    
    if(cartoes.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">Nenhum cartão cadastrado.</p>';
        return;
    }

    cartoes.forEach(cartao => {
        const div = document.createElement('div');
        div.className = 'credit-card';
        div.style.background = cartao.cor;
        div.style.color = '#fff';
        div.style.padding = '25px';
        div.style.borderRadius = '16px';
        div.style.position = 'relative';
        
        const fatura = transacoes.filter(t => t.tipo === 'despesa' && t.pagamento === cartao.banco).reduce((a, t) => a + t.valor, 0);
        
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                <span style="font-weight:700; letter-spacing:1px;">${cartao.banco.toUpperCase()}</span>
                <div>
                    <button onclick="editarCartao(${cartao.id})" style="background:none; border:none; color:#fff; cursor:pointer; font-size:16px; margin-right:8px;" title="Editar Cartão">✏️</button>
                    <button onclick="excluirCartao(${cartao.id})" style="background:none; border:none; color:#fff; cursor:pointer; font-size:16px;" title="Excluir Cartão">🗑️</button>
                </div>
            </div>
            <div style="font-size:22px; font-weight:500; margin-bottom: 20px;">${cartao.nome}</div>
            <div style="display:flex; justify-content:space-between; font-size: 13px; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
                <div><span>Limite Total</span><br><strong>${formatCurrency(cartao.limite)}</strong></div>
                <div><span style="color:#FFA726;">Fatura Atual</span><br><strong>${formatCurrency(fatura)}</strong></div>
            </div>
        `;
        container.appendChild(div);
    });
}

// ====== METAS / COFRINHOS (CRIAR, EDITAR, DEPOSITAR, RETIRAR, EXCLUIR) ======
function salvarMeta(e) {
    e.preventDefault();
    const id = document.getElementById('meta-id').value;
    const icone = document.getElementById('meta-icone').value;
    const nome = document.getElementById('meta-nome').value;
    const desc = document.getElementById('meta-desc').value;
    const alvo = parseFloat(document.getElementById('meta-alvo').value);
    const guardado = parseFloat(document.getElementById('meta-guardado').value);
    const prazo = document.getElementById('meta-prazo').value;

    if (isNaN(alvo) || alvo <= 0 || isNaN(guardado) || guardado < 0) {
        alert('Por favor, informe valores numéricos válidos.');
        return;
    }

    if(id) {
        const index = metas.findIndex(m => m.id == id);
        if (index !== -1) {
            metas[index] = { id: parseFloat(id), icone, nome, desc, alvo, guardado, prazo };
        }
    } else {
        metas.push({ id: Date.now(), icone, nome, desc, alvo, guardado, prazo });
    }

    localStorage.setItem('metas', JSON.stringify(metas));
    closeModal('modal-meta');
    renderAll();
}

function editarMeta(id) {
    const m = metas.find(x => x.id === id);
    if (!m) return;
    document.getElementById('meta-id').value = m.id;
    document.getElementById('meta-icone').value = m.icone;
    document.getElementById('meta-nome').value = m.nome;
    document.getElementById('meta-desc').value = m.desc;
    document.getElementById('meta-alvo').value = m.alvo;
    document.getElementById('meta-guardado').value = m.guardado;
    document.getElementById('meta-prazo').value = m.prazo;
    document.getElementById('titulo-modal-meta').innerText = "Editar Cofrinho";
    openModal('modal-meta');
}

function openModalMovMeta(id, tipo) {
    const meta = metas.find(m => m.id === id);
    if (!meta) return;

    document.getElementById('mov-meta-id').value = meta.id;
    document.getElementById('mov-meta-tipo').value = tipo;
    document.getElementById('mov-meta-valor').value = '';

    const infoDiv = document.getElementById('info-mov-meta');
    infoDiv.innerHTML = `<strong>${meta.icone} ${meta.nome}</strong><br><span style="color: var(--text-muted); font-size: 13px;">Saldo Atual: <strong>${formatCurrency(meta.guardado)}</strong></span>`;

    const btnSubmit = document.getElementById('btn-submit-mov-meta');

    if (tipo === 'depositar') {
        document.getElementById('titulo-modal-mov-meta').innerText = 'Depositar no Cofrinho';
        document.getElementById('label-mov-valor').innerText = 'Valor a depositar (R$):';
        btnSubmit.innerText = 'Confirmar Depósito';
        btnSubmit.style.backgroundColor = 'var(--green)';
    } else {
        document.getElementById('titulo-modal-mov-meta').innerText = 'Retirar do Cofrinho';
        document.getElementById('label-mov-valor').innerText = 'Valor a retirar (R$):';
        btnSubmit.innerText = 'Confirmar Retirada';
        btnSubmit.style.backgroundColor = 'var(--red)';
    }

    openModal('modal-mov-meta');
}

function executarMovimentacaoMeta(e) {
    e.preventDefault();
    const id = parseFloat(document.getElementById('mov-meta-id').value);
    const tipo = document.getElementById('mov-meta-tipo').value;
    const valor = parseFloat(document.getElementById('mov-meta-valor').value);

    if (isNaN(valor) || valor <= 0) {
        alert('Por favor, informe um valor válido maior que zero.');
        return;
    }

    const index = metas.findIndex(m => m.id === id);
    if (index === -1) return;

    if (tipo === 'depositar') {
        metas[index].guardado += valor;
    } else if (tipo === 'retirar') {
        if (valor > metas[index].guardado) {
            alert(`Valor de retirada superior ao saldo disponível! Saldo disponível no cofrinho: ${formatCurrency(metas[index].guardado)}`);
            return;
        }
        metas[index].guardado -= valor;
    }

    localStorage.setItem('metas', JSON.stringify(metas));
    closeModal('modal-mov-meta');
    renderAll();
}

function excluirMeta(id) {
    if(confirm("Deseja realmente excluir este cofrinho?")) {
        metas = metas.filter(m => m.id !== id);
        localStorage.setItem('metas', JSON.stringify(metas));
        renderAll();
    }
}

function renderMetas() {
    const container = document.getElementById('metas-container');
    container.innerHTML = '';
    
    if(metas.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">Nenhum cofrinho criado. Comece a poupar agora!</p>';
        return;
    }

    metas.forEach(meta => {
        const p = meta.alvo > 0 ? (meta.guardado / meta.alvo) * 100 : 0;
        const perc = p > 100 ? 100 : p;
        const falta = meta.alvo - meta.guardado;

        let prazoFormatado = meta.prazo;
        if (meta.prazo && meta.prazo.includes('-')) {
            const [ano, mes] = meta.prazo.split('-');
            const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
            if (mes && parseInt(mes) >= 1 && parseInt(mes) <= 12) {
                prazoFormatado = `${meses[parseInt(mes)-1]}/${ano}`;
            }
        }

        container.innerHTML += `
            <div class="meta-card">
                ${perc >= 100 ? `<div class="meta-badge" style="color:var(--green); background:rgba(5,205,153,0.1); border-color:var(--green);">CONCLUÍDO!</div>` : `<div class="meta-badge">EM ANDAMENTO</div>`}
                <div class="meta-header">
                    <div class="meta-icon">${meta.icone}</div>
                    <div class="meta-title">
                        <h3>${meta.nome}</h3>
                        <span>${meta.desc}</span>
                    </div>
                </div>
                <div class="meta-valores">
                    <strong>${formatCurrency(meta.guardado)}</strong> guardados de ${formatCurrency(meta.alvo)}
                </div>
                <div class="meta-progress-bg">
                    <div class="meta-progress-fill" style="width: ${perc}%"></div>
                </div>
                <div class="meta-footer">
                    <span>${perc.toFixed(1)}% concluído</span>
                    <span>${falta > 0 ? `Faltam ${formatCurrency(falta)}` : 'Meta alcançada!'}</span>
                </div>
                <div class="meta-actions-row">
                    <button class="btn-deposito" onclick="openModalMovMeta(${meta.id}, 'depositar')">+ Depositar</button>
                    <button class="btn-retirada" onclick="openModalMovMeta(${meta.id}, 'retirar')">- Retirar</button>
                </div>
                <div class="meta-footer" style="border-top:none; padding-top: 5px;">
                    <span>Prazo: ${prazoFormatado}</span>
                    <div>
                        <button class="btn-link" onclick="editarMeta(${meta.id})">Editar</button> | 
                        <button class="btn-link" style="color:var(--red);" onclick="excluirMeta(${meta.id})">Excluir</button>
                    </div>
                </div>
            </div>
        `;
    });
}

// ====== CONFIGURAÇÕES ======
function limparTodosDados() {
    if(confirm("⚠️ AVISO: Isso vai apagar todas as suas transações, cartões e metas para sempre! Tem certeza absoluta?")) {
        localStorage.clear();
        alert("Sistema formatado com sucesso.");
        window.location.reload();
    }
}