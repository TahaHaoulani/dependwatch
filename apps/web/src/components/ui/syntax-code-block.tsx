'use client';

import { useMemo } from 'react';

type TokenType = 'keyword' | 'string' | 'comment' | 'number' | 'property' | 'default';

const JS_KEYWORDS = new Set([
  'import', 'from', 'await', 'async', 'return', 'const', 'let', 'var', 'function', 'true', 'false', 'null',
]);

const JS_PROPERTIES = new Set([
  'ingestKey', 'baseUrl', 'provider', 'endpoint', 'estimated_cost_usd', 'model', 'messages', 'env',
  'service_name',
]);

function tokenize(code: string): { type: TokenType; text: string }[] {
  const tokens: { type: TokenType; text: string }[] = [];
  let i = 0;
  const n = code.length;

  while (i < n) {
    const rest = code.slice(i);

    // Line comment
    const lineComment = rest.match(/^\/\/[^\n]*/);
    if (lineComment) {
      tokens.push({ type: 'comment', text: lineComment[0] });
      i += lineComment[0].length;
      continue;
    }

    // Block comment
    const blockComment = rest.match(/^\/\*[\s\S]*?\*\//);
    if (blockComment) {
      tokens.push({ type: 'comment', text: blockComment[0] });
      i += blockComment[0].length;
      continue;
    }

    // Double-quoted string
    const dq = rest.match(/^"(?:[^"\\]|\\.)*"/);
    if (dq) {
      tokens.push({ type: 'string', text: dq[0] });
      i += dq[0].length;
      continue;
    }

    // Single-quoted string
    const sq = rest.match(/^'(?:[^'\\]|\\.)*'/);
    if (sq) {
      tokens.push({ type: 'string', text: sq[0] });
      i += sq[0].length;
      continue;
    }

    // Backtick string
    const bq = rest.match(/^`(?:[^`\\]|\\.)*`/);
    if (bq) {
      tokens.push({ type: 'string', text: bq[0] });
      i += bq[0].length;
      continue;
    }

    // Number
    const num = rest.match(/^\d+\.?\d*/);
    if (num) {
      tokens.push({ type: 'number', text: num[0] });
      i += num[0].length;
      continue;
    }

    // Arrow function
    if (rest.startsWith('=>')) {
      tokens.push({ type: 'keyword', text: '=>' });
      i += 2;
      continue;
    }

    // Identifier or keyword or property
    const id = rest.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
    if (id) {
      const word = id[0];
      if (word === '=>') {
        tokens.push({ type: 'keyword', text: word });
      } else if (JS_KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', text: word });
      } else if (JS_PROPERTIES.has(word)) {
        tokens.push({ type: 'property', text: word });
      } else {
        tokens.push({ type: 'default', text: word });
      }
      i += word.length;
      continue;
    }

    // Single character (punctuation, etc.)
    tokens.push({ type: 'default', text: rest[0]! });
    i += 1;
  }

  return tokens;
}

// Theme-aware: light mode = deeper, readable colors; dark mode = brighter on dark background
const tokenClass: Record<TokenType, string> = {
  keyword: 'text-blue-700 dark:text-blue-400',
  string: 'text-emerald-700 dark:text-emerald-400',
  comment: 'text-muted-foreground',
  number: 'text-amber-700 dark:text-amber-400',
  property: 'text-teal-700 dark:text-amber-300/90',
  default: 'text-foreground/95',
};

// JSON: keys (property) vs string values — terminal-style colors
const tokenClassJson: Record<TokenType, string> = {
  keyword: 'text-blue-600 dark:text-blue-400',
  string: 'text-amber-700 dark:text-amber-400/95',
  comment: 'text-muted-foreground',
  number: 'text-amber-700 dark:text-amber-400',
  property: 'text-sky-600 dark:text-sky-400',
  default: 'text-foreground/90',
};

/** Tokenize JSON: keys (quoted before ":") = property, other quoted = string; true/false/null = keyword */
function tokenizeJson(code: string): { type: TokenType; text: string }[] {
  const tokens: { type: TokenType; text: string }[] = [];
  let i = 0;
  const n = code.length;

  while (i < n) {
    const rest = code.slice(i);

    // Whitespace (newlines, spaces, tabs) — keep as single default token for layout
    const ws = rest.match(/^[\s]+/);
    if (ws) {
      tokens.push({ type: 'default', text: ws[0] });
      i += ws[0].length;
      continue;
    }

    // Double-quoted string — key if followed by \s*:, else value
    const dq = rest.match(/^"(?:[^"\\]|\\.)*"/);
    if (dq) {
      const after = code.slice(i + dq[0].length).match(/^\s*:/);
      tokens.push({ type: after ? 'property' : 'string', text: dq[0] });
      i += dq[0].length;
      continue;
    }

    // Number
    const num = rest.match(/^-?\d+\.?\d*([eE][+-]?\d+)?/);
    if (num) {
      tokens.push({ type: 'number', text: num[0] });
      i += num[0].length;
      continue;
    }

    // true, false, null
    if (rest.startsWith('true')) {
      tokens.push({ type: 'keyword', text: 'true' });
      i += 4;
      continue;
    }
    if (rest.startsWith('false')) {
      tokens.push({ type: 'keyword', text: 'false' });
      i += 5;
      continue;
    }
    if (rest.startsWith('null')) {
      tokens.push({ type: 'keyword', text: 'null' });
      i += 4;
      continue;
    }

    // Single character (braces, colon, comma)
    tokens.push({ type: 'default', text: rest[0]! });
    i += 1;
  }

  return tokens;
}

export function SyntaxCodeBlock({
  code,
  className,
  language = 'javascript',
}: {
  code: string;
  className?: string;
  language?: 'javascript' | 'json';
}) {
  const tokens = useMemo(
    () => (language === 'json' ? tokenizeJson(code) : tokenize(code)),
    [code, language]
  );
  const classes = language === 'json' ? tokenClassJson : tokenClass;
  return (
    <code className={className}>
      {tokens.map((t, i) => (
        <span key={i} className={classes[t.type]}>
          {t.text}
        </span>
      ))}
    </code>
  );
}
