
import { NextResponse } from 'next/server';
import dgram from 'dgram';

export async function GET() {
    const IP = '103.14.27.41';
    const PORT = 27272;

    return new Promise((resolve) => {
        const client = dgram.createSocket('udp4');
        let challenge = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);
        
        const timeout = setTimeout(() => {
            client.close();
            resolve(NextResponse.json({ players: [] }));
        }, 4000);

        client.on('message', (msg) => {
            const header = msg.readInt32LE(0);
            const type = msg[4];

            if (type === 0x41) { // S2C_CHALLENGE
                challenge = msg.slice(5, 9);
                const playerQuery = Buffer.concat([
                    Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x55]),
                    challenge
                ]);
                client.send(playerQuery, PORT, IP);
            } else if (type === 0x44) { // S2C_PLAYER
                clearTimeout(timeout);
                client.close();
                
                const players = [];
                let offset = 5;
                const count = msg[offset++];
                
                try {
                    for (let i = 0; i < count; i++) {
                        offset++; // index
                        let name = "";
                        while (msg[offset] !== 0) {
                            name += String.fromCharCode(msg[offset++]);
                        }
                        offset++; // null terminator
                        const score = msg.readInt32LE(offset);
                        offset += 4;
                        const duration = msg.readFloatLE(offset);
                        offset += 4;
                        
                        if (name && name !== "") {
                            players.push({
                                id: i + 1,
                                name: name,
                                ping: Math.floor(duration / 60), // duration in minutes
                                steamId: "Steam Query"
                            });
                        }
                    }
                } catch (e) {}
                
                resolve(NextResponse.json(players));
            }
        });

        // Initial A2S_PLAYER query to get challenge
        const initialQuery = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, 0x55, 0xFF, 0xFF, 0xFF, 0xFF]);
        client.send(initialQuery, PORT, IP);
    });
}
