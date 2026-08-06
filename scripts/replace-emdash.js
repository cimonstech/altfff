const fs = require('fs').promises;
const path = require('path');

const roots = [path.join(__dirname, '..', 'src'), path.join(__dirname, '..', 'public')];
const exts = ['.ts', '.tsx', '.js', '.jsx', '.css', '.md', '.json', '.html'];

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full);
    else if (exts.includes(path.extname(e.name))) {
      let txt = await fs.readFile(full, 'utf8');
      if (txt.includes('\u2014') || txt.includes('-')) {
        const newTxt = txt.replace(/\u2014|-/g, '-');
        await fs.writeFile(full, newTxt, 'utf8');
        console.log('Replaced em-dash in', full);
      }
    }
  }
}

(async () => {
  for (const r of roots) {
    try {
      await walk(r);
    } catch (err) {
      // ignore missing folders
    }
  }
})();
