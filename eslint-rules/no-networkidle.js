import { rule } from './utils.js';

/** `networkidle` waits for silence that a socket-based app never reaches; wait for UI state instead. */
export default rule(
  {
    docs: { description: "Disallow the 'networkidle' load state" },
    messages: { noNetworkIdle: "Don't wait for 'networkidle': it hangs on WebSocket apps and hides the real readiness signal. Wait for a UI state instead." },
  },
  (context) => ({
    Literal(node) {
      if (node.value === 'networkidle') context.report({ node, messageId: 'noNetworkIdle' });
    },
  }),
);
