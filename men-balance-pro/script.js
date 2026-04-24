// =====================================================================
// ⚙️ CONFIGURAÇÕES PRINCIPAIS (Altere apenas os valores aqui)
// =====================================================================

const CONFIG = {
    // ⏱️ Tempo de Delay: Formato "Minutos:Segundos"
    // Exemplo: "48:55", "12:00" ou "00:15"
    tempoDeDelay: "00:01",

    // 🔗 Links de Checkout dos Botões (Men Balance Pro)
    // SUBSTITUIR o domínio YOUR-DOMAIN.com pelo domínio real onde a página
    // estará hospedada (normalmente o mesmo domínio que resolve a rota /b).
    // O placeholder {subid} será resolvido com o melhor identificador disponível
    // (sub_id > subid > fbclid > gclid > ttclid > vazio)
    linkPote2: "https://YOUR-DOMAIN.com/b?p=MBP2V1&nc=1&preview=1&b=123&pg=9382&template=2b&subid={subid}",
    linkPote6: "https://YOUR-DOMAIN.com/b?p=MBP6V1&nc=1&preview=1&b=123&pg=9382&template=6b&subid={subid}",
    linkPote3: "https://YOUR-DOMAIN.com/b?p=MBP3V1&nc=1&preview=1&b=123&pg=9382&template=3b&subid={subid}"
};

// =====================================================================
// 💻 CÓDIGO DO SISTEMA (Não precisa alterar nada daqui para baixo)
// =====================================================================

// ---------------------------------------------------------------------
// UTM / Tracking Passthrough
// ---------------------------------------------------------------------
// Lista de parâmetros de tracking que serão propagados pro checkout.
const TRACKING_PARAM_KEYS = [
    // UTMs padrão
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id',
    // Click IDs das plataformas de ads
    'fbclid', 'gclid', 'ttclid', 'li_fat_id', 'msclkid', 'twclid', 'epik', 'wbraid', 'gbraid',
    // Affiliate / Sub IDs
    'sub_id', 'subid', 'sub1', 'sub2', 'sub3', 'sub4', 'sub5',
    'click_id', 'clickid', 'cid',
    // UTMify
    'xcod', 'sck',
    // Facebook extras
    'fb_ad_id', 'fb_adset_id', 'fb_campaign_id',
    // Genéricos
    'src', 'source', 'ref'
];

// Captura TODOS os tracking params da URL atual (+ qualquer utm_* custom)
function getIncomingTrackingParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};

    // Pegar params conhecidos
    TRACKING_PARAM_KEYS.forEach(function(key) {
        const val = params.get(key);
        if (val) result[key] = val;
    });

    // Pegar QUALQUER param que comece com utm_ (para suportar utm_* customizados)
    params.forEach(function(value, key) {
        if (key.indexOf('utm_') === 0 && !result[key] && value) {
            result[key] = value;
        }
    });

    return result;
}

// Resolve o link base: substitui {subid} + anexa UTMs/click IDs
function resolveCheckoutUrl(baseUrl, incoming) {
    // 1) Resolver placeholder {subid} — prioridade: sub_id > subid > fbclid > gclid > ttclid
    const subidValue = incoming.sub_id
                    || incoming.subid
                    || incoming.fbclid
                    || incoming.gclid
                    || incoming.ttclid
                    || '';

    let url = baseUrl.replace(/\{subid\}/g, encodeURIComponent(subidValue));

    // 2) Limpar quaisquer outros placeholders não resolvidos (defensivo)
    url = url.replace(/\{[^}]+\}/g, '');

    // 3) Anexar tracking params que AINDA não existem no URL base
    try {
        const urlObj = new URL(url);
        Object.keys(incoming).forEach(function(key) {
            const val = incoming[key];
            if (val && !urlObj.searchParams.has(key)) {
                urlObj.searchParams.set(key, val);
            }
        });
        return urlObj.toString();
    } catch (e) {
        // Se URL malformada, retorna como está
        return url;
    }
}

// Vincula link + listener de clique (que reconstrói no momento do click)
function attachCheckoutLink(elementId, baseUrl) {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Guarda o template base no próprio elemento (fonte da verdade)
    element.dataset.checkoutTemplate = baseUrl;

    // Aplica o href inicial (já resolvido com UTMs da URL atual)
    const initialParams = getIncomingTrackingParams();
    element.href = resolveCheckoutUrl(baseUrl, initialParams);

    // No click, RECONSTRÓI na hora — garante que mudanças posteriores
    // na URL (ex: utmify reescreve, redirects internos) sejam respeitadas.
    element.addEventListener('click', function() {
        const freshParams = getIncomingTrackingParams();
        this.href = resolveCheckoutUrl(this.dataset.checkoutTemplate, freshParams);
    });
}

// ---------------------------------------------------------------------
// DOM Ready
// ---------------------------------------------------------------------
// IMPORTANTE: este script é carregado de forma lazy pelo index.html (após
// 20s, scroll ou click). Quando ele finalmente roda, o DOMContentLoaded
// já disparou — então usamos um wrapper que executa imediatamente se o
// DOM já estiver pronto, ou agenda para quando ficar pronto.
function onDomReady(callback) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', callback);
    } else {
        callback();
    }
}

