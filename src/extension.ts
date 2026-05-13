// src/extension.ts

import * as vscode from 'vscode';
import { analyzeCode } from './astAnalyzer';
import { insertConsoleLogs, removeConsoleLogs, hasSmartLogs } from './editorManipulator';
import { getConfig } from './configManager';

// ─── Supported languages ──────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = new Set([
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getActiveEditor(): vscode.TextEditor | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('Smart Logger: No active editor found.');
    return undefined;
  }
  if (!SUPPORTED_LANGUAGES.has(editor.document.languageId)) {
    vscode.window.showWarningMessage(
      `Smart Logger: File type "${editor.document.languageId}" is not supported. ` +
      'Use JS, TS, JSX, or TSX files.',
    );
    return undefined;
  }
  return editor;
}

// ─── Command: Add Logs ────────────────────────────────────────────────────────

async function addLogs(): Promise<void> {
  const editor = getActiveEditor();
  if (!editor) { return; }

  const source = editor.document.getText();
  const config = getConfig();

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: '🪵 Smart Logger: Analyzing code…',
      cancellable: false,
    },
    async () => {
      const points = analyzeCode(source, config);

      if (points.length === 0) {
        vscode.window.showInformationMessage(
          '🪵 Smart Logger: No insertion points found. ' +
          'Make sure your file has functions, try/catch, or promise chains.',
        );
        return;
      }

      const inserted = await insertConsoleLogs(editor, points, config);

      vscode.window.showInformationMessage(
        `🪵 Smart Logger: Inserted ${inserted} console.log${inserted !== 1 ? 's' : ''}! ` +
        `(${points.length} points analyzed)`,
      );
    },
  );
}

// ─── Command: Remove Logs ─────────────────────────────────────────────────────

async function removeLogs(): Promise<void> {
  const editor = getActiveEditor();
  if (!editor) { return; }

  if (!hasSmartLogs(editor.document)) {
    vscode.window.showInformationMessage(
      '🧹 Smart Logger: No smart console.logs found in this file.',
    );
    return;
  }

  const removed = await removeConsoleLogs(editor);
  vscode.window.showInformationMessage(
    `🧹 Smart Logger: Removed ${removed} console.log${removed !== 1 ? 's' : ''}!`,
  );
}

// ─── Command: Toggle Logs ─────────────────────────────────────────────────────

async function toggleLogs(): Promise<void> {
  const editor = getActiveEditor();
  if (!editor) { return; }

  if (hasSmartLogs(editor.document)) {
    await removeLogs();
  } else {
    await addLogs();
  }
}

// ─── Activation ───────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  console.log('🪵 Smart Console Logger is now active!');

  // Register status bar item
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBar.command = 'smartConsoleLogger.toggleLogs';
  statusBar.tooltip = 'Toggle Smart Console Logs';
  context.subscriptions.push(statusBar);

  // Update status bar on editor change
  const updateStatusBar = (editor: vscode.TextEditor | undefined) => {
    if (!editor || !SUPPORTED_LANGUAGES.has(editor.document.languageId)) {
      statusBar.hide();
      return;
    }
    const hasLogs = hasSmartLogs(editor.document);
    statusBar.text = hasLogs ? '$(trash) Remove Logs' : '$(debug-console) Add Logs';
    statusBar.backgroundColor = hasLogs
      ? new vscode.ThemeColor('statusBarItem.warningBackground')
      : undefined;
    statusBar.show();
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) {
        updateStatusBar(vscode.window.activeTextEditor);
      }
    }),
  );

  updateStatusBar(vscode.window.activeTextEditor);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('smartConsoleLogger.addLogs', addLogs),
    vscode.commands.registerCommand('smartConsoleLogger.removeLogs', removeLogs),
    vscode.commands.registerCommand('smartConsoleLogger.toggleLogs', toggleLogs),
  );
}

export function deactivate(): void {
  console.log('🪵 Smart Console Logger deactivated.');
}
