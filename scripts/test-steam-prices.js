// Script de teste para validar a nova integração com a Steam Market
const { getItemPrice } = require('../src/services/price-service');

async function test() {
    console.log('--- Testando Nova Integração de Preços (Steam Direct) ---');
    
    const itemsToTest = [
        'AK-47 | Slate (Field-Tested)',
        'StatTrak™ Glock-18 | Block-18 (Minimal Wear)',
        '★ Talon Knife | Scorched (Field-Tested)'
    ];

    for (const item of itemsToTest) {
        console.log(`Buscando preço para: "${item}"...`);
        const price = await getItemPrice(item);
        if (price !== null) {
            console.log(`✅ Sucesso! Preço: R$ ${price.toFixed(2)}`);
        } else {
            console.log(`❌ Falha ao obter preço.`);
        }
    }
}

test();
