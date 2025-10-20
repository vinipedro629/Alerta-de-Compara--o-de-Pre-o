// app.js

const STORAGE_KEY = 'priceAlerts';

// --- 1. Funções de Persistência (LocalStorage) ---

const getAlerts = () => {
    const alerts = localStorage.getItem(STORAGE_KEY);
    return alerts ? JSON.parse(alerts) : [];
};

const saveAlerts = (alerts) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
};

// --- 2. Funções de Simulação (O core Pleno) ---

// Função que extrai uma chave única da URL para usar na simulação
const extractProductId = (url) => {
    try {
        const urlObj = new URL(url);
        // Tenta extrair a última parte do pathname (ex: "produto-x")
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        const uniqueId = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'default-product';
        
        // Limpeza básica para garantir que o ID seja seguro para o mock
        return uniqueId.toLowerCase().replace(/[^a-z0-9-]/g, ''); 
    } catch (e) {
        console.error("URL inválida:", e);
        return 'default-product';
    }
};

// Função que SIMULA a consulta à API, retornando um preço
const mockProductPrices = (extractedId) => {
    let basePrice;
    let productName;
    const priceVariation = Math.floor(Math.random() * 20); 

    // Lógica para simular diferentes preços baseados no ID extraído
    if (extractedId.includes('ps5') || extractedId.includes('console')) {
        basePrice = 3500 + (priceVariation * 5) - 50;
        productName = "Console PS5 Digital (Simulado)";
    } else if (extractedId.includes('notebook')) {
        basePrice = 2800 + (priceVariation * 10);
        productName = "Notebook Gamer X (Simulado)";
    } else {
        basePrice = 150 + priceVariation;
        productName = extractedId.replace(/-/g, ' ').toUpperCase();
    }

    // O preço atual é o preço base menos uma queda aleatória
    const currentPrice = basePrice - Math.floor(Math.random() * 10) - (priceVariation * 0.5); 
    
    return {
        productName: productName,
        currentPrice: Math.max(10, currentPrice) // Garante que o preço não seja negativo
    };
};

// --- 3. Lógica de Comparação e Alerta (O Agendador Simulado) ---

const checkPricesAndAlert = () => {
    const alerts = getAlerts();
    let uiNeedsUpdate = false;

    const updatedAlerts = alerts.map(alert => {
        // 1. Consulta o preço atual do produto usando o ID extraído
        const data = mockProductPrices(alert.productId);
        const currentPrice = data.currentPrice;

        // 2. Compara com o preço-alvo e verifica se já foi alertado
        if (currentPrice < alert.targetPrice && !alert.alertTriggered) {
            
            // ALERTA DISPARADO!
            alert.alertTriggered = true;
            alert.currentPrice = currentPrice;
            alert.dateTriggered = new Date().toLocaleString('pt-BR');
            uiNeedsUpdate = true;

            // Alerta visual de notificação (substituiria uma notificação push real)
            alert(`🚨 ALERTA DE PREÇO! O preço de ${data.productName} na URL ${alert.productUrl} caiu para R$ ${currentPrice.toFixed(2)} (Alvo: R$ ${alert.targetPrice.toFixed(2)})`);
        }
        
        // 3. Registra o preço atual para visualização na tabela
        alert.lastCheckedPrice = currentPrice;

        return alert;
    });

    if (uiNeedsUpdate || alerts.some(a => a.lastCheckedPrice === null)) {
        saveAlerts(updatedAlerts);
        renderAlertTable(); // Atualiza a UI se houver mudança ou se for a primeira checagem
    }
};

// SIMULAÇÃO DE VERIFICAÇÃO PERIÓDICA (a cada 10 segundos)
// Em um sistema real, isso seria um cron job no servidor, não no navegador.
setInterval(checkPricesAndAlert, 10000); 

// --- 4. Renderização (UI) ---

const renderAlertTable = () => {
    const alerts = getAlerts();
    const tbody = document.getElementById('alert-table-body');
    const noAlertsMsg = document.getElementById('no-alerts-msg');
    
    tbody.innerHTML = ''; 

    if (alerts.length === 0) {
        if (noAlertsMsg) noAlertsMsg.style.display = 'block';
        return;
    }

    if (noAlertsMsg) noAlertsMsg.style.display = 'none';

    alerts.forEach(alert => {
        const row = document.createElement('tr');
        
        const priceDisplay = alert.lastCheckedPrice 
            ? `R$ ${alert.lastCheckedPrice.toFixed(2)}` 
            : 'Aguardando...';
        
        const statusClass = alert.alertTriggered ? 'alert-active' : 'alert-watching';
        const statusText = alert.alertTriggered ? `ALERTA ATIVO (${alert.dateTriggered.split(',')[0]})` : 'Monitorando';

        row.innerHTML = `
            <td>
                <a href="${alert.productUrl}" target="_blank" title="${alert.productUrl}">
                    ${alert.productId.substring(0, 30)}${alert.productId.length > 30 ? '...' : ''}
                </a>
            </td>
            <td>R$ ${alert.targetPrice.toFixed(2)}</td>
            <td>${priceDisplay}</td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
};

// --- 5. Lógica do Evento de Cadastro ---

const addNewAlert = (productId, targetPrice, productUrl) => {
    const alerts = getAlerts();
    
    if (alerts.find(a => a.productId === productId)) {
        alert('Este produto já está sendo monitorado! (ID extraído da URL já em uso)');
        return;
    }

    alerts.push({
        id: Date.now(),
        productId: productId,
        targetPrice: targetPrice,
        productUrl: productUrl, 
        alertTriggered: false,
        lastCheckedPrice: null
    });

    saveAlerts(alerts);
    renderAlertTable(); 
    checkPricesAndAlert(); // Aciona a primeira checagem de preço imediatamente
};


document.addEventListener('DOMContentLoaded', () => {
    // Inicializa a tabela ao carregar
    renderAlertTable();
    
    // Configura o Listener do formulário
    document.getElementById('alert-form').addEventListener('submit', (e) => {
        e.preventDefault(); 
        
        const productUrl = document.getElementById('product-url').value.trim();
        const targetPrice = parseFloat(document.getElementById('target-price').value);

        const productId = extractProductId(productUrl);

        if (productUrl && targetPrice > 0) {
            addNewAlert(productId, targetPrice, productUrl); 
            e.target.reset(); 
        } else {
            alert('Por favor, preencha a URL e um Preço Alvo válido.');
        }
    });

    // Inicia a primeira checagem de preço para preencher os valores "Aguardando"
    checkPricesAndAlert();
});