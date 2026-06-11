export type EmailAnalysis = {
  sentiment: "positive" | "negative" | "neutral";
  reasoning: string;
  suggestedReply: string;
};

const store = new Map<string, EmailAnalysis>();

export function getAnalysis(messageId: string): EmailAnalysis | null {
  return store.get(messageId) || null;
}

export function setAnalysis(messageId: string, analysis: EmailAnalysis): void {
  store.set(messageId, analysis);
}

export function hasAnalysis(messageId: string): boolean {
  return store.has(messageId);
}
