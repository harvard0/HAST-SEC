import {readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve, relative, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const folders = ['service', 'web', 'motion', 'hands', 'face', 'retarget', 'training', 'tools'];
const rows = [];
async function scan(folder) {
  const entries = await readdir(resolve(root, folder), {withFileTypes: true});
  entries.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  for (const entry of entries) {
    const path = folder + '/' + entry.name;
    if (entry.isDirectory()) await scan(path);
    else if (entry.name.endsWith('.mjs')) {
      const text = await readFile(resolve(root, path), 'utf8');
      const exports = [];
      for (const [i, line] of text.split(/\r?\n/).entries()) {
        for (const match of line.matchAll(/\bexport\s+(?:async\s+)?(?:function|class|const|let)\s+(\w+)/g)) {
          exports.push('`' + match[1] + ':' + (i + 1) + '`');
        }
        if (/\bexport\s*\{/.test(line)) exports.push('转导出:' + (i + 1));
      }
      rows.push({path, exports: exports.slice(0, 6).join('、') || '模块顶层执行 / 无命名导出'});
    }
  }
}
for (const folder of folders) await scan(folder);
const lines = [
  '---', 'module: dashboard', 'path: .',
  'keywords: [source-index, navigation, exports]', 'tags: [reference, onboarding]',
  'sources:', ...rows.map(row => '  - ' + row.path), '---', '', '# 源码导航', '',
  '由 `node StudyVault/_tools/index-sources.mjs` 按当前源码生成。表中代码路径相对项目根目录；导出符号后的数字为一基行号，每文件最多展示六个导出锚点。此表提供定位，不表示逐行审阅或所有文件都在主链路。', '',
  '共 **' + rows.length + '** 个 ES 模块；先沿 [[系统架构]] 和 [[指令执行链路]] 读当前装配，再按问题深入辅助实现。', ''
];
for (const folder of folders) {
  lines.push('## ' + folder, '', '| 源码路径 | 导出符号与行号 |', '|---|---|');
  for (const row of rows.filter(row => row.path.startsWith(folder + '/'))) {
    lines.push('| `' + row.path + '` | ' + row.exports + ' |');
  }
  lines.push('');
}
lines.push('## Related Notes', '', '- [[学习地图]]', '- [[来源与验证]]', '- [[快速参考]]', '');
const output = resolve(root, 'StudyVault/00-Dashboard/源码导航.md');
await writeFile(output, lines.join('\n'), 'utf8');
console.log('已生成源码导航: ' + rows.length + ' 个模块 -> ' + relative(root, output));
