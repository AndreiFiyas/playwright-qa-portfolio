import type { Page, WebSocket } from '@playwright/test';
import { step } from '@utils/step';
import { isOperation, parseOperations, type Operation, type OperationName } from '@ws/operations';

type FrameListener = (op: Operation) => void;

/**
 * Watches the editor's WebSocket traffic from the browser side.
 *
 * The UI shows a projection of server state; right after a reconnect the DOM can briefly
 * show stale rows. Asserting the server's own answer (the frame) removes that flakiness.
 *
 * Attach before navigation so sockets opened during page load are captured; subscribe
 * before triggering the action so the reply cannot be missed. Sockets opened later
 * (reconnects) are picked up automatically.
 */
export class WsMonitor {
  private readonly listeners = new Set<FrameListener>();

  constructor(page: Page) {
    page.on('websocket', (socket: WebSocket) => {
      socket.on('framereceived', ({ payload }) => {
        for (const op of parseOperations(payload.toString())) this.listeners.forEach((listener) => listener(op));
      });
    });
  }

  /** Runs `action` and resolves with the properties of the first matching operation it caused. */
  @step('Wait for WS operation "{0}"')
  async waitForOperation<P = Record<string, unknown>>(
    name: OperationName,
    action: () => Promise<void>,
    { timeout = 10_000, predicate }: { timeout?: number; predicate?: (op: Operation) => boolean } = {},
  ): Promise<P> {
    let listener: FrameListener | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const match = new Promise<Operation>((resolve, reject) => {
      listener = (op) => {
        if (isOperation(op, name) && (!predicate || predicate(op))) resolve(op);
      };
      this.listeners.add(listener);
      timer = setTimeout(() => reject(new Error(`No "${name}" WS operation within ${timeout}ms`)), timeout);
    });
    try {
      await action();
      return (await match).properties as P;
    } finally {
      clearTimeout(timer);
      if (listener) this.listeners.delete(listener);
    }
  }
}
