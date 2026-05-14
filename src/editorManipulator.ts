import * as vscode from 'vscode';
import { LogInsertPoint, LoggerConfig } from './types';
import { buildConsoleLog, getSmartLogRegex } from './logBuilder';

export async function insertConsoleLogs(
  editor: vscode.TextEditor,
  points: LogInsertPoint[],
  config: LoggerConfig,
): Promise<number> {
  const doc = editor.document;
  let inserted = 0;

  const sorted = [...points].sort((a, b) => b.line - a.line);

  await editor.edit((editBuilder) => {
    for (const point of sorted) {
      const lineIndex = point.line;
      if (lineIndex < 0 || lineIndex >= doc.lineCount) { continue; }

      const lineText = doc.lineAt(lineIndex).text;
      const indent = lineText.slice(0, lineText.length - lineText.trimStart().length);

      const logLine = buildConsoleLog(point, config, indent);

      const insertPos = new vscode.Position(lineIndex, 0);
      editBuilder.insert(insertPos, logLine + '\n');
      inserted++;
    }
  });

  return inserted;
}

export async function removeConsoleLogs(
  editor: vscode.TextEditor,
): Promise<number> {
  const doc = editor.document;
  const regex = getSmartLogRegex();
  let removed = 0;

  const rangesToDelete: vscode.Range[] = [];

  for (let i = 0; i < doc.lineCount; i++) {
    const lineText = doc.lineAt(i).text;
    if (regex.test(lineText)) {
      const start = new vscode.Position(i, 0);
      const end = i + 1 < doc.lineCount
        ? new vscode.Position(i + 1, 0)
        : new vscode.Position(i, lineText.length);
      rangesToDelete.push(new vscode.Range(start, end));
      removed++;
    }
  }

  if (rangesToDelete.length === 0) { return 0; }

  const sorted = rangesToDelete.sort((a, b) => b.start.line - a.start.line);

  await editor.edit((editBuilder) => {
    for (const range of sorted) {
      editBuilder.delete(range);
    }
  });

  return removed;
}

export function hasSmartLogs(document: vscode.TextDocument): boolean {
  const regex = getSmartLogRegex();
  for (let i = 0; i < document.lineCount; i++) {
    if (regex.test(document.lineAt(i).text)) { return true; }
  }
  return false;
}
