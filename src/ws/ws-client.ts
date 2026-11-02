import WebSocket from 'ws';
import { isOperation, parseOperations, type Operation, type OperationName } from '@ws/operations';

type Listener = (op: Operation) => void;

/**
 * Node-side protocol client: talks to the editor's WebSocket without a browser.
 * Used for fast protocol tests and for seeding documents in setup.
 *
 * The important rule: a collector must be armed BEFORE the trigger is sent,
 * because a broadcast can arrive before the trigger's own reply.
 */
export class WsClient {
  private readonly listeners = new Set<Listener>();
  readonly received: Operation[] = [];

  private constructor(private readonly socket: WebSocket) {
    socket.on('message', (data) => {
      for (const op of parseOperations(data.toString())) {
        this.received.push(op);
        this.listeners.forEach((listener) => listener(op));
      }
    });
  }

  static async connect(baseURL: string, documentId: number, token: string, { init = true } = {}): Promise<WsClient> {
    const url = `${baseURL.replace(/^http/, 'ws')}/ws?doc=${documentId}&token=${token}`;
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.once('open', () => resolve());
      socket.once('error', reject);
    });
    const client = new WsClient(socket);
    if (init) {
      const ready = client.waitFor('sessionInit');
      client.send({ group: 'session', type: 'init' });
      await ready;
    }
    return client;
  }

  /** Connect expecting the server to refuse; resolves with the close code. */
  static async connectRejected(baseURL: string, documentId: number, token: string): Promise<number> {
    const socket = new WebSocket(`${baseURL.replace(/^http/, 'ws')}/ws?doc=${documentId}&token=${token}`);
    return new Promise((resolve) => socket.once('close', (code) => resolve(code)));
  }

  send(op: Operation): void {
    this.socket.send(JSON.stringify(op));
  }

  /** Resolves with the first matching operation received after the call. */
  waitFor(name: OperationName, predicate: (op: Operation) => boolean = () => true, timeout = 5_000): Promise<Operation> {
    return this.collect((ops) => ops.some((op) => isOperation(op, name) && predicate(op)), timeout).then(
      (ops) => ops.find((op) => isOperation(op, name) && predicate(op))!,
    );
  }

  /** Gathers every operation received after the call until `done(ops)` holds. */
  collect(done: (ops: Operation[]) => boolean, timeout = 5_000): Promise<Operation[]> {
    const ops: Operation[] = [];
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.listeners.delete(listener);
        reject(new Error(`Timed out after ${timeout}ms. Received: ${JSON.stringify(ops.map(({ group, type }) => `${group}/${type}`))}`));
      }, timeout);
      const listener: Listener = (op) => {
        ops.push(op);
        if (done(ops)) {
          clearTimeout(timer);
          this.listeners.delete(listener);
          resolve(ops);
        }
      };
      this.listeners.add(listener);
    });
  }

  /** Records everything until stopped — for asserting that something did NOT arrive. */
  record(): { operations: Operation[]; stop: () => Operation[] } {
    const operations: Operation[] = [];
    const listener: Listener = (op) => operations.push(op);
    this.listeners.add(listener);
    return { operations, stop: () => (this.listeners.delete(listener), operations) };
  }

  /** Sends a mutation and resolves with the server's ack (carries the assigned seq). */
  async sendAndConfirm(op: Operation): Promise<number> {
    const ack = this.waitFor('ack');
    this.send(op);
    return Number((await ack).properties?.seq);
  }

  async close(): Promise<void> {
    if (this.socket.readyState === WebSocket.CLOSED) return;
    await new Promise<void>((resolve) => {
      this.socket.once('close', () => resolve());
      this.socket.close();
    });
  }
}
