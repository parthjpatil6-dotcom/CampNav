const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

let ROOMS = {};
const regex = /<g[^>]+data-id="([^"]+)"[^>]*>.*?<rect[^>]+x="([^"]+)"[^>]+y="([^"]+)"[^>]+width="([^"]+)"[^>]+height="([^"]+)"/g;
let match;
while ((match = regex.exec(html)) !== null) {
    ROOMS[match[1]] = {
        x: parseFloat(match[2]),
        y: parseFloat(match[3]),
        w: parseFloat(match[4]),
        h: parseFloat(match[5])
    };
}
console.log('stair1_FF in ROOMS:', ROOMS['stair1_FF']);
console.log('stair1_SF in ROOMS:', ROOMS['stair1_SF']);
console.log('stair1 in ROOMS:', ROOMS['stair1']);

const doorMatch = html.match(/const BASE_DOORS = \{([\s\S]*?)\};/);
const ffDoorsMatch = html.match(/const FF_NEW_DOORS = \{([\s\S]*?)\};/);

console.log("BASE_DOORS length:", doorMatch ? doorMatch[1].length : 0);
console.log("FF_NEW_DOORS length:", ffDoorsMatch ? ffDoorsMatch[1].length : 0);

console.log('stair1_FF door:', FF_NEW_DOORS['stair1_FF']);

