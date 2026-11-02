import { isSpecFile, rule } from './utils.js';

const ACTIONS = new Set(['click', 'dblclick', 'fill', 'press', 'type', 'check', 'uncheck', 'hover', 'selectOption', 'goto', 'tap', 'dragTo']);
const PLAYWRIGHT_TYPES = new Set(['Locator', 'Page', 'Keyboard', 'Mouse', 'FrameLocator', 'Frame']);

/**
 * Type-aware: reports `x.click()` only when `x` is a Playwright Locator/Page/…,
 * so a page-object method that happens to be called `click()` is never flagged.
 */
export default rule(
  {
    docs: { description: 'Disallow raw Playwright actions in spec files', requiresTypeChecking: true },
    messages: { noRawAction: 'Raw Playwright action `{{name}}()` in a spec. Express it as a page-object method.' },
  },
  (context) => {
    if (!isSpecFile(context.filename)) return {};
    const services = context.sourceCode.parserServices;
    if (!services?.program) return {};
    const checker = services.program.getTypeChecker();
    return {
      CallExpression(node) {
        const { callee } = node;
        if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') return;
        if (!ACTIONS.has(callee.property.name)) return;
        const type = services.getTypeAtLocation(callee.object);
        const name = type.getSymbol()?.getName() ?? checker.typeToString(type);
        if (PLAYWRIGHT_TYPES.has(name)) context.report({ node, messageId: 'noRawAction', data: { name: callee.property.name } });
      },
    };
  },
);
