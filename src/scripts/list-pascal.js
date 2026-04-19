const fs = require('fs');
const file = 'e:/Github/SITE-CSBrasil/src/components/dashboard/matches-dashboard.tsx';
const content = fs.readFileSync(file, 'utf8');

const matches = content.match(/[A-Z][a-zA-Z0-9]+/g);
const unique = new Set(matches);
console.log(Array.from(unique).sort().join(', '));
