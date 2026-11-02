import { isSpecFile, rule } from './utils.js';

/**
 * Specs express intent; checks live in page objects (`checkThat…`) or go through
 * `expectWithStep`, which turns every assertion into a readable report step.
 */
export default rule(
  {
    docs: { description: 'Disallow plain expect() in spec files' },
    messages: { noPlainExpect: 'Move the check into a page-object `checkThat…` method or use expectWithStep().' },
  },
  (context) => {
    if (!isSpecFile(context.filename)) return {};
    return {
      CallExpression(node) {
        const { callee } = node;
        const isExpect =
          (callee.type === 'Identifier' && callee.name === 'expect') ||
          (callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'expect');
        if (isExpect) context.report({ node, messageId: 'noPlainExpect' });
      },
    };
  },
);
