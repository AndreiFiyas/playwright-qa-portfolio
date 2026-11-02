import { isUiLayerFile, rule } from './utils.js';

const BANNED_PREFIX = /^(assert|verify|validate|expect)[A-Z]/;

/** One vocabulary across page objects: checks are `checkThat…`, readiness is `isOpened`. */
export default rule(
  {
    type: 'suggestion',
    docs: { description: 'Enforce check-method naming in page objects' },
    messages: { naming: 'Name checks `checkThat…` instead of `{{name}}`.' },
  },
  (context) => {
    if (!isUiLayerFile(context.filename)) return {};
    return {
      MethodDefinition(node) {
        if (node.key.type === 'Identifier' && BANNED_PREFIX.test(node.key.name)) {
          context.report({ node: node.key, messageId: 'naming', data: { name: node.key.name } });
        }
      },
    };
  },
);
