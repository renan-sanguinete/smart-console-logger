// src/astAnalyzer.ts

import * as parser from '@babel/parser';
import traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { LogInsertPoint, LoggerConfig } from './types';
import { SMART_LOG_MARKER } from './logBuilder';

// ─── Babel parse options ──────────────────────────────────────────────────────

const PARSE_OPTIONS: parser.ParserOptions = {
  sourceType: 'module',
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  allowUndeclaredExports: true,
  errorRecovery: true,
  plugins: [
    'jsx',
    'typescript',
    'decorators-legacy',
    'classProperties',
    'classPrivateProperties',
    'classPrivateMethods',
    'optionalChaining',
    'nullishCoalescingOperator',
    'asyncGenerators',
    'bigInt',
    'dynamicImport',
    'importMeta',
    'logicalAssignment',
    'numericSeparator',
    'objectRestSpread',
    'optionalCatchBinding',
    'throwExpressions',
    'topLevelAwait',
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFunctionName(path: NodePath): string {
  const node = path.node;

  // Named function declaration/expression
  if (
    (t.isFunctionDeclaration(node) || t.isFunctionExpression(node)) &&
    node.id?.name
  ) {
    return node.id.name;
  }

  // Arrow / expression assigned to variable: const foo = () => {}
  const parent = path.parent;
  if (t.isVariableDeclarator(parent) && t.isIdentifier(parent.id)) {
    return parent.id.name;
  }

  // Object method / class method
  if (t.isObjectMethod(node) || t.isClassMethod(node)) {
    const key = (node as t.ObjectMethod | t.ClassMethod).key;
    if (t.isIdentifier(key)) { return key.name; }
    if (t.isStringLiteral(key)) { return key.value; }
  }

  // Assignment: module.exports.foo = function() {}
  if (t.isAssignmentExpression(parent)) {
    const left = parent.left;
    if (t.isIdentifier(left)) { return left.name; }
    if (t.isMemberExpression(left) && t.isIdentifier(left.property)) {
      return left.property.name;
    }
  }

  // Class property (class field arrow)
  if (t.isClassProperty(parent) && t.isIdentifier(parent.key)) {
    return parent.key.name;
  }

  return 'anonymous';
}

function getParams(params: t.Function['params']): string[] {
  return params.flatMap((p) => {
    if (t.isIdentifier(p)) { return [p.name]; }
    if (t.isAssignmentPattern(p) && t.isIdentifier(p.left)) { return [p.left.name]; }
    if (t.isRestElement(p) && t.isIdentifier(p.argument)) { return [`...${p.argument.name}`]; }
    if (t.isObjectPattern(p)) {
      return p.properties.flatMap((prop) => {
        if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) { return [prop.key.name]; }
        if (t.isRestElement(prop) && t.isIdentifier(prop.argument)) { return [prop.argument.name]; }
        return [];
      });
    }
    return [];
  });
}

function isHookCallback(path: NodePath<t.Function>): boolean {
  const parent = path.parentPath;
  if (!parent?.isCallExpression()) { return false; }

  const callee = parent.node.callee;
  return t.isIdentifier(callee) && ['useMemo', 'useCallback'].includes(callee.name);
}

function getEnclosingCallName(path: NodePath<t.Function>): string | undefined {
  const parent = path.parentPath;
  if (!parent?.isCallExpression()) { return undefined; }

  const callee = parent.node.callee;
  if (t.isIdentifier(callee)) { return callee.name; }
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
    return callee.property.name;
  }
  return undefined;
}

function isReactComponentLike(path: NodePath<t.Function>): boolean {
  const name = getFunctionName(path as NodePath);
  if (!/^[A-Z]/.test(name)) { return false; }

  const firstParam = path.node.params[0];
  return t.isObjectPattern(firstParam);
}

function isInlineIfBranchReturn(path: NodePath<t.ReturnStatement>): boolean {
  const parent = path.parentPath;
  if (!parent?.isIfStatement()) { return false; }

  const { consequent, alternate } = parent.node;
  return consequent === path.node || alternate === path.node;
}

function isJsxPropCallback(path: NodePath<t.Function>): boolean {
  const parent = path.parentPath;
  const grandparent = parent?.parentPath;
  return parent?.isJSXExpressionContainer() === true && grandparent?.isJSXAttribute() === true;
}

function isStateSetterCallback(path: NodePath<t.Function>): boolean {
  const callName = getEnclosingCallName(path);
  return callName ? /^set[A-Z]/.test(callName) : false;
}

function isArrayMethodCallback(path: NodePath<t.Function>): boolean {
  const callName = getEnclosingCallName(path);
  return callName
    ? ['map', 'filter', 'find', 'reduce', 'forEach', 'some', 'every', 'sort', 'flatMap']
      .includes(callName)
    : false;
}

function isNoisyReactNativeHandlerName(name: string): boolean {
  return [
    /^(on|handle)Touch(Start|Move|End)?$/,
    /^(on|handle)Drawing(Start|Update|End)$/,
    /^(on|handle)Text(Box)?(Touch|Drag|Pinch|Interaction)/,
    /^on(Text|Color|StrokeWidth)Change/,
    /^handle(Color|TextEditColor)Change/,
    /^handle(Pen|Text|Arrow)Toggle$/,
    /^on(ClearContent|UndoEdit|ToggleInterfaceControls)$/,
    /^onToolToggle$/,
  ].some((pattern) => pattern.test(name));
}

function shouldSkipGeneralFunctionLogs(path: NodePath<t.Function>): boolean {
  if (isHookCallback(path)) { return true; }
  if (isJsxPropCallback(path)) { return true; }
  if (isStateSetterCallback(path)) { return true; }
  if (isArrayMethodCallback(path)) { return true; }

  const name = getFunctionName(path as NodePath);
  return isNoisyReactNativeHandlerName(name);
}

