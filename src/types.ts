export type LoggerAggressiveness = 'conservative' | 'balanced' | 'verbose';

export interface LoggerConfig {
  logAggressiveness: LoggerAggressiveness;
  logStyle: 'simple' | 'grouped' | 'table';
  includeTimestamp: boolean;
  logFunctionStart: boolean;
  logTryCatch: boolean;
  logPromises: boolean;
  logReturn: boolean;
}

export interface LogInsertPoint {
  line: number;
  column: number;
  label: string;
  params: string[];
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
