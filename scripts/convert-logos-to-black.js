const fs = require('fs');
const path = require('path');

const logosDir = path.join(process.cwd(), 'public', 'logos');

// 1. ministry-commerce.svg
const mcPath = path.join(logosDir, 'ministry-commerce.svg');
let mc = fs.readFileSync(mcPath, 'utf8');
mc = mc.replace(/fill="#FFFFFF"/g, 'fill="#000000"');
fs.writeFileSync(mcPath, mc);
console.log('Updated ministry-commerce.svg');

// 2. msme.svg
const msmePath = path.join(logosDir, 'msme.svg');
let msme = fs.readFileSync(msmePath, 'utf8');
msme = msme.replace(/fill="#FFFFFF"/g, 'fill="#000000"');
fs.writeFileSync(msmePath, msme);
console.log('Updated msme.svg');

// 3. gst.svg
const gstPath = path.join(logosDir, 'gst.svg');
let gst = fs.readFileSync(gstPath, 'utf8');
gst = gst.replace(/fill="#FFFFFF"/g, 'fill="#000000"');
fs.writeFileSync(gstPath, gst);
console.log('Updated gst.svg');

// 4. digital-india.svg
const diPath = path.join(logosDir, 'digital-india.svg');
let di = fs.readFileSync(diPath, 'utf8');
di = di.replace(/fill="#FFFFFF"/g, 'fill="#000000"');
fs.writeFileSync(diPath, di);
console.log('Updated digital-india.svg');

// 5. gem-logo.svg
const gemPath = path.join(logosDir, 'gem-logo.svg');
let gem = fs.readFileSync(gemPath, 'utf8');
gem = gem.replace(/\.st0\{fill:#fff;\}/g, '.st0{fill:#000000;}');
gem = gem.replace(/\.st8\{opacity:0\.3;fill-rule:evenodd;clip-rule:evenodd;fill:#FFFFFF;enable-background:new    ;\}/g, '.st8{opacity:0.3;fill-rule:evenodd;clip-rule:evenodd;fill:#000000;enable-background:new;}');
gem = gem.replace(/\.st9\{fill:#fff;\}/g, '.st9{fill:#000000;}');
gem = gem.replace(/\.st10\{fill:#fff;stroke:#fff;stroke-width:0\.25;stroke-miterlimit:10;\}/g, '.st10{fill:#000000;stroke:#000000;stroke-width:0.25;stroke-miterlimit:10;}');
fs.writeFileSync(gemPath, gem);
console.log('Updated gem-logo.svg');
