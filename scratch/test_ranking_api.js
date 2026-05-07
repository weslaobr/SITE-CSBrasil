
async function testRanking() {
    try {
        const res = await fetch('http://localhost:3000/api/ranking');
        console.log('Status:', res.status);
        const data = await res.json();
        console.log('Player count in response:', data.players?.length || data.length || 0);
        if (data.error) console.log('Error:', data.error);
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}
testRanking();
