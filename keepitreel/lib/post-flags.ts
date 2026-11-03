import { cacheKey, type Item, type PostFlag } from './model';

export interface PostSample { item: Item; postText?: string; }
const lifetime = 15 * 60 * 1000;
const limit = 200;
// These are review patterns, not an AI detector or an account reputation score.
const educational = /\b(?:beware|warning|avoid|never|do not|don't|how to|tutorial|example|scam awareness|scam alert|news report)\b/i;
const contact = /\b(?:(?:dm|message|contact|whatsapp|telegram)\s+(?:me|us)|(?:dm|message|contact)\b.{0,35}\b(?:whatsapp|telegram)|click\s+(?:here|the link)|link in (?:my |our |the )?bio)\b/i;
const money = /\b(?:invest|investment|profit|returns?|earn|earning|giveaway|prize|crypto|cash|offer)\b/i;
const secret = /\b(?:send|share|give|provide)\s+(?:me\s+|us\s+)?your\s+(?:password|one[- ]time (?:code|password)|verification code|recovery phrase|seed phrase)\b/i;
export function textFlags(input: string): PostFlag[] {
  const value = input.slice(0, 4000).replace(/\s+/g, ' ').trim();
  if (!value || educational.test(value)) return [];
  const flags: PostFlag[] = [];
  if (secret.test(value)) flags.push({ code: 'spam-secret', kind: 'spam', title: 'Request for a private secret', detail: 'The post asks you to send or share a password, verification code or recovery phrase. This is a local text-pattern match, not proof of fraud or AI authorship.' });
  if (/\b(?:guaranteed|risk[- ]free|no risk)\b.{0,55}\b(?:profits?|returns?|earnings?|income)\b/i.test(value) && contact.test(value)) flags.push({ code: 'spam-return', kind: 'spam', title: 'Guaranteed returns with a contact request', detail: 'The post combines a claim of guaranteed or risk-free earnings with a request to contact someone or follow a promotional link. Legitimate context may be missing; review before acting.' });
  if (/\b(?:won|winner|claim|collect)\b.{0,45}\b(?:prize|giveaway|reward|winnings)\b/i.test(value) && /\b(?:pay|send|transfer)\b.{0,35}\b(?:fee|deposit|shipping|payment)\b/i.test(value)) flags.push({ code: 'spam-prize-fee', kind: 'spam', title: 'Payment requested to claim a prize', detail: 'The post pairs a prize or reward claim with a request to pay a fee or deposit. This pattern can appear in spam; it does not establish who created the post.' });
  return flags;
}
interface Seen { text: string; creator?: string; at: number; }
export class PostFlagger {
  private seen = new Map<string, Seen>();
  clear() { this.seen.clear(); }
  // Titles/captions stay only in this tab's memory: bounded, expiring, never uploaded.
  assess(samples: PostSample[], now = Date.now()): Map<string, PostFlag[]> {
    for (const [key, entry] of this.seen) if (now - entry.at >= lifetime) this.seen.delete(key);
    const current = samples.filter(sample => sample.item.platform !== 'google').slice(0, limit);
    for (const sample of current) {
      const key = cacheKey(sample.item);
      const text = (sample.postText ?? sample.item.title).slice(0, 4000).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 4000);
      const prior = this.seen.get(key);
      // Re-scans of an unchanged mounted card must not extend its retention window.
      if (prior?.text !== text || prior?.creator !== sample.item.creator) {
        this.seen.delete(key); this.seen.set(key, { text, creator: sample.item.creator, at: now });
      }
    }
    while (this.seen.size > limit) this.seen.delete(this.seen.keys().next().value!);
    const groups = new Map<string, { count: number; creators: Set<string> }>();
    for (const entry of this.seen.values()) {
      if (entry.text.length < 60 || educational.test(entry.text) || !contact.test(entry.text) || !money.test(entry.text)) continue;
      const group = groups.get(entry.text) ?? { count: 0, creators: new Set<string>() };
      group.count++; if (entry.creator) group.creators.add(entry.creator);
      groups.set(entry.text, group);
    }
    return new Map(current.map(sample => {
      const key = cacheKey(sample.item), entry = this.seen.get(key);
      const flags = textFlags(sample.postText ?? sample.item.title);
      const group = entry && groups.get(entry.text);
      if (group && group.count >= 3 && group.creators.size >= 2) flags.push({ code: 'spam-repeat', kind: 'spam', title: 'Repeated promotional text', detail: 'The same promotional wording appeared in at least three distinct posts from multiple creators checked in this tab within the past 15 minutes. Reposts or legitimate promotions can also match; this does not prove automation or AI authorship.' });
      return [key, flags];
    }));
  }
}
