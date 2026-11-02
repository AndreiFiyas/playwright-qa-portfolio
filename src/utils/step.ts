import { test } from '@playwright/test';

type StepName = string | ((...args: unknown[]) => string);

const format = (template: string, args: unknown[]): string =>
  template.replace(/\{(\d+)\}/g, (match, index: string) => {
    const value = args[Number(index)];
    if (value === undefined) return match;
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  });

/**
 * TC39 method decorator that turns a page-object method into a named report step.
 *
 *   @step('Add {0} element on page {1}')
 *   async addElement(tool: Tool, page: number) { ... }
 *
 * `{n}` placeholders are filled from the call arguments. Outside of a running test
 * (for example a setup script) the method is called directly.
 */
export function step(name?: StepName) {
  return function decorate<T extends (this: any, ...args: any[]) => Promise<any>>(
    target: T,
    context: ClassMethodDecoratorContext,
  ): T {
    return function replacement(this: object, ...args: unknown[]) {
      const owner = this.constructor.name;
      const label =
        typeof name === 'function'
          ? name(...args)
          : name
            ? format(name, args)
            : `${owner}.${String(context.name)}`;
      try {
        test.info();
      } catch {
        return target.call(this, ...args);
      }
      return test.step(label, () => target.call(this, ...args), { box: true });
    } as T;
  };
}
