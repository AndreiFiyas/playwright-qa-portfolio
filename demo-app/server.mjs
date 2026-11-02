// DocFlow — a tiny self-contained document editor used as the system under test.
// It mimics the shape of a real collaborative editor (REST + WebSocket operations,
// async export jobs, versions, reconnect with resume) without any external dependency.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT ?? 4310);
const PUBLIC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/** In-memory state. Every test creates its own user, so tests never share data. */
const users = new Map(); // id -> { id, email, password, plan }
const sessions = new Map(); // token -> userId
const documents = new Map(); // id -> document
const exportJobs = new Map(); // id -> job
let nextDocumentId = 1000;

// ---------------------------------------------------------------- helpers

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
};

const parseCookies = (header = '') =>
  Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([key]) => key),
  );

const authenticate = (req) => {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const token = bearer || parseCookies(req.headers.cookie).session;
  const userId = token && sessions.get(token);
  return userId ? users.get(userId) : undefined;
};

const isEmail = (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const publicDocument = (doc) => ({
  id: doc.id,
  name: doc.name,
  pageCount: doc.pageOrder.length,
  pageOrder: doc.pageOrder,
  elements: doc.elements,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const versionList = (doc) =>
  doc.versions.map(({ id, label, createdAt, elementCount }) => ({ id, label, createdAt, elementCount }));

// ---------------------------------------------------------------- REST API

const routes = [
  // Disposable test users — the equivalent of a "create test user" backend helper.
  [
    'POST',
    /^\/api\/users$/,
    async (req, res) => {
      const body = await readBody(req);
      const plan = body?.plan === 'free' ? 'free' : 'paid';
      const id = randomUUID();
      const user = { id, email: `user-${id.slice(0, 8)}@example.test`, password: randomUUID(), plan };
      users.set(id, user);
      json(res, 201, user);
    },
  ],
  [
    'POST',
    /^\/api\/auth\/login$/,
    async (req, res) => {
      const body = await readBody(req);
      const user = [...users.values()].find((u) => u.email === body?.email && u.password === body?.password);
      if (!user) return json(res, 401, { error: 'INVALID_CREDENTIALS' });
      const token = randomUUID();
      sessions.set(token, user.id);
      json(res, 200, { token, userId: user.id, expiresIn: 3600 });
    },
  ],
  [
    'GET',
    /^\/api\/documents$/,
    async (req, res, user) => {
      const list = [...documents.values()].filter((d) => d.ownerId === user.id).map(publicDocument);
      json(res, 200, { items: list, total: list.length });
    },
  ],
  [
    'POST',
    /^\/api\/documents$/,
    async (req, res, user) => {
      const body = await readBody(req);
      const pages = Number(body?.pages ?? 3);
      if (!body || typeof body.name !== 'string' || !body.name.trim()) {
        return json(res, 422, { error: 'VALIDATION_ERROR', field: 'name' });
      }
      if (!Number.isInteger(pages) || pages < 1 || pages > 20) {
        return json(res, 422, { error: 'VALIDATION_ERROR', field: 'pages' });
      }
      const now = new Date().toISOString();
      const doc = {
        id: nextDocumentId++,
        ownerId: user.id,
        name: body.name.trim(),
        pageOrder: Array.from({ length: pages }, (_, i) => i + 1),
        elements: [],
        versions: [],
        seq: 0,
        log: [],
        createdAt: now,
        updatedAt: now,
      };
      documents.set(doc.id, doc);
      json(res, 201, publicDocument(doc));
    },
  ],
  [
    'GET',
    /^\/api\/documents\/(\d+)$/,
    async (req, res, user, [id]) => {
      const doc = documents.get(Number(id));
      if (!doc || doc.ownerId !== user.id) return json(res, 404, { error: 'NOT_FOUND' });
      json(res, 200, publicDocument(doc));
    },
  ],
  [
    'PATCH',
    /^\/api\/documents\/(\d+)$/,
    async (req, res, user, [id]) => {
      const doc = documents.get(Number(id));
      if (!doc || doc.ownerId !== user.id) return json(res, 404, { error: 'NOT_FOUND' });
      const body = await readBody(req);
      if (typeof body?.name !== 'string' || !body.name.trim()) {
        return json(res, 422, { error: 'VALIDATION_ERROR', field: 'name' });
      }
      doc.name = body.name.trim();
      doc.updatedAt = new Date().toISOString();
      json(res, 200, publicDocument(doc));
    },
  ],
  [
    'DELETE',
    /^\/api\/documents\/(\d+)$/,
    async (req, res, user, [id]) => {
      const doc = documents.get(Number(id));
      if (!doc || doc.ownerId !== user.id) return json(res, 404, { error: 'NOT_FOUND' });
      documents.delete(doc.id);
      json(res, 204);
    },
  ],
  [
    'GET',
    /^\/api\/documents\/(\d+)\/versions$/,
    async (req, res, user, [id]) => {
      const doc = documents.get(Number(id));
      if (!doc || doc.ownerId !== user.id) return json(res, 404, { error: 'NOT_FOUND' });
      json(res, 200, { items: versionList(doc) });
    },
  ],
  // Async export: the job walks QUEUED -> PROCESSING -> COMPLETED, clients must poll.
  [
    'POST',
    /^\/api\/export\/(email|print)$/,
    async (req, res, user, [channel]) => {
      const body = await readBody(req);
      const doc = documents.get(Number(body?.documentId));
      if (!doc || doc.ownerId !== user.id) return json(res, 404, { error: 'NOT_FOUND' });
      if (channel === 'email' && !isEmail(body.to)) {
        return json(res, 422, { error: 'VALIDATION_ERROR', field: 'to' });
      }
      if (user.plan === 'free') return json(res, 402, { error: 'UPGRADE_REQUIRED' });
      const job = { id: randomUUID(), channel, documentId: doc.id, ownerId: user.id, createdAt: Date.now() };
      exportJobs.set(job.id, job);
      json(res, 202, { jobId: job.id, status: 'QUEUED' });
    },
  ],
  [
    'GET',
    /^\/api\/export\/jobs\/([\w-]+)$/,
    async (req, res, user, [id]) => {
      const job = exportJobs.get(id);
      if (!job || job.ownerId !== user.id) return json(res, 404, { error: 'NOT_FOUND' });
      const age = Date.now() - job.createdAt;
      const status = age < 300 ? 'QUEUED' : age < 900 ? 'PROCESSING' : 'COMPLETED';
      json(res, 200, { jobId: job.id, channel: job.channel, status });
    },
  ],
  [
    'POST',
    /^\/api\/share$/,
    async (req, res, user) => {
      const body = await readBody(req);
      if (!isEmail(body?.email)) return json(res, 400, { error: 'INVALID_EMAIL' });
      json(res, 200, { link: `/s/${randomUUID().slice(0, 12)}`, permission: body.permission ?? 'view' });
    },
  ],
  // Test-only hook: drop every live socket of a document to exercise reconnect + resume.
  [
    'POST',
    /^\/api\/debug\/documents\/(\d+)\/drop-connections$/,
    async (req, res, user, [id]) => {
      const sockets = [...wss.clients].filter((ws) => ws.documentId === Number(id));
      sockets.forEach((ws) => ws.terminate());
      json(res, 200, { dropped: sockets.length });
    },
  ],
];

// ---------------------------------------------------------------- static files

const PAGE_ROUTES = [
  [/^\/$/, 'index.html'],
  [/^\/login$/, 'login.html'],
  [/^\/editor\/\d+$/, 'editor.html'],
];

const serveStatic = async (pathname, res) => {
  const page = PAGE_ROUTES.find(([pattern]) => pattern.test(pathname));
  const relative = page ? page[1] : normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  try {
    const file = await readFile(join(PUBLIC_DIR, relative));
    res.writeHead(200, { 'content-type': MIME[extname(relative)] ?? 'application/octet-stream' });
    res.end(file);
  } catch {
    json(res, 404, { error: 'NOT_FOUND' });
  }
};

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  if (!pathname.startsWith('/api/')) return serveStatic(pathname, res);

  for (const [method, pattern, handler] of routes) {
    const match = pathname.match(pattern);
    if (!match || method !== req.method) continue;
    const isPublic = pathname === '/api/users' || pathname === '/api/auth/login';
    const user = authenticate(req);
    if (!isPublic && !user) return json(res, 401, { error: 'UNAUTHORIZED' });
    return handler(req, res, user, match.slice(1));
  }
  json(res, 404, { error: 'NOT_FOUND' });
});

// ---------------------------------------------------------------- WebSocket operations
// Frames follow a Socket.IO-like envelope: `42["operations",{"operations":[...]}]`.
// Each operation is { group, type, properties }. Clients resume by sending the last seq they saw.

const wss = new WebSocketServer({ server, path: '/ws' });

const frame = (operations) => `42${JSON.stringify(['operations', { operations }])}`;
const send = (ws, operations) => ws.readyState === ws.OPEN && ws.send(frame(operations));
const peers = (doc) => [...wss.clients].filter((ws) => ws.documentId === doc.id);

const applyOperation = (doc, op) => {
  const { group, type, properties = {} } = op;
  if (group === 'elements' && type === 'add') doc.elements.push(properties.element);
  if (group === 'elements' && type === 'remove') doc.elements = doc.elements.filter((e) => e.id !== properties.id);
  if (group === 'elements' && type === 'update') {
    doc.elements = doc.elements.map((e) => (e.id === properties.element.id ? properties.element : e));
  }
  if (group === 'pages' && type === 'reorder') doc.pageOrder = properties.pageOrder;
  doc.updatedAt = new Date().toISOString();
};

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const user = sessions.has(url.searchParams.get('token')) && users.get(sessions.get(url.searchParams.get('token')));
  const doc = documents.get(Number(url.searchParams.get('doc')));
  if (!user || !doc || doc.ownerId !== user.id) return ws.close(4401, 'unauthorized');

  ws.documentId = doc.id;
  ws.send(`0${JSON.stringify({ sid: randomUUID(), pingInterval: 25000 })}`);

  ws.on('message', (raw) => {
    let op;
    try {
      op = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (op.group === 'session' && op.type === 'init') {
      return send(ws, [
        { group: 'session', type: 'init', properties: { seq: doc.seq, document: publicDocument(doc) } },
        { group: 'versions', type: 'list', properties: { versions: versionList(doc) } },
      ]);
    }

    if (op.group === 'session' && op.type === 'resume') {
      // Resume: replay only what the client missed instead of a full re-init.
      const lastSeq = Number(op.properties?.lastSeq ?? 0);
      const missed = doc.log.filter((entry) => entry.seq > lastSeq);
      return send(ws, [
        { group: 'session', type: 'resumed', properties: { seq: doc.seq, replayed: missed.length } },
        ...missed,
        { group: 'versions', type: 'list', properties: { versions: versionList(doc) } },
      ]);
    }

    if (op.group === 'versions' && op.type === 'save') {
      doc.versions.unshift({
        id: randomUUID(),
        label: `Version ${doc.versions.length + 1}`,
        createdAt: new Date().toISOString(),
        elementCount: doc.elements.length,
      });
      const list = { group: 'versions', type: 'list', properties: { versions: versionList(doc) } };
      return peers(doc).forEach((peer) => send(peer, [list]));
    }

    if (op.group === 'versions' && op.type === 'list') {
      return send(ws, [{ group: 'versions', type: 'list', properties: { versions: versionList(doc) } }]);
    }

    if (op.group === 'elements' || op.group === 'pages') {
      applyOperation(doc, op);
      const entry = { ...op, seq: ++doc.seq };
      doc.log.push(entry);
      // Ack to the author, broadcast to everyone else.
      send(ws, [{ group: 'session', type: 'ack', properties: { seq: entry.seq } }]);
      peers(doc)
        .filter((peer) => peer !== ws)
        .forEach((peer) => send(peer, [entry]));
    }
  });
});

server.listen(PORT, () => console.log(`DocFlow demo app listening on http://localhost:${PORT}`));
