const https = require('https');

async function testApi() {
    const steamId = '76561198083896584'; // Example steam id
    const keyId = '56fbaddc-3932-4618-9ed4-11ab806fcd65';
    const secret = '1aab83577662abcdfdc11df2c2d2b7edfeb16f9c6971eab8da9c488900c3fdf7';

    const urls = [
        `https://csrep.gg/api/player/${steamId}`,
        `https://api.csrep.gg/v1/players/${steamId}`,
        `https://csrep.gg/api/v1/players/${steamId}`
    ];

    const headersList = [
        { 'x-api-key': keyId, 'x-api-secret': secret },
        { 'Authorization': `Bearer ${secret}` },
        { 'Authorization': `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}` }
    ];

    for (const urlStr of urls) {
        for (const headers of headersList) {
            console.log(`Testing ${urlStr} with headers:`, Object.keys(headers));
            try {
                const res = await fetch(urlStr, { headers });
                console.log(`Status: ${res.status}`);
                if (res.status === 200) {
                    const data = await res.text();
                    console.log('Success:', data.substring(0, 200));
                }
            } catch (e) {
                console.log('Error:', e.message);
            }
        }
    }
}

testApi();
