import { expect, test } from '@playwright/test';

/**
 * `expect` whose every matcher call becomes a readable report step:
 *
 *   await expectWithStep(response.status(), 'status').toBe(201)
 *   // -> step "expect status toBe(201)"
 *
 * Works through chains such as `.not.toBe` and `.resolves.toEqual` by wrapping
 * each property access in a Proxy and only creating the step when a matcher is called.
 */
const formatArgs = (args: unknown[]): string =>
  args
    .map((arg) => {
      if (typeof arg === 'string') return `'${arg}'`;
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(', ');

const wrap = (target: object, path: string[], title: string): unknown =>
  new Proxy(target, {
    get(obj, property, receiver) {
      const value = Reflect.get(obj, property, receiver);
      if (typeof property === 'symbol') return value;
      if (typeof value === 'function') {
        return (...args: unknown[]) => {
          const stepName = `expect ${title} ${[...path, property].join('.')}(${formatArgs(args)})`.replace(/\s+/g, ' ');
          return test.step(stepName, async () => value.apply(obj, args), { box: true });
        };
      }
      if (value && typeof value === 'object') return wrap(value, [...path, property], title);
      return value;
    },
  });

export const expectWithStep = <T>(actual: T, title = '') =>
  wrap(expect(actual, title || undefined) as object, [], title) as ReturnType<typeof expect<T>>;

export const softExpectWithStep = <T>(actual: T, title = '') =>
  wrap(expect.soft(actual, title || undefined) as object, [], `[soft] ${title}`) as ReturnType<typeof expect<T>>;

export const { objectContaining, arrayContaining, stringMatching, any } = expect;
