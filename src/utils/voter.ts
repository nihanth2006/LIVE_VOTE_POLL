export function getVoterId(): string {
  const STORAGE_KEY = 'livepoll_anonymous_voter_id';
  let voterId = localStorage.getItem(STORAGE_KEY);
  if (!voterId) {
    voterId = `voter_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem(STORAGE_KEY, voterId);
  }
  return voterId;
}

export function resetVoterId(): string {
  const STORAGE_KEY = 'livepoll_anonymous_voter_id';
  const newId = `voter_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
  localStorage.setItem(STORAGE_KEY, newId);
  return newId;
}
