import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

export async function writeJsonReport(fileName, payload, directory = 'reports') {
  if (basename(fileName) !== fileName || !fileName.endsWith('.json')) {
    throw new Error(`Report file name must be a JSON file name: ${fileName}`);
  }

  await mkdir(directory, { recursive: true });
  const reportPath = join(directory, fileName);
  await writeFile(reportPath, `${JSON.stringify(payload, null, 2)}\n`);
  return reportPath;
}
