import { useEffect, useState } from 'react';
import { nextRuleExpiry, ruleDurations, type RuleDuration } from '../lib/filter-rules';

export function DurationSelect({ value, onChange, disabled = false }: {
  value: RuleDuration;
  onChange: (duration: RuleDuration) => void;
  disabled?: boolean;
}) {
  return <label>Duration
    <select value={value} onChange={event => onChange(event.target.value as RuleDuration)} disabled={disabled}>
      {ruleDurations.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
    </select>
  </label>;
}

/** Refresh expiry labels while a settings page stays open, including after device sleep. */
export function useRuleClock(rules: { expiresAt?: number }[]): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const current = Date.now();
    const expiry = nextRuleExpiry(rules, current);
    const refresh = () => setTick(value => value + 1);
    const timer = expiry === undefined ? undefined : setTimeout(refresh, Math.min(expiry - current + 25, 2_147_483_647));
    document.addEventListener('visibilitychange', refresh);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [rules, tick]);
  return Date.now();
}
