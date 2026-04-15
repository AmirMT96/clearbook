export type ParsedTransaction = {
  date: string | null;        // ISO date or null
  amount: number | null;
  merchant: string;
  vat_rate: 0 | 7 | 19;
  type_hint: 'EU' | null;
  is_tankstelle: boolean;
};

const SYSTEM = `Du bist ein deutscher Buchhalter-Assistent. Analysiere den Freitext und extrahiere strukturierte Daten.

Regeln:
- Datum: erkenne DDMM, DD.MM, "heute", "gestern", "vorgestern". Gib ISO Datum (YYYY-MM-DD) zurück wenn erkannt. Wenn nur Tag/Monat, nimm das aktuelle Jahr.
- Betrag: erkenne 12,30 oder 12.30 oder 12 (Euro). Komma = Dezimaltrenner.
- Händler: erstes Hauptwort (Großschreibung) oder erster identifizierbarer Begriff.
- vat_rate: 7 wenn "7%" im Text, 0 wenn "netto" oder "ohne mwst", sonst 19.
- type_hint: "EU" wenn "eu", "geschäft", "business", "arbeit" im Text, sonst null.
- is_tankstelle: true wenn "tank", "tankstelle", "aral", "shell", "esso", "total", "jet" im Text.

Antworte NUR mit gültigem JSON ohne Markdown, kein Prefix:
{"date": "YYYY-MM-DD" | null, "amount": 12.30 | null, "merchant": "Aldi", "vat_rate": 19, "type_hint": "EU" | null, "is_tankstelle": false}`;

export async function parseTransaction(input: string, today: string): Promise<ParsedTransaction> {
  const key = process.env.CLAUDE_API_KEY;
  if (!key) throw new Error('CLAUDE_API_KEY fehlt');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: SYSTEM + `\n\nHeutiges Datum: ${today}`,
      messages: [{ role: 'user', content: input }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API Fehler: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? '{}';
  const json = text.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
  return JSON.parse(json) as ParsedTransaction;
}
