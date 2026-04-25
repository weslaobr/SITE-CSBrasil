
const dgram = require('dgram');

const IP = '103.14.27.41';
const PORT = 27272;

const client = dgram.createSocket('udp4');

const getChallenge = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x55, 0xFF, 0xFF, 0xFF, 0xFF]);

console.log("Solicitando desafio (Challenge)...");

client.on('message', (msg) => {
    const type = msg[4];
    console.log("Tipo de resposta:", type.toString(16));

    if (type === 0x41) { // S2C_CHALLENGE
        const challenge = msg.slice(5, 9);
        console.log("Desafio recebido:", challenge.toString('hex'));
        
        const playerQuery = Buffer.concat([
            Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x55]),
            challenge
        ]);
        console.log("Enviando solicitação de jogadores com o desafio...");
        client.send(playerQuery, PORT, IP);
    } else if (type === 0x44) { // S2C_PLAYER
        console.log("LISTA DE JOGADORES RECEBIDA!");
        let offset = 5;
        const count = msg[offset++];
        console.log(`Jogadores detectados: ${count}`);
        
        for (let i = 0; i < count; i++) {
            offset++; // skip index
            let name = "";
            while (msg[offset] !== 0) {
                name += String.fromCharCode(msg[offset++]);
            }
            offset++; // null
            console.log(`- Jogador: ${name}`);
            offset += 8; // skip score and duration
        }
        client.close();
    }
});

client.send(getChallenge, PORT, IP);

setTimeout(() => {
    console.log("Fim do teste (Timeout)");
    client.close();
}, 5000);
