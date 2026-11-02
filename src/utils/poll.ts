/**
 * Polls `read` until `done(value)` holds. Used by setup helpers that must not assert
 * (assertions belong to tests and page-object checks).
 */
export async function waitFor<T>(
  read: () => Promise<T>,
  done: (value: T) => boolean,
  { timeout = 10_000, interval = 200, description = 'condition' } = {},
): Promise<T> {
  const deadline = Date.now() + timeout;
  let last: T | undefined;
  while (Date.now() < deadline) {
    last = await read();
    if (done(last)) return last;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Timed out after ${timeout}ms waiting for ${description}. Last value: ${JSON.stringify(last)}`);
}
