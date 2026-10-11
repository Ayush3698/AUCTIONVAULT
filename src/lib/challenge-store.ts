export interface Challenge {
  address: string;
  message: string;
  expiresAt: number;
}

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const challenges = new Map<string, Challenge>();

export function setChallenge(nonce: string, challenge: Challenge): void {
  challenges.set(nonce, challenge);
}

export function takeChallenge(nonce: string): Challenge | null {
  if (!nonce) return null;
  const challenge = challenges.get(nonce);
  if (!challenge) return null;
  challenges.delete(nonce);
  if (challenge.expiresAt < Date.now()) return null;
  return challenge;
}

export { CHALLENGE_TTL_MS };