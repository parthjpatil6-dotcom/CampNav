const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const doorMatch = html.match(/const BASE_DOORS = \{([\s\S]*?)\};/);
let doorsStr = '{' + doorMatch[1].replace(/([a-zA-Z0-9_]+):/g, '"$1":') + '}';
doorsStr = doorsStr.replace(/([a-zA-Z0-9_]+)([a-zA-Z0-9_]+)/g, '$1 $2');
const BASE_DOORS = eval('(' + doorMatch[1] + ')');

const ffDoorsMatch = html.match(/const FF_NEW_DOORS = \{([\s\S]*?)\};/);
const FF_NEW_DOORS = eval('(' + ffDoorsMatch[1] + ')');

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

const DOORS = {...BASE_DOORS, ...FF_NEW_DOORS};

const SPINE_VERT_WEST = 472.5;
const SPINE_VERT_CENTER = 756;
const SPINE_VERT_EAST = 1038.5;
const SPINE_VERT_FAR_EAST = 1325;
const SPINE_HORIZ_TOP = 271;
const SPINE_HORIZ_BOT = 497;
const SPINE_HORIZ_EAST_BOT = 496.25;

function getIntraFloorPath(r1, d1, r2, d2) {
    let path = [{x: r1.x + r1.w/2, y: r1.y + r1.h/2}, d1];
    let getSpineX = (p) => { if (p.x === 612.5 && p.y === 497) return SPINE_VERT_WEST; if (p.x === 882 && p.y === 497) return SPINE_VERT_EAST; if (p.x < 600) return SPINE_VERT_WEST; if (p.x >= 600 && p.x < 1000) return SPINE_VERT_CENTER; if (p.x >= 1400 && p.y > 500) return SPINE_VERT_FAR_EAST; return SPINE_VERT_EAST; };
    let vx1 = getSpineX(d1); let vx2 = getSpineX(d2);
    if (vx1 !== vx2 && vx1 !== SPINE_VERT_FAR_EAST && vx2 !== SPINE_VERT_FAR_EAST) { let c1 = Math.abs(d1.x - vx1) + Math.abs(d2.x - vx1); let c2 = Math.abs(d1.x - vx2) + Math.abs(d2.x - vx2); if (c1 <= c2) vx2 = vx1; else vx1 = vx2; }
    let p1 = d1; let p2 = d2; let midNodes1 = []; let midNodes2 = [];

    if(p1.y === 497) { midNodes1.push({x: vx1, y: 497}); p1 = {x: vx1, y: 497}; }
    if(p2.y === 497) { midNodes2.unshift({x: vx2, y: 497}); p2 = {x: vx2, y: 497}; }

    if(vx1 === SPINE_VERT_FAR_EAST && vx2 !== SPINE_VERT_FAR_EAST){ midNodes1.push({x: SPINE_VERT_FAR_EAST, y: SPINE_HORIZ_EAST_BOT}); p1 = {x: SPINE_VERT_EAST, y: SPINE_HORIZ_EAST_BOT}; midNodes1.push(p1); vx1 = SPINE_VERT_EAST; }
    if(vx2 === SPINE_VERT_FAR_EAST && vx1 !== SPINE_VERT_FAR_EAST){ midNodes2.unshift({x: SPINE_VERT_FAR_EAST, y: SPINE_HORIZ_EAST_BOT}); p2 = {x: SPINE_VERT_EAST, y: SPINE_HORIZ_EAST_BOT}; midNodes2.unshift(p2); vx2 = SPINE_VERT_EAST; }
    let costMain = Math.abs(p1.y - SPINE_HORIZ_BOT) + Math.abs(p2.y - SPINE_HORIZ_BOT); let costSec = Math.abs(p1.y - SPINE_HORIZ_TOP) + Math.abs(p2.y - SPINE_HORIZ_TOP); let crossingSpineY = (costSec < costMain) ? SPINE_HORIZ_TOP : SPINE_HORIZ_BOT;
    if(p1.y < 460 && p2.y < 460) crossingSpineY = 293; 
    if(vx1 >= SPINE_VERT_EAST && vx2 >= SPINE_VERT_EAST && p1.y > 350 && p2.y > 350){ crossingSpineY = SPINE_HORIZ_EAST_BOT; }
    path.push(...midNodes1);
    let canBypassVx = (vx1 === vx2) && (Math.abs(p1.y - crossingSpineY) <= 200) && (Math.abs(p2.y - crossingSpineY) <= 200) && (Math.abs(p1.y - p2.y) <= 25);
    console.log("canBypassVx:", canBypassVx);
    if(canBypassVx) {
        let cy = crossingSpineY;
        if (Math.abs(p1.y - 271) < 5 || Math.abs(p1.y - 496) < 5 || Math.abs(p1.y - 522.5) < 5 || Math.abs(p1.y - 293) < 5) cy = p1.y;
        else if (Math.abs(p2.y - 271) < 5 || Math.abs(p2.y - 496) < 5 || Math.abs(p2.y - 522.5) < 5 || Math.abs(p2.y - 293) < 5) cy = p2.y;
        path.push({x: p1.x, y: cy});
        path.push({x: p2.x, y: cy});
    } else if(vx1 === vx2 && (p1.x === vx1 || p2.x === vx2)){ if(p1.x !== vx1) path.push({x: vx1, y: p1.y}); if(p2.x !== vx2) path.push({x: vx2, y: p2.y}); } else { let mid1 = p1, mid2 = p2; if(p1.y !== crossingSpineY){ if(p1.x !== vx1) path.push({x: vx1, y: p1.y}); path.push({x: vx1, y: crossingSpineY}); mid1 = {x: vx1, y: crossingSpineY}; } let tail = []; if(p2.y !== crossingSpineY){ if(p2.x !== vx2) tail.unshift({x: vx2, y: p2.y}); tail.unshift({x: vx2, y: crossingSpineY}); mid2 = {x: vx2, y: crossingSpineY}; } if(mid1.x !== mid2.x) path.push(mid1, mid2); path.push(...tail); }
    path.push(...midNodes2); path.push(d2); path.push({x: r2.x + r2.w/2, y: r2.y + r2.h/2});
    return path.filter((p, i, a) => i === 0 || Math.round(p.x) !== Math.round(a[i-1].x) || Math.round(p.y) !== Math.round(a[i-1].y));
}

let r1 = ROOMS['stair1_FF'];
let d1 = DOORS['stair1_FF'];
let r2 = ROOMS['tut82']; // wait, TUTORIAL-6 is tut82? Or maybe tut76? Let's check DOORS
let d2 = DOORS['tut82'] || {x: 380, y: 522.5}; // fallback
if (!r2) r2 = {x: 366, y: 427, w: 84, h: 92};

let path = getIntraFloorPath(r1, d1, r2, d2);
console.log("Path:", path);
