// DocFlow editor client. Intentionally contains the same classes of timing behaviour
// that make real editors hard to test: a debounced undo history, a late "fit width"
// rescale that resets scroll, async export jobs and WebSocket reconnects.

const $ = (selector, root = document) => root.querySelector(selector);
const qa = (tag, root = document) => $(`[data-qa="${tag}"]`, root);

const HISTORY_DEBOUNCE_MS = 400;
const LATE_RESCALE_MS = 700;
const RECONNECT_DELAY_MS = 500;

const documentId = Number(location.pathname.split('/').pop());
const token = document.cookie.match(/(?:^|;\s*)session=([^;]+)/)?.[1];

const state = {
  doc: null,
  tool: null,
  selectedId: null,
  seq: 0,
  history: [], // committed snapshots of `elements`
  future: [],
  pendingCommit: null,
  ws: null,
  hasConnected: false,
};

// ---------------------------------------------------------------- API

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = response.status === 204 ? undefined : await response.json();
  return { ok: response.ok, status: response.status, body };
};

// ---------------------------------------------------------------- WebSocket

const connect = () => {
  setConnection('connecting');
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${protocol}://${location.host}/ws?doc=${documentId}&token=${token}`);
  state.ws = ws;

  ws.addEventListener('open', () => {
    // First connect asks for the full state; a reconnect resumes from the last seq it saw.
    if (state.hasConnected) sendOp({ group: 'session', type: 'resume', properties: { lastSeq: state.seq } });
    else sendOp({ group: 'session', type: 'init' });
    state.hasConnected = true;
  });
  ws.addEventListener('message', (event) => {
    if (!event.data.startsWith('42')) return;
    const [, payload] = JSON.parse(event.data.slice(2));
    payload.operations.forEach(handleOperation);
  });
  ws.addEventListener('close', () => {
    setConnection('reconnecting');
    setTimeout(connect, RECONNECT_DELAY_MS);
  });
};

const sendOp = (op) => state.ws?.readyState === WebSocket.OPEN && state.ws.send(JSON.stringify(op));

const handleOperation = ({ group, type, properties = {}, seq }) => {
  if (seq) state.seq = Math.max(state.seq, seq);
  if (group === 'session' && type === 'init') {
    state.seq = properties.seq;
    state.doc = properties.document;
    render();
    setConnection('connected');
  }
  if (group === 'session' && type === 'resumed') setConnection('connected');
  if (group === 'session' && type === 'ack') state.seq = Math.max(state.seq, properties.seq);
  if (group === 'versions' && type === 'list') renderVersions(properties.versions);
  if (group === 'elements' && type === 'add') {
    if (!state.doc.elements.some((e) => e.id === properties.element.id)) state.doc.elements.push(properties.element);
    renderElements();
  }
  if (group === 'elements' && type === 'remove') {
    state.doc.elements = state.doc.elements.filter((e) => e.id !== properties.id);
    renderElements();
  }
  if (group === 'elements' && type === 'update') {
    state.doc.elements = state.doc.elements.map((e) => (e.id === properties.element.id ? properties.element : e));
    renderElements();
  }
  if (group === 'pages' && type === 'reorder') {
    state.doc.pageOrder = properties.pageOrder;
    render();
  }
};

const setConnection = (value) => {
  const badge = qa('connectionStatus');
  badge.dataset.state = value;
  badge.textContent = { connecting: 'Connecting…', connected: 'Connected', reconnecting: 'Reconnecting…' }[value];
};

// ---------------------------------------------------------------- history (debounced)

const snapshot = () => structuredClone(state.doc.elements);

// Changes are grouped: the snapshot is committed only after HISTORY_DEBOUNCE_MS of quiet.
// A test that clicks Undo right after an edit (before the commit) sees nothing happen.
const scheduleHistoryCommit = (before) => {
  if (!state.pendingCommit) state.pendingCommit = { before };
  clearTimeout(state.pendingCommit.timer);
  state.pendingCommit.timer = setTimeout(() => {
    state.history.push(state.pendingCommit.before);
    state.future = [];
    state.pendingCommit = null;
    renderHistoryButtons();
  }, HISTORY_DEBOUNCE_MS);
};

const restore = (elements) => {
  const current = state.doc.elements;
  current.filter((e) => !elements.some((x) => x.id === e.id)).forEach((e) => sendOp(removeOp(e.id)));
  elements.filter((e) => !current.some((x) => x.id === e.id)).forEach((e) => sendOp(addOp(e)));
  state.doc.elements = elements;
  state.selectedId = null;
  renderElements();
};

const undo = () => {
  if (!state.history.length) return;
  state.future.push(snapshot());
  restore(state.history.pop());
  renderHistoryButtons();
};

const redo = () => {
  if (!state.future.length) return;
  state.history.push(snapshot());
  restore(state.future.pop());
  renderHistoryButtons();
};

const renderHistoryButtons = () => {
  qa('undoButton').disabled = !state.history.length;
  qa('redoButton').disabled = !state.future.length;
};

