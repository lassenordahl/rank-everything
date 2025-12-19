// API configuration - uses Vite env files (.env.development, .env.production)
export const config = {
  // Use VITE_PARTY_HOST if defined (production), otherwise fallback to current host (for Vite proxy)
  partyHost: import.meta.env.VITE_PARTY_HOST || window.location.host,

  get apiBaseUrl() {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${this.partyHost}`;
  },

  get wsBaseUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${this.partyHost}`;
  },
};

console.log(`[Config] Using Party Host: ${config.partyHost}`);
