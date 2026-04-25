
const dgram = require('dgram');

const IP = '103.14.27.41';
const portsToTest = [27272, 27273, 27274, 27372, 27015];

async function scan() {
    for (const port of portsToTest) {
        console.log(`Testando porta ${port}...`);
        const client = dgram.createSocket('udp4');
        const query = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x54, 0x53, 0x6F, 0x75, 0x72, 0x63, 0x65, 0x20, 0x45, 0x6E, 0x67, 0x69, 0x6E, 0x65, 0x20, 0x51, 0x75, 0x65, 0x72, 0x79, 0x00]);

        const promise = new Promise((resolve) => {
            const timeout = setTimeout(() => {
                client.close();
                resolve(false);
            }, 1500);

            client.on('message', (msg) => {
                clearTimeout(timeout);
                console.log(`RESPOSTA NA PORTA ${port}!`);
                client.close();
                resolve(true);
            });
        });

        client.send(query, port, IP);
        const found = await promise;
        if (found) {
            console.log(`ACHAMOS! A porta de consulta é ${port}`);
            break;
        }
    }
}
scan();
