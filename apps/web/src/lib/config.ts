// API configuration - uses Vite env files (.env.development, .env.production)
export const config = {
  partyHost: import.meta.env.VITE_PARTY_HOST,

  get apiBaseUrl() {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${this.partyHost}`;
  },

  get wsBaseUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${this.partyHost}`;
  },
};
