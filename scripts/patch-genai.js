import fs from 'fs';
import path from 'path';

const genaiDir = path.join(process.cwd(), 'node_modules', '@google', 'genai', 'dist');

if (fs.existsSync(genaiDir)) {
  const targetFiles = [
    path.join(genaiDir, 'index.cjs'),
    path.join(genaiDir, 'index.mjs'),
    path.join(genaiDir, 'node', 'index.cjs'),
    path.join(genaiDir, 'node', 'index.mjs'),
    path.join(genaiDir, 'web', 'index.mjs'),
    path.join(genaiDir, 'vertex_internal', 'index.cjs'),
    path.join(genaiDir, 'vertex_internal', 'index.js'),
  ];

  for (const file of targetFiles) {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes("throw new Error('Incomplete JSON segment at the end')")) {
        content = content.replace(
          /throw new Error\(['"]Incomplete JSON segment at the end['"]\);/g,
          "/* Incomplete JSON segment patch */ console.warn('Ignored trailing non-delimited chunk at stream EOF');"
        );
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Successfully patched ${path.relative(process.cwd(), file)}`);
      }
    }
  }
} else {
  console.log('node_modules/@google/genai/dist not found, skipping patch.');
}
