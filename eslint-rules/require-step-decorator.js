import { isUiLayerFile, rule } from './utils.js';

const decoratorName = (decorator) => {
  const { expression } = decorator;
  if (expression.type === 'CallExpression' && expression.callee.type === 'Identifier') return expression.callee.name;
  if (expression.type === 'Identifier') return expression.name;
  return undefined;
};

/** Every public async page-object method is a report step — the report reads like the test plan. */
export default rule(
  {
    docs: { description: 'Require @step on public async methods of page objects' },
    messages: { missingStep: 'Public async method `{{name}}` must be decorated with @step(...).' },
  },
  (context) => {
    if (!isUiLayerFile(context.filename)) return {};
    return {
      MethodDefinition(node) {
        if (node.kind !== 'method' || node.static || !node.value.async) return;
        if (node.accessibility === 'private' || node.accessibility === 'protected' || node.key.type === 'PrivateIdentifier') return;
        if ((node.decorators ?? []).some((d) => decoratorName(d) === 'step')) return;
        context.report({ node: node.key, messageId: 'missingStep', data: { name: node.key.name } });
      },
    };
  },
);
