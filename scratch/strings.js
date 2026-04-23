const fs = require('fs');

const data = fs.readFileSync('scratch/GameModeManager.dll');
let currentString = '';
const strings = [];

for (let i = 0; i < data.length; i++) {
    const char = data[i];
    if (char >= 32 && char <= 126) {
        currentString += String.fromCharCode(char);
    } else {
        if (currentString.length >= 4) {
            strings.push(currentString);
        }
        currentString = '';
    }
}
if (currentString.length >= 4) strings.push(currentString);

fs.writeFileSync('scratch/strings.txt', strings.join('\n'));
console.log("Done extracting strings.");
