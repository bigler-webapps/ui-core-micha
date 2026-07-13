import { describe, expect, it } from 'vitest';
import { selectActiveSteps } from '../src/onboarding/stepSelection';

const context = {
  user: { first_name: 'Ada', last_name: 'Lovelace', accepted_convenience_cookies: true },
  pushState: { supported: true, subscribed: false },
};

const step = (id, condition, options = {}) => ({
  id,
  condition,
  persistDismissed: options.persistDismissed ?? false,
});

describe('selectActiveSteps', () => {
  it('excludes a config-disabled universal step', () => {
    const result = selectActiveSteps([step('cookie_consent', () => true)], { cookie_consent: false }, context);
    expect(result).toEqual([]);
  });

  it('excludes a persistently dismissed browser push step', () => {
    const result = selectActiveSteps(
      [step('browser_push', () => true, { persistDismissed: true })],
      { browser_push: true },
      context,
      new Set(['browser_push']),
    );
    expect(result).toEqual([]);
  });

  it('filters steps whose condition is not met', () => {
    const result = selectActiveSteps(
      [step('complete_name', (ctx) => !ctx.user.first_name)],
      { complete_name: true },
      context,
    );
    expect(result).toEqual([]);
  });

  it('preserves descriptor order for active universal steps', () => {
    const steps = [
      step('cookie_consent', () => true),
      step('complete_name', () => true),
      step('browser_push', () => true, { persistDismissed: true }),
    ];
    const result = selectActiveSteps(steps, {
      cookie_consent: true,
      complete_name: true,
      browser_push: true,
    }, context);
    expect(result.map((item) => item.id)).toEqual(['cookie_consent', 'complete_name', 'browser_push']);
  });
});
