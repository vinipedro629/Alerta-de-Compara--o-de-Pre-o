// app.js - Simulação de API
const mockProductPrices = (productId) => {
    // Simula a consulta de preços em 3 "lojas" diferentes
    // O preço base varia para simular mudanças de preço
    const priceVariation = Math.floor(Math.random() * 20); 
    let basePrice = 100 + priceVariation;

    if (productId.includes('fone')) {
        basePrice = 300 + priceVariation;
    } else if (productId.includes('notebook')) {
        basePrice = 2500 - priceVariation * 10;
    }

    // Retorna um objeto com o preço atual (o menor) e as ofertas
    return {
        productName: `Produto - ${productId.toUpperCase()}`,
        currentPrice: basePrice - Math.floor(Math.random() * 10), // Preço atual (menor)
        offers: [
            { store: 'Loja A', price: basePrice },
            { store: 'Loja B', price: basePrice - 5 },
            { store: 'Loja C', price: basePrice + 10 }
        ]
    };
};

// app.js - Persistência
const STORAGE_KEY = 'priceAlerts';

const getAlerts = () => {
    const alerts = localStorage.getItem(STORAGE_KEY);
    return alerts ? JSON.parse(alerts) : [];
};

const saveAlerts = (alerts) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
};

// app.js - Lógica de Alerta
const checkPricesAndAlert = () => {
    const alerts = getAlerts();
    let newAlerts = false;

    const updatedAlerts = alerts.map(alert => {
        // 1. Consulta o preço atual do produto
        const data = mockProductPrices(alert.productId);
        const currentPrice = data.currentPrice;

        // 2. Compara com o preço-alvo
        if (currentPrice < alert.targetPrice && !alert.alertTriggered) {
            // ALERTA DISPARADO!
            alert.alertTriggered = true;
            alert.currentPrice = currentPrice;
            alert.dateTriggered = new Date().toLocaleString();
            newAlerts = true;

            // Alerta visual no frontend
            alert(`🚨 ALERTA DE PREÇO! O preço de ${data.productName} caiu para R$ ${currentPrice.toFixed(2)} (Alvo: R$ ${alert.targetPrice.toFixed(2)})`);
        }
        
        // 3. Registra o preço atual para visualização na tabela
        alert.lastCheckedPrice = currentPrice;

        return alert;
    });

    if (newAlerts) {
        saveAlerts(updatedAlerts);
        renderAlertTable(); // Atualiza a UI
    }
};

// SIMULAÇÃO DE VERIFICAÇÃO PERIÓDICA (a cada 10 segundos)
setInterval(checkPricesAndAlert, 10000);

// app.js - Funções de Renderização
const renderAlertTable = () => {
    const alerts = getAlerts();
    const tbody = document.getElementById('alert-table-body');
    const noAlertsMsg = document.getElementById('no-alerts-msg');
    
    tbody.innerHTML = ''; // Limpa a tabela
    
    if (alerts.length === 0) {
        noAlertsMsg.style.display = 'block';
        return;
    }

    noAlertsMsg.style.display = 'none';

    alerts.forEach(alert => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${alert.productId}</td>
            <td>R$ ${alert.targetPrice.toFixed(2)}</td>
            <td>R$ ${alert.lastCheckedPrice ? alert.lastCheckedPrice.toFixed(2) : 'Aguardando'}</td>
            <td>
                <span class="status-badge ${alert.alertTriggered ? 'alert-active' : 'alert-watching'}">
                    ${alert.alertTriggered ? `ALERTA! (${alert.dateTriggered})` : 'Monitorando'}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
};

// app.js - Lógica do Formulário
document.getElementById('alert-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('product-id').value.trim().toLowerCase();
    const targetPrice = parseFloat(document.getElementById('target-price').value);

    if (productId && targetPrice > 0) {
        const alerts = getAlerts();
        
        // CUIDADO PLENO: Checar se o alerta já existe para não duplicar.
        if (alerts.find(a => a.productId === productId)) {
            alert('Este produto já está sendo monitorado!');
            return;
        }

        alerts.push({
            id: Date.now(),
            productId: productId,
            targetPrice: targetPrice,
            alertTriggered: false,
            lastCheckedPrice: null
        });

        saveAlerts(alerts);
        renderAlertTable();
        
        // Opcional: Aciona a primeira checagem imediatamente
        checkPricesAndAlert(); 
        
        // Limpa o formulário
        e.target.reset(); 
    }
});

// Inicializa a tabela ao carregar a página
document.addEventListener('DOMContentLoaded', renderAlertTable);