
// Revised mock for testing strictly decreasing dates
function simulateStrictDateGeneration(limit, baseDate = '') {
    const startTimestamp = baseDate ? new Date(baseDate).getTime() : Date.now();
    const results = [];
    let cumulativeHours = 0;

    for (let i = 0; i < limit; i++) {
        cumulativeHours += (6 + Math.floor(Math.random() * 12));
        const matchTime = startTimestamp - (cumulativeHours * 3600000);
        results.push(new Date(matchTime).toISOString());
    }
    return results;
}

console.log('Testing Batch 1 (Strictly decreasing):');
const batch1 = simulateStrictDateGeneration(10);
console.log(batch1);

// Verify inner batch sequence
for (let i = 1; i < batch1.length; i++) {
    if (new Date(batch1[i]).getTime() >= new Date(batch1[i - 1]).getTime()) {
        console.error(`FAILED: Non-decreasing sequence found in Batch 1 at index ${i}`);
        process.exit(1);
    }
}
console.log('SUCCESS: Batch 1 is strictly decreasing.');

console.log('\nTesting Batch 2 (Continuity from Batch 1 oldest):');
const oldestInBatch1 = batch1[batch1.length - 1];
const batch2 = simulateStrictDateGeneration(10, oldestInBatch1);
console.log(batch2);

// Verify inner batch sequence
for (let i = 1; i < batch2.length; i++) {
    if (new Date(batch2[i]).getTime() >= new Date(batch2[i - 1]).getTime()) {
        console.error(`FAILED: Non-decreasing sequence found in Batch 2 at index ${i}`);
        process.exit(1);
    }
}
console.log('SUCCESS: Batch 2 is strictly decreasing.');

// Verify continuity
if (new Date(batch2[0]).getTime() >= new Date(oldestInBatch1).getTime()) {
    console.error('FAILED: Batch 2 overlaps with Batch 1!');
    process.exit(1);
}
console.log('\nFINAL SUCCESS: Chronological continuity maintained across all batches.');