// ---------------------------------------------------------------- elements

const addOp = (element) => ({ group: 'elements', type: 'add', properties: { element } });
const removeOp = (id) => ({ group: 'elements', type: 'remove', properties: { id } });

const formatToday = () =>
  new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' }).format(
    new Date(),
  );

const createElement = (tool, page, x, y) => {
  const content = { text: 'Text', checkmark: '✓', stamp: `APPROVED · ${formatToday()}` }[tool];
  return { id: crypto.randomUUID(), type: tool, page, x: Math.round(x), y: Math.round(y), content };
};

const addElement = (element) => {
  const before = snapshot();
  state.doc.elements.push(element);
  sendOp(addOp(element));
  scheduleHistoryCommit(before);
  renderElements();
  select(element.id);
};

const removeElement = (id) => {
  const before = snapshot();
  state.doc.elements = state.doc.elements.filter((e) => e.id !== id);
  sendOp(removeOp(id));
  scheduleHistoryCommit(before);
  state.selectedId = null;
  renderElements();
};

const select = (id) => {
  state.selectedId = id;
  renderElements();
  const node = id && $(`[data-element-id="${id}"]`);
  node?.focus();
  const bar = qa('selectedActionsBar');
  bar.hidden = !id;
};

// ---------------------------------------------------------------- rendering

const render = () => {
  qa('documentTitle').textContent = state.doc.name;
  renderPages();
  renderThumbnails();
  renderElements();
};

const renderPages = () => {
  const area = qa('documentArea');
  area.innerHTML = '';
  state.doc.pageOrder.forEach((pageNumber, index) => {
    const page = document.createElement('div');
    page.className = 'page';
    page.dataset.qa = 'page';
    page.dataset.pageNumber = String(pageNumber);
    page.dataset.pageIndex = String(index);
    page.innerHTML = `<span class="page__label">Page ${pageNumber}</span>`;
    area.append(page);
  });
};

const renderThumbnails = () => {
  const sidebar = qa('thumbnails');
  sidebar.innerHTML = '';
  state.doc.pageOrder.forEach((pageNumber, index) => {
    const thumb = document.createElement('div');
    thumb.className = 'thumbnail';
    thumb.dataset.qa = 'pageThumbnail';
    thumb.dataset.pageNumber = String(pageNumber);
    thumb.innerHTML = `
      <button class="thumbnail__open" type="button" data-qa="openPageButton">${pageNumber}</button>
      <button type="button" data-qa="movePageUpButton" aria-label="Move page ${pageNumber} up" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" data-qa="movePageDownButton" aria-label="Move page ${pageNumber} down" ${
        index === state.doc.pageOrder.length - 1 ? 'disabled' : ''
      }>↓</button>`;
    sidebar.append(thumb);
  });
  updateActiveThumbnail();
};

const renderElements = () => {
  document.querySelectorAll('[data-qa="documentElement"]').forEach((node) => node.remove());
  state.doc.elements.forEach((element) => {
    const page = $(`[data-qa="page"][data-page-number="${element.page}"]`);
    if (!page) return;
    const node = document.createElement('div');
    node.className = `element element--${element.type}`;
    node.dataset.qa = 'documentElement';
    node.dataset.type = element.type;
    node.dataset.elementId = element.id;
    node.tabIndex = 0;
    node.style.left = `${element.x}px`;
    node.style.top = `${element.y}px`;
    node.textContent = element.content;
    node.setAttribute('aria-selected', String(element.id === state.selectedId));
    page.append(node);
  });
  qa('selectedActionsBar').hidden = !state.selectedId;
};

const renderVersions = (versions) => {
  const body = $('tbody', qa('versionsTable'));
  body.innerHTML = versions
    .map(
      (v) =>
        `<tr data-qa="versionRow"><td>${v.label}</td><td>${v.elementCount} elements</td></tr>`,
    )
    .join('');
};

const updateActiveThumbnail = () => {
  const area = qa('documentArea');
  const pages = [...area.querySelectorAll('[data-qa="page"]')];
  const active = pages.find((page) => page.offsetTop + page.offsetHeight / 2 > area.scrollTop) ?? pages[0];
  document.querySelectorAll('[data-qa="pageThumbnail"]').forEach((thumb) => {
    thumb.classList.toggle('thumbnail--active', thumb.dataset.pageNumber === active?.dataset.pageNumber);
  });
};

const showToast = (text) => {
  const toast = qa('toast');
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => (toast.hidden = true), 4000);
};

// ---------------------------------------------------------------- export

