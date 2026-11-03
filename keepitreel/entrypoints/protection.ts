import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script';
import { startProtection } from '../lib/protection';
import { excludedHost } from '../lib/protection-config';

export default defineUnlistedScript(() => {
  if (excludedHost(location.hostname)) return;
  const isolated = window as Window & { clearfeedProtectionStarted?: boolean };
  if (isolated.clearfeedProtectionStarted) return;
  isolated.clearfeedProtectionStarted = true;
  void startProtection().catch(() => { isolated.clearfeedProtectionStarted = false; });
});
