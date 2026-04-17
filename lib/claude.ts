export type ParsedEntry = {
  date: string | null;        // ISO date or null (null = today)
  amount: number | null;
  merchant: string;
  suffix: 'privat' | 'ust' | 'ust7' | 'noust' | 'gb' | 'plus' | 'plus_ust' | 'rec' | null;
  vat_rate: 0 | 7 | 19;
  note: string | null;        // text after "."
  category_hint: string | null; // e.g. "Haushalt", "Essen" — Claude's best guess
};

const SYSTEM = `Du bist ein deutscher Buchhalter-Assistent. Analysiere den Freitext und extrahiere strukturierte Daten.

SUFFIX-SYSTEM (am Ende des Textes):
- "privat" → suffix: "privat" (Privat-Ausgabe)
- "USt" → suffix: "ust" (EU-Ausgabe mit 19% USt, geht in Privat E.U. + UStVA + EÜR)
- "USt7" → suffix: "ust7" (EU-Ausgabe mit 7% USt)
- "noUSt" → suffix: "noust" (EU-Ausgabe ohne USt, nur EÜR)
- "GB" → suffix: "gb" (GetBack/Erstattung)
- "+" am Anfang des Betrags → suffix: "plus" (Einnahme M&A/Gehalt)
- "+USt" → suffix: "plus_ust" (Einnahme EU mit 19% USt)
- "rec" → suffix: "rec" (Wiederkehrend)
- Kein Suffix → suffix: null (muss manuell zugeordnet werden)

DATUM-REGELN:
- Kein Datum → date: null (wird als heute behandelt)
- 4-stellig am Anfang: "0304" → "YYYY-03-04" (Tag.Monat, aktuelles Jahr)
- "DD.MM" → YYYY-MM-DD
- "heute"/"gestern" → ISO Datum

BETRAG:
- "13,40" oder "13.40" oder "13" → 13.40 (Euro)
- "+4500" → amount: 4500, suffix: "plus"
- "+5950 USt" → amount: 5950, suffix: "plus_ust"

HÄNDLER/BESCHREIBUNG:
- Erstes Hauptwort oder erkennbarer Name

NOTIZ:
- Text nach einem Punkt am Ende: "Notion 10 USt. Jahresabo" → note: "Jahresabo"
- Kein Punkt → note: null

KATEGORIE-HINWEIS (nur bei suffix "privat"):
- Aldi/Rewe/Lidl/Edeka → "Haushalt"
- Restaurant/Essen/Pizza/Sushi → "Essen"
- Miete/Strom/Gas/Internet → "Wohnung"
- Kino/Konzert/Party/Spotify → "Freizeit"
- Tanken/Werkstatt/TÜV/Parken → "Auto"
- Hotel/Flug/Airbnb → "Urlaub"
- Sonst → null

Antworte NUR mit gültigem JSON ohne Markdown:
{"date": "YYYY-MM-DD" | null, "amount": 12.30 | null, "merchant": "Aldi", "suffix": "privat" | "ust" | "ust7" | "noust" | "gb" | "plus" | "plus_ust" | "rec" | null, "vat_rate": 19, "note": "Jahresabo" | null, "category_hint": "Haushalt" | null}`;

export async function parseEntry(input: string, today: string): Promise<ParsedEntry> {
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
      max_tokens: 300,
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
  return JSON.parse(json) as ParsedEntry;
}
