export const botttMessages = {
  dashboard_morning: (name: string) => `Guten Morgen, ${name}! Ich habe alles im Blick. 🤖`,
  review_prompt: (count: number) => `${count} Einträge warten — kurz drüber schauen!`,
  ustva_reminder: (month: string) => `${month} ist noch offen ⚠️ Fälligkeit bis 10. des Folgemonats!`,
  recurring_prompt: (count: number) => `${count} wiederkehrende Buchungen für diesen Monat — alle eintragen?`,
  auto_book_question: (merchant: string) => `Ich habe gelernt dass ${merchant} immer gleich ist. Automatisch buchen?`,
  export_warning: (count: number) => `${count} automatisch gebuchte Transaktionen — bitte kurz prüfen!`,
  achievement_first: () => `Erste Buchung erfasst! Wir fangen an. 🎯`,
  achievement_hundred: () => `100 Transaktionen! Du bist ein Profi. 🏆`,
  empty_review: () => `Alles im Grünen — keine offenen Einträge. ✅`,
  empty_transactions: () => `Noch keine Buchungen. Tippe unten auf ➕ und wir legen los!`,
};
