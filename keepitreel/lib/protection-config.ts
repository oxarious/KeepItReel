export const mailHosts = ['mail.google.com', 'outlook.live.com', 'outlook.office.com', 'outlook.office365.com', 'outlook.cloud.microsoft'];
export const accessOrigins = {
  websites: ['http://*/*', 'https://*/*'],
  email: mailHosts.map(host => `https://${host}/*`),
};
export const excludedMatches = ['*://linkedin.com/*', '*://*.linkedin.com/*'];
export const excludedHost = (host: string) => host === 'linkedin.com' || host.endsWith('.linkedin.com');
