
async function testRanking() {
    try {
        const response = await fetch('http://localhost:3000/api/ranking');
        const data = await response.json();
        console.log('Total players in API response:', data.players?.length);
        if (data.players && data.players.length > 0) {
            console.log('First player:', data.players[0].nickname, 'Rating:', data.players[0].rating);
        } else {
            console.log('Response data:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Error fetching ranking:', error);
    }
}

testRanking();
