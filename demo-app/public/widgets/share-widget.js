// A micro-frontend that is normally loaded by a host shell. It talks to its own backend
// (REST + realtime socket) and calls into host-provided services (feedback, logger).
// Component tests mount it alone on a harness page with every dependency faked.

const MESSAGES = {
  INVALID_EMAIL: 'Enter a valid email address',
  RATE_LIMITED: 'Too many invites. Try again later',
  GENERIC: 'Something went wrong',
};

export async function mount(root, config, host) {
  const base = config.api.baseUrl;
  root.innerHTML = `
    <section class="card" data-qa="shareWidget">
      <h2 data-qa="shareTitle">Share</h2>
      <form data-qa="shareForm" novalidate>
        <label>Email <input data-qa="shareEmailInput" type="email" /></label>
        <label>Permission
          <select data-qa="sharePermissionSelect"></select>
        </label>
        <button data-qa="shareSubmitButton" type="submit">Share</button>
      </form>
      <p class="error" data-qa="shareError" role="alert" hidden></p>
      <p data-qa="shareLink" hidden></p>
      <ul data-qa="recipientList"></ul>
      <button data-qa="giveFeedbackButton" type="button">Give feedback</button>
    </section>`;
  const qa = (tag) => root.querySelector(`[data-qa="${tag}"]`);

  const settings = await fetch(`${base}/documents/${config.documentId}/share-settings`).then((r) => r.json());
  qa('shareTitle').textContent = `Share “${settings.name}”`;
  qa('sharePermissionSelect').innerHTML = settings.permissions
    .map((p) => `<option value="${p}">${p}</option>`)
    .join('');

  const renderRecipients = (recipients) => {
    qa('recipientList').innerHTML = recipients
      .map((r) => `<li data-qa="recipientRow" data-email="${r.email}">${r.email} — <span data-qa="recipientStatus">${r.status}</span></li>`)
      .join('');
  };
  let recipients = settings.sharedWith;
  renderRecipients(recipients);

  qa('shareForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const error = qa('shareError');
    error.hidden = true;
    const email = qa('shareEmailInput').value;
    const response = await fetch(`${base}/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ documentId: config.documentId, email, permission: qa('sharePermissionSelect').value }),
    });
    if (!response.ok) {
      const key = response.status === 400 ? 'INVALID_EMAIL' : response.status === 429 ? 'RATE_LIMITED' : 'GENERIC';
      if (key === 'GENERIC') host.logger.error('share failed', { status: response.status });
      error.textContent = MESSAGES[key];
      error.hidden = false;
      return;
    }
    const { link } = await response.json();
    qa('shareLink').textContent = link;
    qa('shareLink').hidden = false;
    recipients = [...recipients, { email, status: 'Pending' }];
    renderRecipients(recipients);
  });

  qa('giveFeedbackButton').addEventListener('click', () => host.feedback.open({ source: 'share-widget' }));

  // Realtime: the backend pushes invite status changes nobody asked for.
  const socket = new WebSocket(`${config.api.realtimeUrl}?doc=${config.documentId}`);
  socket.addEventListener('open', () => socket.send(JSON.stringify({ type: 'subscribe', documentId: config.documentId })));
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'invite-accepted') {
      recipients = recipients.map((r) => (r.email === message.email ? { ...r, status: 'Accepted' } : r));
      renderRecipients(recipients);
    }
  });
}
