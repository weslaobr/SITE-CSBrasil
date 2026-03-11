import axios from 'axios';

async function checkBot() {
    try {
        const res = await axios.get('http://localhost:3005/pulse');
        console.log(res.data);
    } catch (e: any) {
        console.error("Bot down:", e.message);
    }
}
checkBot();
