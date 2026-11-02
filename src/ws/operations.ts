/** Operation envelope shared by the WebSocket protocol tests and the browser frame helpers. */
export type Operation<P = Record<string, unknown>> = {
  group: string;
  type: string;
  properties?: P;
  seq?: number;
};

export const OPERATIONS = {
  sessionInit: { group: 'session', type: 'init' },
  sessionResume: { group: 'session', type: 'resume' },
  sessionResumed: { group: 'session', type: 'resumed' },
  ack: { group: 'session', type: 'ack' },
  versionsSave: { group: 'versions', type: 'save' },
  versionsList: { group: 'versions', type: 'list' },
  elementAdd: { group: 'elements', type: 'add' },
  elementRemove: { group: 'elements', type: 'remove' },
  pagesReorder: { group: 'pages', type: 'reorder' },
} as const;

export type OperationName = keyof typeof OPERATIONS;

/**
 * Parses a Socket.IO-style frame: `42["operations",{"operations":[...]}]`.
 * Returns [] for handshake/ping frames and anything that is not an operations event.
 */
export function parseOperations(frame: string): Operation[] {
  if (!frame.startsWith('42')) return [];
  try {
    const [event, payload] = JSON.parse(frame.slice(2)) as [string, { operations?: Operation[] }];
    return event === 'operations' ? (payload.operations ?? []) : [];
  } catch {
    return [];
  }
}

export const isOperation = (op: Operation, name: OperationName): boolean =>
  op.group === OPERATIONS[name].group && op.type === OPERATIONS[name].type;