const waitForJob = async (jobId) => {
  for (let attempt = 0; attempt < 40; attempt++) {
    const { body } = await api(`/api/export/jobs/${jobId}`);
    if (body.status === 'COMPLETED') return body;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Export timed out');
};

const openEmailModal = () => {
  const modal = qa('emailModal');
  modal.hidden = false;
  qa('emailError').hidden = true;
  $('form', modal).reset();
  qa('subjectInput').value = state.doc.name;
  qa('recipientInput').focus();
};

const sendEmail = async (event) => {
  event.preventDefault();
  const error = qa('emailError');
  const { ok, status, body } = await api('/api/export/email', {
    method: 'POST',
    body: JSON.stringify({ documentId, to: qa('recipientInput').value, subject: qa('subjectInput').value }),
  });
  if (!ok) {
    error.textContent = status === 422 ? 'Enter a valid email address' : status === 402 ? 'Upgrade to send documents' : 'Something went wrong';
    error.hidden = false;
    return;
  }
  qa('emailModal').hidden = true;
  showToast('Sending…');
  await waitForJob(body.jobId);
  showToast('Email sent');
};

const print = async () => {
  const { ok, body } = await api('/api/export/print', { method: 'POST', body: JSON.stringify({ documentId }) });
  if (!ok) return showToast('Something went wrong');
  await waitForJob(body.jobId);
  window.print();
  showToast('Ready to print');
};

// ---------------------------------------------------------------- events

const bindEvents = () => {
  qa('toolbar').addEventListener('click', (event) => {
    const button = event.target.closest('[data-tool]');
    if (button) {
      state.tool = state.tool === button.dataset.tool ? null : button.dataset.tool;
      document.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === state.tool)));
      qa('toolsList').classList.remove('toolbar__tools--open');
    }
  });
  qa('toolsMenuButton').addEventListener('click', (event) => {
    const list = qa('toolsList');
    list.classList.toggle('toolbar__tools--open');
    event.currentTarget.setAttribute('aria-expanded', String(list.classList.contains('toolbar__tools--open')));
  });
  qa('undoButton').addEventListener('click', undo);
  qa('redoButton').addEventListener('click', redo);

  qa('documentArea').addEventListener('click', (event) => {
    const elementNode = event.target.closest('[data-qa="documentElement"]');
    if (elementNode) return select(elementNode.dataset.elementId);
    const page = event.target.closest('[data-qa="page"]');
    if (!page) return select(null);
    if (!state.tool) return select(null);
    const rect = page.getBoundingClientRect();
    addElement(createElement(state.tool, Number(page.dataset.pageNumber), event.clientX - rect.left, event.clientY - rect.top));
  });
  qa('documentArea').addEventListener('scroll', updateActiveThumbnail);

  qa('documentArea').addEventListener('keydown', (event) => {
    if ((event.key === 'Delete' || event.key === 'Backspace') && state.selectedId) removeElement(state.selectedId);
    if (event.key === 'Escape') select(null);
  });

  qa('deleteElementButton').addEventListener('click', () => state.selectedId && removeElement(state.selectedId));
  qa('duplicateElementButton').addEventListener('click', () => {
    const source = state.doc.elements.find((e) => e.id === state.selectedId);
    if (source) addElement({ ...source, id: crypto.randomUUID(), x: source.x + 24, y: source.y + 24 });
  });

  qa('thumbnails').addEventListener('click', (event) => {
    const thumb = event.target.closest('[data-qa="pageThumbnail"]');
    if (!thumb) return;
    const pageNumber = Number(thumb.dataset.pageNumber);
    const order = [...state.doc.pageOrder];
    const index = order.indexOf(pageNumber);
    if (event.target.closest('[data-qa="openPageButton"]')) {
      $(`[data-qa="page"][data-page-number="${pageNumber}"]`).scrollIntoView();
      return;
    }
    const shift = event.target.closest('[data-qa="movePageUpButton"]') ? -1 : event.target.closest('[data-qa="movePageDownButton"]') ? 1 : 0;
    if (!shift) return;
    [order[index], order[index + shift]] = [order[index + shift], order[index]];
    state.doc.pageOrder = order;
    sendOp({ group: 'pages', type: 'reorder', properties: { pageOrder: order } });
    render();
  });

  qa('saveVersionButton').addEventListener('click', () => sendOp({ group: 'versions', type: 'save' }));
  qa('emailButton').addEventListener('click', openEmailModal);
  qa('cancelEmailButton').addEventListener('click', () => (qa('emailModal').hidden = true));
  $('form', qa('emailModal')).addEventListener('submit', sendEmail);
  qa('printButton').addEventListener('click', print);
};

// ---------------------------------------------------------------- bootstrap

const bootstrap = async () => {
  if (!token) return location.assign('/login');
  bindEvents();
  const { ok, body } = await api(`/api/documents/${documentId}`);
  if (!ok) {
    qa('documentTitle').textContent = 'Document not found';
    return;
  }
  state.doc = body;
  render();
  connect();
  // "Fit width" lands after the first paint and resets the scroll position —
  // a test that scrolls too early gets thrown back to page 1.
  setTimeout(() => {
    qa('documentArea').classList.add('document--fit-width');
    qa('documentArea').scrollTop = 0;
    updateActiveThumbnail();
  }, LATE_RESCALE_MS);
};

bootstrap();
