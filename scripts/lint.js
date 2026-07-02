import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const ignoredDirectories = new Set([
  '.git',
  'coverage',
  'node_modules',
  'reports'
]);
const checkedExtensions = new Set(['.js', '.json', '.md', '.yml', '.yaml']);
const checkedFileNames = new Set([
  '.dockerignore',
  '.editorconfig',
  '.gitattributes',
  '.gitignore',
  'Dockerfile',
  'Jenkinsfile'
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...await walk(fullPath));
      }
      continue;
    }

    if (
      checkedExtensions.has(extname(entry.name)) ||
      checkedFileNames.has(entry.name)
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function relativePath(filePath) {
  return relative(root, filePath).replaceAll('\\', '/');
}

function checkJavaScriptSyntax(filePath, failures) {
  if (extname(filePath) !== '.js') {
    return;
  }

  const result = spawnSync(process.execPath, ['--check', filePath], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failures.push(`${relativePath(filePath)} failed node --check\n${result.stderr}`);
  }
}

async function checkTextFile(filePath, failures) {
  const content = await readFile(filePath, 'utf8');
  const lines = content.split('\n');

  if (!content.endsWith('\n')) {
    failures.push(`${relativePath(filePath)} must end with a newline`);
  }

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    if (/\s+$/.test(line) && index !== lines.length - 1) {
      failures.push(`${relativePath(filePath)}:${lineNumber} has trailing whitespace`);
    }

    if (line.includes('\t')) {
      failures.push(`${relativePath(filePath)}:${lineNumber} uses a tab character`);
    }
  });
}

const files = await walk(root);
const failures = [];

for (const file of files) {
  await checkTextFile(file, failures);
  checkJavaScriptSyntax(file, failures);
}

if (failures.length > 0) {
  console.error('Lint failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Lint passed for ${files.length} files.`);
