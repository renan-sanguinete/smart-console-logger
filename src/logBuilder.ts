// src/logBuilder.ts

import { LoggerConfig, LogInsertPoint, LogPointType } from './types';

// ─── Emoji map ────────────────────────────────────────────────────────────────

const EMOJI: Record<LogPointType, string> = {
  'function-start':   '🪵',
  'function-return':  '🔙',
  'try-start':        '🔵',
  'catch-block':      '🔴',
  'finally-block':    '🟡',
  'then-callback':    '🟢',
  'promise-catch':    '🟠',
  'promise-finally':  '⚪',
  'if-branch':        '↗️',
  'else-branch':      '↘️',
};

// ─── Marker used to identify smart-logger injected lines ─────────────────────

export const SMART_LOG_MARKER = '🪵'; // present in every injected log

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildConsoleLog(
  point: LogInsertPoint,
  config: LoggerConfig,
  indent: string,
): string {
  const emoji = config.emoji ? `${EMOJI[point.type]} ` : '';
  const timestamp = config.includeTimestamp ? `[${new Date().toISOString()}] ` : '';
  const label = `${emoji}${timestamp}${point.label}`;

  const args: string[] = [`'${label}'`];

  if (point.params.length > 0) {
    // Log each param individually so DevTools shows the name + value
    const paramStr = `{ ${point.params.join(', ')} }`;
    args.push(paramStr);
  }

  switch (config.logStyle) {
    case 'grouped':
      return [
        `${indent}console.group('${label}');`,
        point.params.length > 0
          ? `${indent}console.log(${args.slice(1).join(', ')});`
          : '',
        `${indent}console.groupEnd();`,
      ]
        .filter(Boolean)
        .join('\n');

    case 'table':
      if (point.params.length > 0) {
        return [
          `${indent}console.log('${label}');`,
          `${indent}console.table({ ${point.params.join(', ')} });`,
        ].join('\n');
      }
      return `${indent}console.log('${label}');`;

    default: // 'simple'
      return `${indent}console.log(${args.join(', ')});`;
  }
}

/** Returns a regex that matches any line produced by this extension. */
export function getSmartLogRegex(): RegExp {
  // Matches lines that contain our emoji marker (simple or grouped variants)
  return /^[ \t]*console\.(log|group|groupEnd|table)\(.*🪵.*\);?\s*$/;
}
