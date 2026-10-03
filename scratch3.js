const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const doorMatch = html.match(/const BASE_DOORS = \{([\s\S]*?)\};/);
let doorsStr = '{' + doorMatch[1].replace(/([a-zA-Z0-9_]+):/g, '"$1":') + '}';
doorsStr = doorsStr.replace(/"(https?|url)"/g, '$1'); // fix for 'fill:"url(...)"' if it exists, actually doors don't have this.
// fix for `name:"..."` which is already quoted, but wait, `name:` becomes `"name":` which is fine.
const BASE_DOORS = eval('(' + doorMatch[1] + ')');

const ffDoorsMatch = html.match(/const FF_NEW_DOORS = \{([\s\S]*?)\};/);
const FF_NEW_DOORS = eval('(' + ffDoorsMatch[1] + ')');

const sfDoorsMatch = html.match(/const SF_DOORS = \{([\s\S]*?)\};/);
const SF_DOORS = eval('(' + sfDoorsMatch[1] + ')');

let ROOMS = {};
const regex = /<g[^>]+data-id="([^"]+)"[^>]*>.*?<rect[^>]+x="([^"]+)"[^>]+y="([^"]+)"[^>]+width="([^"]+)"[^>]+height="([^"]+)"/g;
let match;
while ((match = regex.exec(html)) !== null) {
    ROOMS[match[1]] = {
        x: parseFloat(match[2]),
        y: parseFloat(match[3]),
        w: parseFloat(match[4]),
        h: parseFloat(match[5]),
        floor: match[1].endsWith('_SF') || match[1] === 'seminarHall120' || match[1] === 'cadCenter81' ? 2 : (match[1].endsWith('_FF') ? 1 : 0)
    };
}
ROOMS['seminarHall120'].floor = 2;
ROOMS['cadCenter81'].floor = 2;

const DOORS = {...BASE_DOORS, ...FF_NEW_DOORS, ...SF_DOORS};

const SPINE_VERT_WEST = 472.5;
const SPINE_VERT_CENTER = 756;
const SPINE_VERT_EAST = 1038.5;
const SPINE_VERT_FAR_EAST = 1325;
const SPINE_HORIZ_TOP = 271;
const SPINE_HORIZ_BOT = 497;
const SPINE_HORIZ_EAST_BOT = 496.25;

function getIntraFloorPath(r1, d1, r2, d2) {
    let path = [{x: r1.x + r1.w/2, y: r1.y + r1.h/2}, d1];
    let getSpineX = (p) => { if (p.x < 756) return SPINE_VERT_WEST; if (p.x >= 1400 && p.y > 500) return SPINE_VERT_FAR_EAST; return SPINE_VERT_EAST; };
    let vx1 = getSpineX(d1); let vx2 = getSpineX(d2);
    let crossesVoid = (r1.floor === 2) && (Math.min(vx1, vx2) < 756 && Math.max(vx1, vx2) > 756);
    if (vx1 !== vx2 && vx1 !== SPINE_VERT_FAR_EAST && vx2 !== SPINE_VERT_FAR_EAST) {
        if (crossesVoid && d1.y > 350 && d2.y > 350) {
            // do not force vx1=vx2, route around void
        } else if (crossesVoid && (d1.y > 350 || d2.y > 350)) {
            if (d1.y > 350) vx2 = vx1; else vx1 = vx2;
        } else {
            let c1 = Math.abs(d1.x - vx1) + Math.abs(d2.x - vx1); 
            let c2 = Math.abs(d1.x - vx2) + Math.abs(d2.x - vx2); 
            if (c1 <= c2) vx2 = vx1; else vx1 = vx2; 
        }
    }
    let p1 = d1; let p2 = d2; let midNodes1 = []; let midNodes2 = [];

    if(p1.y === 497) { midNodes1.push({x: vx1, y: 497}); p1 = {x: vx1, y: 497}; }
    if(p2.y === 497) { midNodes2.unshift({x: vx2, y: 497}); p2 = {x: vx2, y: 497}; }

    if(vx1 === SPINE_VERT_FAR_EAST && vx2 !== SPINE_VERT_FAR_EAST){ midNodes1.push({x: SPINE_VERT_FAR_EAST, y: SPINE_HORIZ_EAST_BOT}); p1 = {x: SPINE_VERT_EAST, y: SPINE_HORIZ_EAST_BOT}; midNodes1.push(p1); vx1 = SPINE_VERT_EAST; }
    if(vx2 === SPINE_VERT_FAR_EAST && vx1 !== SPINE_VERT_FAR_EAST){ midNodes2.unshift({x: SPINE_VERT_FAR_EAST, y: SPINE_HORIZ_EAST_BOT}); p2 = {x: SPINE_VERT_EAST, y: SPINE_HORIZ_EAST_BOT}; midNodes2.unshift(p2); vx2 = SPINE_VERT_EAST; }
    let costMain = Math.abs(p1.y - SPINE_HORIZ_BOT) + Math.abs(p2.y - SPINE_HORIZ_BOT); let costSec = Math.abs(p1.y - SPINE_HORIZ_TOP) + Math.abs(p2.y - SPINE_HORIZ_TOP); let crossingSpineY = (costSec < costMain) ? SPINE_HORIZ_TOP : SPINE_HORIZ_BOT;
    if(p1.y < 460 && p2.y < 460) crossingSpineY = 293; 
    if(vx1 >= SPINE_VERT_EAST && vx2 >= SPINE_VERT_EAST && p1.y > 350 && p2.y > 350){ crossingSpineY = SPINE_HORIZ_EAST_BOT; }
    if(crossesVoid) crossingSpineY = 271;
    path.push(...midNodes1);
    let canBypassVx = (vx1 === vx2) && (Math.abs(p1.y - crossingSpineY) <= 200) && (Math.abs(p2.y - crossingSpineY) <= 200) && (Math.abs(p1.y - p2.y) <= 25);
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

let r1 = ROOMS['cadCenter81'];
let d1 = DOORS['cadCenter81'] || {x: r1.x + r1.w/2, y: r1.y + r1.h/2};
let r2 = ROOMS['seminarHall120'];
let d2 = DOORS['seminarHall120'] || {x: r2.x + r2.w/2, y: r2.y + r2.h/2};

let path = getIntraFloorPath(r1, d1, r2, d2);
console.log("Path CAD to Seminar:");
path.forEach(p => console.log(`(${p.x}, ${p.y})`));

