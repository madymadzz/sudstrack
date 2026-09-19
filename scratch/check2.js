const fs = require('fs');
const text = fs.readFileSync('js/pages/orders.js', 'utf8');
let depth = 0;
let lines = text.split('\n');
for (let i=0; i<lines.length; i++) {
    const line = lines[i];
    for (let j=0; j<line.length; j++) {
        if (line[j] === '{') depth++;
        if (line[j] === '}') depth--;
    }
    // console.log(`Line ${i+1}: depth ${depth}`);
}
console.log("Final depth:", depth);
