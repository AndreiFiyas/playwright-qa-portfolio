/** Shared helpers for the custom rules. */
export const isSpecFile = (filename) => /\.spec\.ts$/.test(filename);
export const isUiLayerFile = (filename) => /[\\/]src[\\/]ui[\\/]/.test(filename);

export const calleeName = (node) => {
  const callee = node.callee;
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') return callee.property.name;
  return undefined;
};

export const rule = (meta, create) => ({ meta: { type: 'problem', schema: [], ...meta }, create });
