import { isSpecFile, rule } from './utils.js';

const BANNED = new Set(['skip', 'fixme']);

/** Mutes go through declarative annotations (`skipOnIssue`, `skipOnBrowser`) so every one has a reason and an owner. */
export default rule(
  {
    docs: { description: 'Disallow test.skip / test.fixme in specs' },
    messages: { noSkip: 'Use a skip annotation from @utils/skip (skipOnIssue, skipOnBrowser, …) instead of test.{{name}}().' },
  },
  (context) => {
    if (!isSpecFile(context.filename)) return {};
    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'test' &&
          callee.property.type === 'Identifier' &&
          BANNED.has(callee.property.name)
        ) {
          context.report({ node, messageId: 'noSkip', data: { name: callee.property.name } });
        }
      },
    };
  },
);
