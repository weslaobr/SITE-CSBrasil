
const dgram = require('dgram');

const IP = '103.14.27.41';
const PORT = 27272;

const client = dgram.createSocket('udp4');
const query = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x54, 0x53, 0x6F, 0x75, 0x72, 0x63, 0x65, 0x20, 0x45, 0x6E, 0x67, 0x69, 0x6E, 0x65, 0x20, 0x51, 0x75, 0x65, 0x72, 0x79, 0x00]);

console.log(`Testando consulta A2S_INFO em ${IP}:${PORT}...`);

client.on('message', (msg) => {
    console.log("RESPOSTA RECEBIDA!");
    console.log("Tamanho:", msg.length);
    client.close();
});

client.send(query, PORT, IP, (err) => {
    if (err) console.error("Erro no envio:", err);
});

setTimeout(() => {
    console.log("Timeout: Nenhuma resposta do servidor em 5 segundos.");
    client.close();
}, 5000);
