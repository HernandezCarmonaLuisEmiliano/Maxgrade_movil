const fs = require('fs');
const path = require('path');

const files = [
  'node_modules/@supabase/supabase-js/dist/index.mjs',
  'node_modules/@supabase/supabase-js/dist/index.cjs',
];

files.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/import\(\/\*.*?\*\/\s*OTEL_PKG\)/gs, 'Promise.resolve(null)');
    content = content.replace(/import\(OTEL_PKG\)/g, 'Promise.resolve(null)');
    fs.writeFileSync(fullPath, content);
    console.log(`Patched: ${filePath}`);
  }
});