
const dgram = require('dgram');
const IP = '103.14.27.41';
const PORT = 27272;
const client = dgram.createSocket('udp4');
const getChallenge = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x55, 0xFF, 0xFF, 0xFF, 0xFF]);

client.on('message', (msg) => {
    const type = msg[4];
    if (type === 0x41) {
        const challenge = msg.slice(5, 9);
        const playerQuery = Buffer.concat([Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x55]), challenge]);
        client.send(playerQuery, PORT, IP);
    } else if (type === 0x44) {
        console.log("HEX DATA:", msg.toString('hex'));
        console.log("STRING DATA:", msg.toString('utf8'));
        client.close();
    }
});
client.send(getChallenge, PORT, IP);
setTimeout(() => client.close(), 3000);
