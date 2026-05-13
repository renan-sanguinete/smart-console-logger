// src/configManager.ts

import * as vscode from 'vscode';
import { LoggerConfig } from './types';

export function getConfig(): LoggerConfig {
  const cfg = vscode.workspace.getConfiguration('smartConsoleLogger');
  return {
    emoji:             cfg.get<boolean>('emoji', true),
    logStyle:          cfg.get<'simple' | 'grouped' | 'table'>('logStyle', 'simple'),
    includeTimestamp:  cfg.get<boolean>('includeTimestamp', false),
    logFunctionStart:  cfg.get<boolean>('logFunctionStart', true),
    logTryCatch:       cfg.get<boolean>('logTryCatch', true),
    logPromises:       cfg.get<boolean>('logPromises', true),
    logReturn:         cfg.get<boolean>('logReturn', true),
  };
}
