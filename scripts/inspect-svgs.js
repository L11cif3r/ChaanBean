const fs = require('fs');
const path = require('path');

const files = ['gem-logo.svg', 'ministry-commerce.svg', 'msme.svg', 'gst.svg', 'digital-india.svg'];

files.forEach(f => {
  const p = path.join(process.cwd(), 'public', 'logos', f);
  if (!fs.existsSync(p)) return;
  const content = fs.readFileSync(p, 'utf8');
  const fills = Array.from(new Set(content.match(/fill="[^"]+"/g) || []));
  const styles = Array.from(new Set(content.match(/fill:[^;]+;/g) || []));
  console.log('FILE:', f);
  console.log('  fill attributes:', fills);
  console.log('  fill styles:', styles);
});