onDomReady(function() {

    // 1. APLICAR LINKS DE CHECKOUT (com UTM passthrough + resolução de {subid})
    attachCheckoutLink('card-2-bottles', CONFIG.linkPote2);
    attachCheckoutLink('card-6-bottles', CONFIG.linkPote6);
    attachCheckoutLink('card-3-bottles', CONFIG.linkPote3);

    // 2. SISTEMA DE DELAY DA OFERTA E NOTIFICAÇÕES
    function calcularDelayEmMilissegundos(tempoStr) {
        const partes = tempoStr.split(':');
        const minutos = parseInt(partes[0], 10) || 0;
        const segundos = parseInt(partes[1], 10) || 0;
        const totalSegundos = (minutos * 60) + segundos;
        return totalSegundos * 1000;
    }

    // O QUE ESTÁ AQUI DENTRO SÓ ACONTECE APÓS O TEMPO DO DELAY
    setTimeout(() => {
        // A. Revela a área com os botões e garantia
        document.querySelector('.video-cta-container').style.display = 'block';

        // B. Inicia os pop-ups de vendas falsas apenas agora!
        startAllNotifications();

    }, calcularDelayEmMilissegundos(CONFIG.tempoDeDelay));


    // 3. SISTEMA DO CONTADOR DE PESSOAS ASSISTINDO (Roda desde o início)
    function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1) + min); }
    function updateCounter() {
        var currentCount = parseInt(document.getElementById('viewsCount').textContent.replace(/,/g, ''), 10);
        var increment = getRandomInt(1, 5);
        var nextCount = currentCount + increment;
        document.getElementById('viewsCount').textContent = nextCount.toLocaleString('en-US');
        var nextDelay = getRandomInt(1500, 3000);
        setTimeout(updateCounter, nextDelay);
    }
    document.getElementById('viewsCount').textContent = '71,712';
    updateCounter();


    // 4. SISTEMA DE NOTIFICAÇÕES FALSAS DE COMPRA (POP-UPS)
    const customerNames = ["Olivia", "Emma", "Ava", "Charlotte", "Sophia", "Amelia", "Isabella", "Mia", "Evelyn", "Harper", "Camila", "Gianna", "Abigail", "Luna", "Ella", "Elizabeth", "Sofia", "Emily", "Avery", "Mila", "Liam", "Noah", "Oliver", "Elijah", "William", "James", "Benjamin", "Lucas", "Henry", "Alexander"];
    const states = [
        {"name": "Alabama", "abbreviation": "al"}, {"name": "Alaska", "abbreviation": "ak"}, {"name": "Arizona", "abbreviation": "az"}, {"name": "Arkansas", "abbreviation": "ar"}, {"name": "California", "abbreviation": "ca"}, {"name": "Colorado", "abbreviation": "co"}, {"name": "Florida", "abbreviation": "fl"}, {"name": "Georgia", "abbreviation": "ga"}, {"name": "Hawaii", "abbreviation": "hi"}, {"name": "Illinois", "abbreviation": "il"}, {"name": "Texas", "abbreviation": "tx"}, {"name": "New York", "abbreviation": "ny"}
    ];
    const productNames = ["2 Bottles of Men Balance Pro", "3 Bottles of Men Balance Pro", "6 Bottles of Men Balance Pro"];

    function startAllNotifications() {
        const purchaseNotification = document.getElementById('purchase-notification');

        function updateNotificationContent(name, location, product, image) {
            purchaseNotification.querySelector('.customer-name').textContent = name;
            purchaseNotification.querySelector('.customer-location').textContent = location;
            purchaseNotification.querySelector('.product-name').textContent = product;
            purchaseNotification.querySelector('.profile-image').src = image;
        }

        function showNotification() {
            const name = customerNames[Math.floor(Math.random() * customerNames.length)];
            const state = states[Math.floor(Math.random() * states.length)];
            const product = productNames[Math.floor(Math.random() * productNames.length)];
            const image = `images/flags/us-${state.abbreviation}.png`;

            updateNotificationContent(name, state.name, product, image);

            setTimeout(() => {
                purchaseNotification.classList.add('show');
                setTimeout(() => {
                    purchaseNotification.classList.remove('show');
                    purchaseNotification.classList.add('hide');
                    setTimeout(() => purchaseNotification.classList.remove('hide'), 500);
                }, 10000); // Fica na tela por 10 segundos
            }, 500);
        }

        function startRandomInterval() {
            setTimeout(() => {
                showNotification();
                startRandomInterval();
            }, Math.random() * (30000 - 10000) + 11000); // Próximas demoram entre 11s e 30s
        }

        // Mostra a primeira notificação 2 segundos APÓS os botões aparecerem
        setTimeout(() => {
            showNotification();
            startRandomInterval();
        }, 2000);
    }
});
