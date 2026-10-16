import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(
  process.cwd(),
  'src/modules/Tickets/support-catalog-admin-page.tsx',
);
const source = readFileSync(sourcePath, 'utf8');
const deferredUpdaterPattern =
  /set[A-Z]\w+\(\s*\(\s*(current|state|prev)\s*\)\s*=>/g;
const matches = [...source.matchAll(deferredUpdaterPattern)]
  .map((match) => {
    const start = match.index ?? 0;
    const body = readCallExpression(source, start);

    return {
      index: start,
      body,
    };
  })
  .filter((match) => match.body.includes('event.currentTarget'));

if (matches.length > 0) {
  console.error(
    [
      'Unsafe deferred event target usage found.',
      'Capture event.currentTarget.value before functional setState updaters.',
      ...matches.map((match) => `- index ${match.index}`),
    ].join('\n'),
  );
  process.exit(1);
}

console.log('No deferred event.currentTarget usage found.');

function readCallExpression(value, start) {
  const callStart = value.indexOf('(', start);

  if (callStart === -1) {
    return value.slice(start, start + 500);
  }

  let depth = 0;

  for (let index = callStart; index < value.length; index += 1) {
    const char = value[index];

    if (char === '(') {
      depth += 1;
    }

    if (char === ')') {
      depth -= 1;
    }

    if (depth === 0) {
      return value.slice(start, index + 1);
    }
  }

  return value.slice(start, start + 500);
}
