import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const copies = [
  {
    from: path.join(root, 'src', 'renderer', 'index.html'),
    to: path.join(root, 'dist', 'renderer', 'index.html')
  },
  {
    from: path.join(root, 'src', 'renderer', 'styles.css'),
    to: path.join(root, 'dist', 'renderer', 'styles.css')
  }
];

for (const item of copies) {
  await mkdir(path.dirname(item.to), { recursive: true });
  await copyFile(item.from, item.to);
}
