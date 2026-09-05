/* ==================================================
   1. ESTADO E LOCALSTORAGE
================================================== */
const STORAGE_KEY = '@OpenFinancing:dados';

let appState = {
    transactions: [],
    goals: [],
    cards: [],
    theme: 'light'
};

// Formatação BRL
const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

// Formatação Data (AAAA-MM-DD para DD/MM/AAAA)
const formatDate = (dateString) => {
    if(!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
};

// Formatação de Prazo Mês/Ano (AAAA-MM)
const formatMonthYear = (dateString) => {
    if(!dateString) return '-';
    const [year, month] = dateString.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(month)-1]}/${year}`;
};

const loadData = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
        appState = JSON.parse(data);
        // Migração caso cards antigos não tenham propriedade used/available
        appState.cards.forEach(c => {
            if(c.used === undefined) c.used = 0;
        });
        // Migração para histórico em metas antigas
        appState.goals.forEach(g => {
            if(!g.history) g.history = [];
        });
    }
    applyTheme(appState.theme);
    populateCategories();
};

const saveData = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    updateUI(); 
};

/* ==================================================
   2. CATEGORIAS PADRÃO
================================================== */
const categories = {
    receita: ['Salário', 'Investimentos', 'Freelance', 'Bônus', 'Outros'],
    despesa: ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Compras', 'Assinaturas', 'Contas', 'Outros']
};

const populateCategories = () => {
    const select = document.getElementById('transCategory');
    if(!select) return;
    const type = document.getElementById('transType').value;
    select.innerHTML = '';
    const list = categories[type] || categories['despesa'];
    list.forEach(cat => {
        select.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
};

/* ==================================================
   3. NAVEGAÇÃO, TEMA E RESPONSIVIDADE
================================================== */
const setupNavigation = () => {
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');
    const pageTitle = document.getElementById('pageTitle');
    const sidebar = document.getElementById('sidebar');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));
            
            const btn = e.currentTarget;
            btn.classList.add('active');
            const targetView = btn.getAttribute('data-target');
            document.getElementById(targetView).classList.add('active');
            
            // Título limpo
            pageTitle.textContent = btn.textContent.replace(/[^\w\sÀ-ÿ]/g, '').trim();
            sidebar.classList.remove('open');
        });
    });

    document.getElementById('menuToggle').addEventListener('click', () => {
        sidebar.classList.add('open');
    });

    document.getElementById('closeMenuBtn').addEventListener('click', () => {
        sidebar.classList.remove('open');
    });
};

const applyTheme = (theme) => {
    const html = document.documentElement;
    const themeBtn = document.getElementById('themeToggle');
    if (theme === 'dark') {
        html.setAttribute('data-theme', 'dark');
        themeBtn.textContent = '☀️';
    } else {
        html.removeAttribute('data-theme');
        themeBtn.textContent = '🌙';
    }
    appState.theme = theme;
};

document.getElementById('themeToggle').addEventListener('click', () => {
    const newTheme = appState.theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    saveData();
});

/* ==================================================
   4. CÁLCULOS E DASHBOARD
================================================== */
const getFilteredTransactions = () => {
    const filter = document.getElementById('periodFilter').value;
    const now = new Date();
    
    return appState.transactions.filter(t => {
        const tDate = new Date(t.date);
        if (filter === 'month') {
            return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        } else if (filter === 'year') {
            return tDate.getFullYear() === now.getFullYear();
        }
        return true;
    });
};

const updateDashboard = () => {
    const filteredT = getFilteredTransactions();
    
    let totalReceitas = 0;
    let totalDespesas = 0;
    
    // Cálculo Dinheiro
    filteredT.forEach(t => {
        if (t.type === 'receita') totalReceitas += Number(t.value);
        if (t.type === 'despesa') totalDespesas += Number(t.value);
    });

    const saldo = totalReceitas - totalDespesas;
    
    let economiaTotal = 0;
    appState.goals.forEach(g => economiaTotal += Number(g.current));
    
    let cartoesUtilizados = 0;
    appState.cards.forEach(c => cartoesUtilizados += Number(c.used));

    document.getElementById('dashReceitas').textContent = formatCurrency(totalReceitas);
    document.getElementById('dashDespesas').textContent = formatCurrency(totalDespesas);
    document.getElementById('dashSaldo').textContent = formatCurrency(saldo);
    document.getElementById('dashEconomia').textContent = formatCurrency(economiaTotal);
    document.getElementById('dashCartoes').textContent = formatCurrency(cartoesUtilizados);

    renderCharts(totalReceitas, totalDespesas, filteredT);
    renderInsights(totalReceitas, totalDespesas, saldo);
    renderRecentTransactions(filteredT);
};

const renderCharts = (rec, desp, transactions) => {
    // Gráfico Vertical (Rec x Desp)
    const maxVal = Math.max(rec, desp, 1);
    const recPerc = (rec / maxVal) * 100;
    const despPerc = (desp / maxVal) * 100;
    
    document.getElementById('chartRecFill').style.height = `${recPerc}%`;
    document.getElementById('chartDespFill').style.height = `${despPerc}%`;

    // Gráfico Horizontal (Categorias)
    const cats = {};
    transactions.filter(t => t.type === 'despesa').forEach(t => {
        cats[t.category] = (cats[t.category] || 0) + t.value;
    });
    
    const sortedCats = Object.entries(cats).sort((a,b) => b[1] - a[1]).slice(0, 4);
    const catContainer = document.getElementById('categoryChart');
    catContainer.innerHTML = '';
    
    if(sortedCats.length === 0) {
        catContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem">Sem gastos no período.</p>';
        return;
    }

    const maxCat = sortedCats[0][1];
    sortedCats.forEach(([catName, val]) => {
        const perc = (val / maxCat) * 100;
        catContainer.innerHTML += `
            <div class="h-bar-item">
                <div class="h-bar-header">
                    <span>${catName}</span>
                    <strong>${formatCurrency(val)}</strong>
                </div>
                <div class="h-bar-bg">
                    <div class="h-bar-fill" style="width: ${perc}%"></div>
                </div>
            </div>
        `;
    });
};

const renderInsights = (rec, desp, saldo) => {
    const list = document.getElementById('insightsList');
    list.innerHTML = '';
    let insights = [];
    
    if (saldo > 0) insights.push(`🎉 Você está operando no azul com sobra de ${formatCurrency(saldo)}.`);
    else if (saldo < 0) insights.push(`⚠️ Suas despesas superaram as receitas em ${formatCurrency(Math.abs(saldo))}.`);
    
    appState.goals.forEach(g => {
        const perc = ((g.current / g.target) * 100);
        if (perc >= 80 && perc < 100) insights.push(`🎯 O cofrinho "${g.name}" está ${perc.toFixed(1)}% concluído!`);
    });
    
    appState.cards.forEach(c => {
        const p = (c.used / c.limit) * 100;
        if(p > 80) insights.push(`💳 Atenção: O cartão ${c.name} atingiu ${p.toFixed(0)}% do limite.`);
    });

    if (insights.length === 0) insights.push(`Continue registrando suas movimentações para gerar insights.`);

    insights.slice(0, 3).forEach(text => {
        const icon = text.includes('⚠️') ? 'var(--color-yellow)' : (text.includes('💳') ? 'var(--color-red)' : 'var(--color-blue)');
        list.innerHTML += `<div class="insight-item" style="border-left-color: ${icon}"><span>${text}</span></div>`;
    });
};

const renderRecentTransactions = (transactions) => {
    const list = document.getElementById('recentTransactions');
    list.innerHTML = '';
    const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
    
    if(sorted.length === 0) {
        list.innerHTML = `<p style="color:var(--text-muted); font-size:0.9rem">Nenhuma movimentação.</p>`;
        return;
    }

    sorted.forEach(t => {
        const isRec = t.type === 'receita';
        list.innerHTML += `
            <div class="transaction-item" style="border-left-color: var(${isRec ? '--color-green' : '--color-red'})">
                <div>
                    <strong>${t.desc}</strong><br>
                    <small style="color:var(--text-muted)">${formatDate(t.date)}</small>
                </div>
                <strong class="${isRec ? 'text-green' : 'text-red'}">
                    ${isRec ? '+' : '-'} ${formatCurrency(t.value)}
                </strong>
            </div>
        `;
    });
};

/* ==================================================
   5. LÓGICA DOS CARTÕES DE CRÉDITO (REGRAS 4, 5, 6, 7)
================================================== */
const calculateCardLimits = () => {
    // Zera o uso
    appState.cards.forEach(c => c.used = 0);
    
    // Soma todas as despesas vinculadas a cartões
    appState.transactions.forEach(t => {
        if (t.type === 'despesa' && t.payment === 'cartao' && t.cardId) {
            const card = appState.cards.find(c => c.id === parseInt(t.cardId));
            if (card) {
                // Se for parcelado, soma o valor total (limitando o limite)
                // O t.value já é o valor total da compra registrado no form
                card.used += Number(t.value);
            }
        }
    });
};

const renderCards = () => {
    const grid = document.getElementById('cardsGrid');
    grid.innerHTML = '';
    
    const cardSelect = document.getElementById('transCard');
    cardSelect.innerHTML = '';

    if (appState.cards.length === 0) {
        grid.innerHTML = `<p style="color:var(--text-muted)">Nenhum cartão cadastrado.</p>`;
        cardSelect.innerHTML = `<option value="">Cadastre um cartão primeiro</option>`;
        return;
    }

    appState.cards.forEach(c => {
        const available = c.limit - c.used;
        const perc = (c.used / c.limit) * 100;
        
        // Popula Options no Select do Modal de Despesa
        cardSelect.innerHTML += `<option value="${c.id}">${c.name} (Disp: ${formatCurrency(available)})</option>`;

        // Renderiza UI do Cartão
        grid.innerHTML += `
            <div class="credit-card-ui">
                <button class="card-actions-btn" onclick="deleteCard(${c.id})" title="Excluir Cartão">🗑️</button>
                <div class="card-bank">${c.bank}</div>
                <div class="card-name">${c.name}</div>
                <div class="card-limits">
                    <div class="limit-row total">
                        <span>Limite Total</span>
                        <span>${formatCurrency(c.limit)}</span>
                    </div>
                    <div class="limit-row used">
                        <span>Utilizado (Fatura)</span>
                        <span>${formatCurrency(c.used)}</span>
                    </div>
                    <div class="progress-bar-bg" style="height: 4px; background: rgba(255,255,255,0.2); margin: 4px 0;">
                        <div class="progress-bar-fill ${perc > 90 ? 'bg-red' : 'bg-green'}" style="width: ${perc > 100 ? 100 : perc}%"></div>
                    </div>
                    <div class="limit-row avail">
                        <span>Disponível</span>
                        <span>${formatCurrency(available)}</span>
                    </div>
                </div>
                <div class="card-dates">
                    <span>Fechamento: Dia ${c.closeDay}</span>
                    <span>Vencimento: Dia ${c.dueDay}</span>
                </div>
            </div>
        `;
    });
};

const deleteCard = (id) => {
    // Verifica se há despesas vinculadas
    const hasExpenses = appState.transactions.some(t => t.payment === 'cartao' && parseInt(t.cardId) === id);
    if(hasExpenses) {
        alert("Não é possível excluir um cartão que possui despesas vinculadas. Apague as despesas primeiro.");
        return;
    }
    
    if(confirm('Tem certeza que deseja remover este cartão?')) {
        appState.cards = appState.cards.filter(c => c.id !== id);
        saveData();
        showToast('Cartão removido!');
    }
};

// Form: Cadastrar Cartão (CORREÇÃO URGENTE REGRA 2 & 3)
document.getElementById('cardForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('cardName').value;
    const bank = document.getElementById('cardBank').value;
    const limit = parseFloat(document.getElementById('cardLimit').value);
    const closeDay = document.getElementById('cardClose').value;
    const dueDay = document.getElementById('cardDue').value;

    appState.cards.push({
        id: Date.now(),
        name, bank, limit, used: 0, closeDay, dueDay
    });

    saveData();
    closeModal('cardModal');
    e.target.reset();
    showToast('Cartão cadastrado com sucesso!');
});


/* ==================================================
   6. TRANSAÇÕES E LIGAÇÃO COM CARTÃO
================================================== */
const toggleCardSelect = () => {
    const payment = document.getElementById('transPayment').value;
    const cardGroup = document.getElementById('cardSelectGroup');
    const instGroup = document.getElementById('installmentsGroup');
    
    if(payment === 'cartao') {
        cardGroup.style.display = 'flex';
        instGroup.style.display = 'flex';
    } else {
        cardGroup.style.display = 'none';
        instGroup.style.display = 'none';
    }
};

const renderTransactionsTables = () => {
    const recTable = document.querySelector('#receitasTable tbody');
    const despTable = document.querySelector('#despesasTable tbody');
    
    recTable.innerHTML = '';
    despTable.innerHTML = '';

    const sorted = [...appState.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(t => {
        const tr = document.createElement('tr');
        
        let paymentInfo = '';
        if(t.type === 'despesa') {
            if(t.payment === 'cartao') {
                const c = appState.cards.find(card => card.id === parseInt(t.cardId));
                paymentInfo = `<span class="text-blue">💳 ${c ? c.name : 'Cartão Excluído'} ${t.installments > 1 ? `(${t.installments}x)` : ''}</span>`;
            } else {
                paymentInfo = `<span>💵 Dinheiro/Conta</span>`;
            }
        }

        if(t.type === 'receita') {
            tr.innerHTML = `
                <td>${formatDate(t.date)}</td>
                <td>${t.desc}</td>
                <td><span class="badge receita">${t.category}</span></td>
                <td class="text-green font-bold">+ ${formatCurrency(t.value)}</td>
                <td><button class="btn-secondary" style="padding: 6px" onclick="deleteTransaction(${t.id})">🗑️</button></td>
            `;
            recTable.appendChild(tr);
        } else {
            tr.innerHTML = `
                <td>${formatDate(t.date)}</td>
                <td>${t.desc}</td>
                <td><span class="badge despesa">${t.category}</span></td>
                <td>${paymentInfo}</td>
                <td class="text-red font-bold">- ${formatCurrency(t.value)}</td>
                <td><button class="btn-secondary" style="padding: 6px" onclick="deleteTransaction(${t.id})">🗑️</button></td>
            `;
            despTable.appendChild(tr);
        }
    });
};

document.getElementById('transactionForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('transType').value;
    const desc = document.getElementById('transDesc').value;
    const value = parseFloat(document.getElementById('transValue').value);
    const date = document.getElementById('transDate').value;
    const category = document.getElementById('transCategory').value;
    
    const obj = { id: Date.now(), type, desc, value, date, category };

    if(type === 'despesa') {
        const payment = document.getElementById('transPayment').value;
        obj.payment = payment;
        if(payment === 'cartao') {
            const cardId = document.getElementById('transCard').value;
            if(!cardId) {
                alert("Por favor, cadastre um cartão primeiro.");
                return;
            }
            obj.cardId = cardId;
            obj.installments = parseInt(document.getElementById('transInstallments').value) || 1;
        }
    }

    appState.transactions.push(obj);
    saveData();
    closeModal('transactionModal');
    e.target.reset();
    showToast(`${type === 'receita' ? 'Receita' : 'Despesa'} salva!`);
});

const deleteTransaction = (id) => {
    if(confirm("Excluir esta transação?")) {
        appState.transactions = appState.transactions.filter(t => t.id !== id);
        saveData(); // Recalcula limites automaticamente
        showToast('Transação excluída e limites recalculados.');
    }
};

/* ==================================================
   7. METAS & COFRINHOS DIGITAIS (REGRAS 11 A 20)
================================================== */
const renderGoals = () => {
    const grid = document.getElementById('goalsGrid');
    grid.innerHTML = '';

    if (appState.goals.length === 0) {
        grid.innerHTML = `<p style="color:var(--text-muted)">Nenhum cofrinho criado.</p>`;
        return;
    }

    appState.goals.forEach(g => {
        let percentage = (g.current / g.target) * 100;
        if (percentage > 100) percentage = 100;
        
        let status = 'Em andamento';
        let statusColor = 'var(--color-purple)';
        
        // Regra de Status baseada em Prazo
        if (percentage === 100) {
            status = 'Concluída';
            statusColor = 'var(--color-green)';
            if(g.status !== 'Concluída') {
                showToast(`🎉 META CONCLUÍDA: ${g.name}!`);
            }
        } else if (g.deadline) {
            const today = new Date();
            const dead = new Date(g.deadline + '-01'); // Adiciona dia 01 para parsear mes/ano
            const diffTime = dead - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if(diffDays < 0) {
                status = 'Atrasada';
                statusColor = 'var(--color-red)';
            } else if(diffDays <= 30) {
                status = 'Próxima do prazo';
                statusColor = 'var(--color-yellow)';
            }
        }
        
        g.status = status; // Atualiza status real no objeto

        const [icon, ...typeText] = g.type.split(' ');

        grid.innerHTML += `
            <div class="goal-card" onclick="openGoalDetail(${g.id})">
                <div class="goal-header">
                    <div class="goal-title-group">
                        <span class="goal-icon">${icon}</span>
                        <div>
                            <h3 style="font-size:1.1rem">${g.name}</h3>
                            <small style="color:var(--text-muted)">${typeText.join(' ')}</small>
                        </div>
                    </div>
                    <span class="goal-status" style="color: ${statusColor}; border: 1px solid ${statusColor}">
                        ${status}
                    </span>
                </div>
                
                <p style="font-size:1.4rem; font-weight:700; margin-top:10px;">
                    ${formatCurrency(g.current)} 
                    <span style="font-size:0.8rem; font-weight:400; color:var(--text-muted)">guardados de ${formatCurrency(g.target)}</span>
                </p>
                
                <div class="progress-container">
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${statusColor}"></div>
                    </div>
                    <div class="progress-stats">
                        <span>${percentage.toFixed(1)}% concluído</span>
                        <span>Faltam ${formatCurrency(g.target - g.current < 0 ? 0 : g.target - g.current)}</span>
                    </div>
                </div>
                <div class="goal-footer">
                    <span>Prazo: ${formatMonthYear(g.deadline)}</span>
                    <span class="text-blue" style="font-weight:600">Ver Detalhes →</span>
                </div>
            </div>
        `;
    });
};

document.getElementById('goalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('goalType').value;
    const name = document.getElementById('goalName').value;
    const target = parseFloat(document.getElementById('goalTarget').value);
    const deadline = document.getElementById('goalDeadline').value;

    appState.goals.push({
        id: Date.now(),
        type, name, target, current: 0, deadline, status: 'Em andamento', history: []
    });

    saveData();
    closeModal('goalModal');
    e.target.reset();
    showToast('Cofrinho criado!');
});

/* Modal Detalhes da Meta (Regras 16, 17, 18, 19) */
let currentGoalView = null;

const openGoalDetail = (id) => {
    const goal = appState.goals.find(g => g.id === id);
    if(!goal) return;
    currentGoalView = goal.id;

    document.getElementById('detailGoalName').textContent = `${goal.type.split(' ')[0]} ${goal.name}`;
    document.getElementById('detailGoalTarget').textContent = formatCurrency(goal.target);
    document.getElementById('detailGoalCurrent').textContent = formatCurrency(goal.current);
    
    const remaining = goal.target - goal.current;
    document.getElementById('detailGoalRemaining').textContent = formatCurrency(remaining < 0 ? 0 : remaining);
    
    let perc = (goal.current / goal.target) * 100;
    if(perc > 100) perc = 100;
    
    const bar = document.getElementById('detailGoalBar');
    bar.style.width = `${perc}%`;
    bar.style.backgroundColor = perc === 100 ? 'var(--color-green)' : 'var(--color-purple)';
    
    document.getElementById('detailGoalPerc').textContent = `${perc.toFixed(1)}% Concluído`;
    document.getElementById('detailGoalDeadlineInfo').textContent = `Prazo: ${formatMonthYear(goal.deadline)}`;
    
    const statusEl = document.getElementById('detailGoalStatus');
    statusEl.textContent = goal.status;
    statusEl.style.color = perc === 100 ? 'var(--color-green)' : (goal.status === 'Atrasada' ? 'var(--color-red)' : 'var(--color-purple)');

    // Cálculo Mensal Necessário
    const monthlyBox = document.getElementById('detailGoalMonthly');
    if (perc === 100) {
        monthlyBox.innerHTML = `🎉 Você atingiu o alvo! Parabéns!`;
        monthlyBox.style.color = 'var(--color-green)';
    } else if (goal.deadline) {
        const today = new Date();
        const dead = new Date(goal.deadline + '-01');
        let diffMonths = (dead.getFullYear() - today.getFullYear()) * 12 + (dead.getMonth() - today.getMonth());
        
        if (diffMonths <= 0) diffMonths = 1; // Evita divisão por zero
        const monthlyNeeded = remaining / diffMonths;
        
        monthlyBox.innerHTML = `💡 Para atingir o alvo no prazo, você precisa guardar <strong>${formatCurrency(monthlyNeeded)}</strong> por mês.`;
        monthlyBox.style.color = 'var(--color-blue)';
    }

    // Histórico
    const histContainer = document.getElementById('detailGoalHistory');
    histContainer.innerHTML = '';
    if(!goal.history || goal.history.length === 0) {
        histContainer.innerHTML = '<p style="color:var(--text-muted); padding:10px">Nenhuma movimentação registrada.</p>';
    } else {
        const sortedHist = [...goal.history].sort((a,b) => new Date(b.date) - new Date(a.date));
        sortedHist.forEach(h => {
            const isAdd = h.type === 'add';
            histContainer.innerHTML += `
                <div class="history-item">
                    <div>
                        <strong>${isAdd ? 'Depósito' : 'Retirada'}</strong> ${h.obs ? `- ${h.obs}` : ''}<br>
                        <small style="color:var(--text-muted)">${formatDate(h.date)}</small>
                    </div>
                    <strong class="${isAdd ? 'text-green' : 'text-red'}">
                        ${isAdd ? '+' : '-'} ${formatCurrency(h.value)}
                    </strong>
                </div>
            `;
        });
    }

    // Ações botões no detalhe
    document.getElementById('btnAddFundBtn').onclick = () => { closeModal('goalDetailModal'); openFundModal(goal.id, 'add'); };
    document.getElementById('btnRemoveFundBtn').onclick = () => { closeModal('goalDetailModal'); openFundModal(goal.id, 'remove'); };
    document.getElementById('btnDeleteGoalBtn').onclick = () => {
        if(confirm('Excluir este cofrinho permanentemente?')) {
            appState.goals = appState.goals.filter(g => g.id !== goal.id);
            saveData();
            closeModal('goalDetailModal');
            showToast('Cofrinho excluído.');
        }
    };

    openModal('goalDetailModal');
};

const openFundModal = (goalId, type) => {
    document.getElementById('fundGoalId').value = goalId;
    document.getElementById('fundActionType').value = type;
    document.getElementById('fundModalTitle').textContent = type === 'add' ? 'Adicionar Dinheiro' : 'Retirar Dinheiro';
    document.getElementById('fundDate').value = new Date().toISOString().split('T')[0];
    openModal('goalFundModal');
};

document.getElementById('goalFundForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseInt(document.getElementById('fundGoalId').value);
    const type = document.getElementById('fundActionType').value;
    const value = parseFloat(document.getElementById('fundValue').value);
    const date = document.getElementById('fundDate').value;
    const obs = document.getElementById('fundObs').value;

    const goal = appState.goals.find(g => g.id === id);
    if(goal) {
        if(type === 'add') {
            goal.current += value;
        } else {
            if(goal.current < value) {
                alert('Valor de retirada maior que o valor guardado!');
                return;
            }
            goal.current -= value;
        }
        
        goal.history.push({ id: Date.now(), type, value, date, obs });
        
        saveData();
        closeModal('goalFundModal');
        e.target.reset();
        
        // Reabre detalhe atualizado
        openGoalDetail(id);
        showToast('Movimentação registrada!');
    }
});


/* ==================================================
   8. MODAIS, BUSCA E SISTEMA
================================================== */
const openModal = (modalId, type = null) => {
    const modal = document.getElementById(modalId);
    if(modalId === 'transactionModal' && type) {
        document.getElementById('transType').value = type;
        document.getElementById('transactionModalTitle').textContent = type === 'receita' ? 'Nova Receita' : 'Nova Despesa';
        document.getElementById('despesaFields').style.display = type === 'despesa' ? 'block' : 'none';
        document.getElementById('transDate').value = new Date().toISOString().split('T')[0];
        populateCategories();
    }
    modal.classList.add('active');
};

const closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
};

const handleSearch = (val) => {
    const term = val.toLowerCase();
    // Simples filtro global nas tabelas visíveis
    document.querySelectorAll('.data-table tbody tr').forEach(tr => {
        const text = tr.innerText.toLowerCase();
        tr.style.display = text.includes(term) ? '' : 'none';
    });
};

const showToast = (message) => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
};

document.getElementById('btnClearData').addEventListener('click', () => {
    if (confirm("ATENÇÃO: Deseja apagar todos os dados financeiros? Isso não tem volta.")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
});

/* ==================================================
   9. ORQUESTRADOR CENTRAL (Regra 31 e 39)
================================================== */
const updateUI = () => {
    calculateCardLimits(); // REGRA 4 e 5 - Sempre atualiza limites baseados nas despesas antes de renderizar
    renderCards();
    updateDashboard();
    renderTransactionsTables();
    renderGoals();
};

/* ==================================================
   10. PWA SERVICE WORKER
================================================== */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(registration => {
            console.log('PWA ServiceWorker registrado com sucesso: ', registration.scope);
        }).catch(err => {
            console.log('Falha ao registrar PWA ServiceWorker: ', err);
        });
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadData();
    updateUI();
});