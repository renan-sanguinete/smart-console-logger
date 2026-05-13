// src/logBuilder.ts

import { LoggerConfig, LogInsertPoint, LogPointType } from './types';

// ─── Smart log labels ─────────────────────────────────────────────────────────

const SMART_LOG: Record<LogPointType, string> = {
  'function-start':   '[SCL] [func-start]',
  'function-return':  '[SCL] [func-return]',
  'try-start':        '[SCL] [try]',
  'catch-block':      '[SCL] [catch]',
  'finally-block':    '[SCL] [finally]',
  'then-callback':    '[SCL] [then]',
  'promise-catch':    '[SCL] [promise-catch]',
  'promise-finally':  '[SCL] [promise-finally]',
  'if-branch':        '[SCL] [if]',
  'else-branch':      '[SCL] [else]',
};

// ─── Marker used to identify smart-logger injected lines ─────────────────────

export const SMART_LOG_MARKER = '[SCL]';

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildConsoleLog(
  point: LogInsertPoint,
  config: LoggerConfig,
  indent: string,
): string {
  const marker = `${SMART_LOG[point.type]} `;
  const timestamp = config.includeTimestamp ? `[${new Date().toISOString()}] ` : '';
  const label = `${marker}${timestamp}${point.label}`;

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
  const escapedMarker = SMART_LOG_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^[ \\t]*console\\.(log|group|groupEnd|table)\\(.*${escapedMarker}.*\\);?\\s*$`,
  );
}
