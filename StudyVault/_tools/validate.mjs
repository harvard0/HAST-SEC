import {readFile, readdir, stat} from 'node:fs/promises';
import {resolve, relative, dirname, basename, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const vault = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(vault, '..');
const notes = [];
const errors = [];
async function scan(folder) {
  for (const entry of await readdir(folder, {withFileTypes: true})) {
    const path = resolve(folder, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) await scan(path);
    else if (entry.isFile() && entry.name.endsWith('.md')) {
      notes.push({path, name: basename(path, '.md'), text: await readFile(path, 'utf8')});
    }
  }
}
await scan(vault);
const map = new Map();
for (const note of notes) {
  if (map.has(note.name)) errors.push('重复笔记名: ' + note.name);
  map.set(note.name, note);
}
const moc = map.get('学习地图');
if (!moc) throw Error('缺少学习地图');
const registryText = moc.text.split('## Tag Index')[1]?.split('## Onboarding Path')[0] ?? '';
const registry = new Set([...registryText.matchAll(/`([a-z][a-z-]*)`/g)].map(m => m[1]));
let links = 0, sourceCount = 0, questionCount = 0;
const referencedSources = new Set();
for (const note of notes) {
  const label = relative(vault, note.path);
  const front = note.text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!front) {errors.push(label + ': 缺少 frontmatter'); continue;}
  for (const field of ['module', 'path', 'keywords', 'tags']) {
    if (!new RegExp('^' + field + ':\\s*\\S+', 'm').test(front)) errors.push(label + ': 缺少 ' + field);
  }
  const path = front.match(/^path:\s*(.+)$/m)?.[1]?.trim();
  if (path) await checkSource(path, label + ' path');
  const tags = front.match(/^tags:\s*\[([^\]]*)\]/m)?.[1]?.split(',').map(v => v.trim()) ?? [];
  if (!tags.length) errors.push(label + ': 标签列表为空或格式不支持');
  for (const tag of tags) {
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(tag) || !registry.has(tag)) errors.push(label + ': 未登记标签 ' + tag);
  }
  const sources = front.match(/^sources:\s*\r?\n((?:[ \t]+- .+(?:\r?\n|$))+)/m)?.[1] ?? '';
  for (const line of sources.split(/\r?\n/).filter(Boolean)) {
    const source = line.replace(/^\s*-\s*/, '').trim();
    await checkSource(source, label);
    referencedSources.add(source);
    sourceCount++;
  }
  if (!/^## Related Notes\s*$/m.test(note.text)) errors.push(label + ': 缺少 Related Notes');
  for (const match of note.text.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const target = match[1].split('|')[0].split('#')[0];
    if (target && !map.has(target)) errors.push(label + ': 无法解析双向链接 ' + target);
    links++;
  }
  if (/(?:^|[\s`(])[A-Za-z]:[\\/]|file:\/\//m.test(note.text)) errors.push(label + ': 包含绝对文件路径');
  const fences = note.text.split(/\r?\n/).filter(line => /^```/.test(line)).length;
  if (fences % 2) errors.push(label + ': 代码围栏未闭合');
  if (label.startsWith('10-Exercises')) {
    const questions = (note.text.match(/^## 练习 \d+ — /gm) ?? []).length;
    const answers = (note.text.match(/^> \[!answer\]- 查看答案\s*$/gm) ?? []).length;
    if (questions < 5 || questions !== answers) errors.push(label + ': 至少五题且每题应有折叠答案');
    for (const type of ['trace', 'config', 'debug', 'extend', 'analysis']) {
      if (!note.text.includes('[' + type + ']')) errors.push(label + ': 缺少题型 ' + type);
    }
    if (!note.text.includes('## Related Modules')) errors.push(label + ': 缺少关联模块');
    questionCount += questions;
  }
}
async function checkSource(path, label) {
  const target = resolve(root, path), rel = relative(root, target);
  if (isAbsolute(path) || isAbsolute(rel) || rel === '..' || rel.startsWith('../') || rel.startsWith('..\\')) {
    errors.push(label + ': 路径越出项目 ' + path); return;
  }
  try {await stat(target);} catch {errors.push(label + ': 路径不存在 ' + path);}
}
const moduleExercises = {
  '本地服务': '服务端练习', '中文意图与进程': '中文模型练习', '页面与对话': '前端练习',
  '动作策略与轨道': '动作策略练习', '姿态约束与求解': '姿态求解练习',
  '角色骨架与旋转': '角色与手臂练习', '面部表情': '表情练习',
  '模型资源与运行时': '资源与运行时练习', '安装配置与检查': '工程运行练习'
};
for (const [name, exercise] of Object.entries(moduleExercises)) {
  const note = map.get(name), practice = map.get(exercise);
  if (!note || !practice) {errors.push('缺少模块或练习: ' + name); continue;}
  for (const heading of ['Purpose', 'Key Files', 'Public Interface', 'Internal Flow', 'Dependencies', 'Configuration', 'Testing', 'Related Notes']) {
    if (!note.text.includes('## ' + heading)) errors.push(name + ': 缺少章节 ' + heading);
  }
  if (!note.text.includes('[[' + exercise + ']]') || !practice.text.includes('[[' + name + ']]')) errors.push(name + ': 模块与练习缺少双向链接');
  if (!/```text\r?\n/.test(note.text)) errors.push(name + ': 缺少 ASCII 流程');
}
for (const note of notes) {
  if (note !== moc && !moc.text.includes('[[' + note.name + ']]')) errors.push('学习地图未直接链接: ' + note.name);
}
for (const heading of ['Architecture Overview', 'Module Map', 'API Surface', 'Getting Started', 'Tag Index', 'Onboarding Path']) {
  if (!moc.text.includes('## ' + heading)) errors.push('学习地图缺少: ' + heading);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('学习库结构检查通过: ' + notes.length + ' 篇笔记，' + Object.keys(moduleExercises).length + ' 个模块，' + questionCount + ' 道折叠答案练习。');
  console.log('链接与来源检查通过: ' + links + ' 个双向链接，' + registry.size + ' 个登记标签，' + sourceCount + ' 处来源引用（' + referencedSources.size + ' 个唯一项目文件）。');
  console.log('检查范围: 文本结构与路径一致性；不包含 Obsidian 渲染、真实模型或浏览器运行验收。');
}
