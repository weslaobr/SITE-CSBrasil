const axios = require('axios');

async function test() {
    // Test awesomeapi
    const r1 = await axios.get('https://economia.awesomeapi.com.br/json/last/USD-BRL', { timeout: 8000 });
    console.log('AwesomeAPI:', JSON.stringify(r1.data));
    
    // Yesterday's BCB date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const mm = String(yesterday.getMonth()+1).padStart(2,'0');
    const dd = String(yesterday.getDate()).padStart(2,'0');
    const yyyy = yesterday.getFullYear();
    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${mm}-${dd}-${yyyy}'&$format=json`;
    console.log('\nBCB URL:', url);
    const r2 = await axios.get(url, { timeout: 8000 });
    console.log('BCB:', JSON.stringify(r2.data));
}

test().catch(e => console.log('ERR:', e.message));
