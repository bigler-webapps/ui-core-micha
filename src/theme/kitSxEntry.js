/**
 * One registry entry: a kit-owned sx object paired with the baseline-styled MUI key it targets.
 * Lives apart from kitSxRegistry so a sub-path registry can build entries without importing every kit component.
 */
export const createKitSxEntry = (component, muiComponent, sx, exportName, slots) => ({
  component,
  muiComponent,
  sx,
  slots,
  exportName,
});
