// src/types.ts

export interface LoggerConfig {
  emoji: boolean;
  logStyle: 'simple' | 'grouped' | 'table';
  includeTimestamp: boolean;
  logFunctionStart: boolean;
  logTryCatch: boolean;
  logPromises: boolean;
  logReturn: boolean;
}

export interface LogInsertPoint {
  line: number;         // 0-based line index in the document
  column: number;       // column for indentation reference
  label: string;        // descriptive label for the log message
  params: string[];     // variable names / params to log
  type: LogPointType;
}

export type LogPointType =
  | 'function-start'
  | 'function-return'
  | 'try-start'
  | 'catch-block'
  | 'finally-block'
  | 'then-callback'
  | 'promise-catch'
  | 'promise-finally'
  | 'if-branch'
  | 'else-branch';

export interface FunctionInfo {
  name: string;
  params: string[];
  isAsync: boolean;
  isArrow: boolean;
  startLine: number;
  endLine: number;
}
