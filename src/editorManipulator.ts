// src/editorManipulator.ts

import * as vscode from 'vscode';
import { LogInsertPoint, LoggerConfig } from './types';
import { buildConsoleLog, getSmartLogRegex } from './logBuilder';

// ─── Insert Logs ──────────────────────────────────────────────────────────────

/**
 * Inserts console.log statements at the given points.
 * Processes from BOTTOM to TOP so previously inserted lines don't shift indices.
 */
export async function insertConsoleLogs(
  editor: vscode.TextEditor,
  points: LogInsertPoint[],
  config: LoggerConfig,
): Promise<number> {
  const doc = editor.document;
  let inserted = 0;

  // Sort descending by line so we work bottom-to-top
  const sorted = [...points].sort((a, b) => b.line - a.line);

  await editor.edit((editBuilder) => {
    for (const point of sorted) {
      const lineIndex = point.line;
      if (lineIndex < 0 || lineIndex >= doc.lineCount) { continue; }

      const lineText = doc.lineAt(lineIndex).text;
      const indent = lineText.slice(0, lineText.length - lineText.trimStart().length);

      const logLine = buildConsoleLog(point, config, indent);

      // Insert BEFORE the current line
      const insertPos = new vscode.Position(lineIndex, 0);
      editBuilder.insert(insertPos, logLine + '\n');
      inserted++;
    }
  });

  return inserted;
}

// ─── Remove Logs ──────────────────────────────────────────────────────────────

/**
 * Removes all console.log lines that were injected by this extension
 * (identified by the smart-log marker emoji).
 */
export async function removeConsoleLogs(
  editor: vscode.TextEditor,
): Promise<number> {
  const doc = editor.document;
  const regex = getSmartLogRegex();
  let removed = 0;

  // Collect ranges to delete (collect first, then delete in one edit)
  const rangesToDelete: vscode.Range[] = [];

  for (let i = 0; i < doc.lineCount; i++) {
    const lineText = doc.lineAt(i).text;
    if (regex.test(lineText)) {
      // Delete the entire line including its newline character
      const start = new vscode.Position(i, 0);
      const end = i + 1 < doc.lineCount
        ? new vscode.Position(i + 1, 0)
        : new vscode.Position(i, lineText.length);
      rangesToDelete.push(new vscode.Range(start, end));
      removed++;
    }
  }

  if (rangesToDelete.length === 0) { return 0; }

  // Apply deletions from bottom to top to preserve line numbers
  const sorted = rangesToDelete.sort((a, b) => b.start.line - a.start.line);

  await editor.edit((editBuilder) => {
    for (const range of sorted) {
      editBuilder.delete(range);
    }
  });

  return removed;
}

// ─── Has Smart Logs ───────────────────────────────────────────────────────────

export function hasSmartLogs(document: vscode.TextDocument): boolean {
  const regex = getSmartLogRegex();
  for (let i = 0; i < document.lineCount; i++) {
    if (regex.test(document.lineAt(i).text)) { return true; }
  }
  return false;
}
