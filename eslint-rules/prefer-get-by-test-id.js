import { calleeName, rule } from './utils.js';

const SINGLE_TEST_ID = /^\[data-qa=(["']?)[\w-]+\1\]$/;

/** `locator('[data-qa="x"]')` duplicates what `getByTestId('x')` says, without the configured attribute. */
export default rule(
  {
    type: 'suggestion',
    fixable: 'code',
    docs: { description: 'Prefer getByTestId over a bare data-qa attribute selector' },
    messages: { preferGetByTestId: "Use getByTestId('{{id}}') instead of locator('{{selector}}')." },
  },
  (context) => ({
    CallExpression(node) {
      if (calleeName(node) !== 'locator' || node.arguments.length !== 1) return;
      const [arg] = node.arguments;
      const selector =
        arg.type === 'Literal' ? arg.value : arg.type === 'TemplateLiteral' && !arg.expressions.length ? arg.quasis[0].value.cooked : undefined;
      if (typeof selector !== 'string' || !SINGLE_TEST_ID.test(selector)) return;
      const id = selector.replace(/^\[data-qa=["']?|["']?\]$/g, '');
      context.report({
        node,
        messageId: 'preferGetByTestId',
        data: { id, selector },
        fix: (fixer) => [fixer.replaceText(node.callee.property, 'getByTestId'), fixer.replaceText(arg, `'${id}'`)],
      });
    },
  }),
);
