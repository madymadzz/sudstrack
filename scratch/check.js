const fs = require('fs');
const text = fs.readFileSync('js/pages/orders.js', 'utf8');
console.log('{', text.split('{').length - 1);
console.log('}', text.split('}').length - 1);
console.log('(', text.split('(').length - 1);
console.log(')', text.split(')').length - 1);
console.log('`', text.split('`').length - 1);
