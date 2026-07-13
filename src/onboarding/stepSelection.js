/**
 * Pure onboarding step selection.
 *
 * @param {Array} descriptors Step descriptors in display order.
 * @param {Object} configMap Enabled state keyed by dcm onboarding step key.
 * @param {Object} ctx Runtime context supplied to each step condition.
 * @param {Set} dismissedSet Persistently dismissed step ids.
 * @returns {Array} Steps that should be shown.
 */
export function selectActiveSteps(descriptors, configMap, ctx, dismissedSet = new Set()) {
  return descriptors.filter((step) => {
    if (configMap[step.id] === false) return false;
    if (step.persistDismissed && dismissedSet.has(step.id)) return false;
    return step.condition(ctx);
  });
}
