export function validateText(value: unknown): { text: string; credits: number } {
  if (typeof value !== 'string' || value.length > 50000) throw new Error('Use 300–1,000 words, up to 50,000 characters.');
  const text = value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  if (words < 300 || words > 1000) throw new Error('Use an English passage of 300–1,000 words.');
  return { text, credits: Math.ceil(words / 100) };
}
export function summarizeResult(data: Record<string, unknown>, model: string) {
  const prediction = data.prediction_short;
  return {
    label: prediction === 'AI' ? 'Likely AI-generated' : prediction === 'Human' ? 'No strong AI signal' : 'Uncertain / mixed authorship',
    model,
  };
}
export function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
