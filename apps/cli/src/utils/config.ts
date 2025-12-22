export async function getWorkerUrl(isRemote: boolean): Promise<string> {
  if (isRemote) {
    // Production Worker URL
    return 'https://rank-everything-api.lasseanordahl.workers.dev';
  }

  // Local PartyKit dev server
  return 'http://127.0.0.1:8787'; // Worker is on 8787, PartySocket on 1999
}
