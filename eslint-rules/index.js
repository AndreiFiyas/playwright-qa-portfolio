import checkMethodNaming from './check-method-naming.js';
import noNetworkidle from './no-networkidle.js';
import noPlainExpectInTests from './no-plain-expect-in-tests.js';
import noRawActionsInTests from './no-raw-actions-in-tests.js';
import noTestSkip from './no-test-skip.js';
import preferGetByTestId from './prefer-get-by-test-id.js';
import requireStepDecorator from './require-step-decorator.js';

/** Review conventions turned into lint rules: a reviewer's comment, written once, enforced forever. */
export default {
  meta: { name: 'eslint-plugin-qa', version: '1.0.0' },
  rules: {
    'check-method-naming': checkMethodNaming,
    'no-networkidle': noNetworkidle,
    'no-plain-expect-in-tests': noPlainExpectInTests,
    'no-raw-actions-in-tests': noRawActionsInTests,
    'no-test-skip': noTestSkip,
    'prefer-get-by-test-id': preferGetByTestId,
    'require-step-decorator': requireStepDecorator,
  },
};
