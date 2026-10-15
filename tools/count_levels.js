const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'assets', 'app');
const files = fs.readdirSync(dir).filter(f => f.startsWith('game-') && f.endsWith('.js'));

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  const m = content.match(/createCampaign\(\s*\{[\s\S]*?levels:\s*([a-zA-Z0-9_$]+)/);
  if (m) {
    const varName = m[1];
    const re = new RegExp('(?:var|const|let)\\s+' + varName + '\\s*=\\s*\\[([\\s\\S]*?)\\n  \\];', 'm');
    const mDef = content.match(re);
    if (mDef) {
      const ids = Array.from(mDef[1].matchAll(/id:\s*"([^"]+)"/g)).map(x => x[1]);
      if (ids.length > 0) {
        console.log(`${ids.length}\t${file}\t(${varName}): ${ids.join(', ')}`);
      }
    }
  }
}