/** Zero-based line of the first statement inside a block body (or -1 if empty). */
function firstLineOfBody(body: t.BlockStatement): number {
  if (body.body.length === 0) { return -1; }
  const loc = body.body[0].loc;
  return loc ? loc.start.line - 1 : -1;
}

/** True if a line already contains a smart-logger console.log. */
function isSmartLog(source: string, line: number): boolean {
  const lines = source.split('\n');
  return lines[line]?.includes(SMART_LOG_MARKER) || false;
}

// ─── Main Analyzer ────────────────────────────────────────────────────────────

export function analyzeCode(
  source: string,
  config: LoggerConfig,
): LogInsertPoint[] {
  const points: LogInsertPoint[] = [];
  const seen = new Set<number>(); // deduplicate by insertion line

  let ast: t.File;
  try {
    ast = parser.parse(source, PARSE_OPTIONS);
  } catch (err) {
    console.error('[SmartLogger] Parse error:', err);
    return [];
  }

  const addPoint = (pt: Omit<LogInsertPoint, 'column'>) => {
    if (pt.line < 0 || seen.has(pt.line) || isSmartLog(source, pt.line)) { return; }
    seen.add(pt.line);
    // Determine indentation column from the source line
    const lineText = source.split('\n')[pt.line] ?? '';
    const column = lineText.length - lineText.trimStart().length;
    points.push({ ...pt, column });
  };

  // Helper – shared function-body handler
  const handleFunction = (path: NodePath<t.Function>) => {
    const node = path.node;
    if (!t.isBlockStatement(node.body)) { return; } // expression body arrows handled below
    if (shouldSkipGeneralFunctionLogs(path)) { return; }

    const name = getFunctionName(path as NodePath);
    const params = getParams(node.params);
    const isAsync = node.async;
    const shouldLogFunctionStart = !isReactComponentLike(path);

    if (config.logFunctionStart && shouldLogFunctionStart) {
      const line = firstLineOfBody(node.body);
      if (line >= 0) {
        addPoint({
          line,
          label: `[${isAsync ? 'async ' : ''}fn] ${name}`,
          params,
          type: 'function-start',
        });
      }
    }

    if (config.logReturn) {
      // Return statements inside the function
      path.traverse({
        ReturnStatement(retPath) {
          // Skip returns inside nested functions
          if (retPath.getFunctionParent() !== path) { return; }
          if (isInlineIfBranchReturn(retPath)) { return; }
          const loc = retPath.node.loc;
          if (!loc) { return; }
          const line = loc.start.line - 1;
          const retArg = retPath.node.argument;
          const retVars: string[] = [];
          if (retArg && t.isIdentifier(retArg)) { retVars.push(retArg.name); }
          addPoint({
            line,
            label: `[return] ${name}`,
            params: retVars,
            type: 'function-return',
          });
        },
      });
    }
  };

  traverse(ast, {
    // ── Functions ──────────────────────────────────────────────────────────
    FunctionDeclaration: handleFunction,
    FunctionExpression: handleFunction,
    ArrowFunctionExpression(path) {
      const node = path.node;
      if (t.isBlockStatement(node.body)) {
        handleFunction(path as unknown as NodePath<t.Function>);
      }
    },
    ObjectMethod: handleFunction,
    ClassMethod: handleFunction,

    // ── Try / Catch / Finally ──────────────────────────────────────────────
    TryStatement(path) {
      if (!config.logTryCatch) { return; }
      const node = path.node;

      // try block
      const tryLine = firstLineOfBody(node.block);
      if (tryLine >= 0) {
        addPoint({ line: tryLine, label: '[try]', params: [], type: 'try-start' });
      }

      // catch block
      if (node.handler) {
        const catchLine = firstLineOfBody(node.handler.body);
        const errParam =
          node.handler.param && t.isIdentifier(node.handler.param)
            ? [node.handler.param.name]
            : [];
        if (catchLine >= 0) {
          addPoint({ line: catchLine, label: '[catch]', params: errParam, type: 'catch-block' });
        }
      }

      // finally block
      if (node.finalizer) {
        const finallyLine = firstLineOfBody(node.finalizer);
        if (finallyLine >= 0) {
          addPoint({ line: finallyLine, label: '[finally]', params: [], type: 'finally-block' });
        }
      }
    },

    // ── Promise chains ─────────────────────────────────────────────────────
    CallExpression(path) {
      if (!config.logPromises) { return; }
      const node = path.node;

      if (!t.isMemberExpression(node.callee)) { return; }
      const prop = node.callee.property;
      if (!t.isIdentifier(prop)) { return; }

      const methodName = prop.name;
      if (!['then', 'catch', 'finally'].includes(methodName)) { return; }

      // First argument should be a function (callback)
      const cb = node.arguments[0];
      if (!cb) { return; }

      const isArrow = t.isArrowFunctionExpression(cb);
      const isFn = t.isFunctionExpression(cb);
      if (!isArrow && !isFn) { return; }

      const fn = cb as t.ArrowFunctionExpression | t.FunctionExpression;
      const params = getParams(fn.params);

      if (t.isBlockStatement(fn.body)) {
        const firstLine = firstLineOfBody(fn.body);
        if (firstLine >= 0) {
          const typeMap: Record<string, LogInsertPoint['type']> = {
            then: 'then-callback',
            catch: 'promise-catch',
            finally: 'promise-finally',
          };
          addPoint({
            line: firstLine,
            label: `[.${methodName}]`,
            params,
            type: typeMap[methodName],
          });
        }
      }
    },
  });

  // Sort by line so edits from bottom-to-top don't shift lines
  points.sort((a, b) => a.line - b.line);
  return points;
}
