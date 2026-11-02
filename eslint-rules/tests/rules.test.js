import { describe, it } from 'node:test';
import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import plugin from '../index.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({ languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' } });
const SPEC = '/repo/tests/ui/editor/tools.spec.ts';
const POM = '/repo/src/ui/pages/editor/EditorPage.ts';

ruleTester.run('no-networkidle', plugin.rules['no-networkidle'], {
  valid: [{ code: "await page.waitForLoadState('domcontentloaded');" }],
  invalid: [{ code: "await page.goto('/', { waitUntil: 'networkidle' });", errors: [{ messageId: 'noNetworkIdle' }] }],
});

ruleTester.run('no-test-skip', plugin.rules['no-test-skip'], {
  valid: [
    { code: "test('a', () => {});", filename: SPEC },
    { code: 'testInfo.skip(true, "reason");', filename: '/repo/src/utils/skip.ts' },
    { code: "test.skip('a', () => {});", filename: '/repo/src/utils/other.ts' },
  ],
  invalid: [
    { code: "test.skip('a', () => {});", filename: SPEC, errors: [{ messageId: 'noSkip' }] },
    { code: "test.fixme('a', () => {});", filename: SPEC, errors: [{ messageId: 'noSkip' }] },
  ],
});

ruleTester.run('prefer-get-by-test-id', plugin.rules['prefer-get-by-test-id'], {
  valid: [
    { code: "page.getByTestId('toolbar');" },
    { code: 'page.locator(`[data-qa="page"][data-page-number="${n}"]`);' },
    { code: "page.locator('.page__label');" },
  ],
  invalid: [
    {
      code: `page.locator('[data-qa="toolbar"]');`,
      output: `page.getByTestId('toolbar');`,
      errors: [{ messageId: 'preferGetByTestId' }],
    },
    {
      code: 'root.locator(`[data-qa=undoButton]`);',
      output: "root.getByTestId('undoButton');",
      errors: [{ messageId: 'preferGetByTestId' }],
    },
  ],
});

ruleTester.run('no-plain-expect-in-tests', plugin.rules['no-plain-expect-in-tests'], {
  valid: [
    { code: 'await expectWithStep(status).toBe(200);', filename: SPEC },
    { code: 'await expect(locator).toBeVisible();', filename: POM },
  ],
  invalid: [
    { code: 'await expect(locator).toBeVisible();', filename: SPEC, errors: [{ messageId: 'noPlainExpect' }] },
    { code: 'expect.soft(value).toBe(1);', filename: SPEC, errors: [{ messageId: 'noPlainExpect' }] },
  ],
});

ruleTester.run('require-step-decorator', plugin.rules['require-step-decorator'], {
  valid: [
    { code: "class A { @step('Open') async open() {} }", filename: POM },
    { code: 'class A { private async helper() {} }', filename: POM },
    { code: 'class A { get title() { return 1; } }', filename: POM },
    { code: 'class A { async open() {} }', filename: '/repo/src/api/complex-steps.ts' },
  ],
  invalid: [{ code: 'class A { async open() {} }', filename: POM, errors: [{ messageId: 'missingStep' }] }],
});

ruleTester.run('check-method-naming', plugin.rules['check-method-naming'], {
  valid: [{ code: 'class A { async checkThatTitleIs() {} isOpened() {} }', filename: POM }],
  invalid: [
    { code: 'class A { async verifyTitle() {} }', filename: POM, errors: [{ messageId: 'naming' }] },
    { code: 'class A { async assertVisible() {} }', filename: POM, errors: [{ messageId: 'naming' }] },
  ],
});
