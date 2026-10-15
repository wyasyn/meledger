import { Article, SettingsPage } from '@/features/settings/components';

const SECTIONS = [
  {
    title: 'Adding an entry',
    body: 'Tap + and say it, for example "paid boda 5k and lunch 12k cash". Check the cards, then tap Save. To type instead, tap the keyboard button.',
  },
  {
    title: 'Talking to MeLedger',
    body: 'Tap + and start talking. MeLedger stops listening when you pause. You can also hold + while you talk and let go when you are done.',
  },
  {
    title: 'Saying amounts',
    body: '"5k" is 5,000 and "1.2 million" is 1,200,000. You can also say "fifty thousand". Amounts are in UGX unless you say dollars.',
  },
  {
    title: 'Several things at once',
    body: 'Join them with "and": "airtime 2k and sugar 6k". Each one gets its own card.',
  },
  {
    title: 'Which wallet',
    body: 'Say "cash", "MTN", "momo", "Airtel" or "bank". If you name none, the entry goes to your main wallet.',
  },
  {
    title: 'Questions',
    body: 'Ask "how much did I spend on boda this week?", "what did I spend most on last month?" or "how is my food budget?".',
  },
  {
    title: 'Budgets and goals',
    body: 'Say "set food budget 300k" or "new goal laptop 2 million". MeLedger shows a card to check before saving.',
  },
  {
    title: 'When MeLedger gets it wrong',
    body: 'Change the category or wallet on the card before saving. MeLedger remembers the word for next time. You can see and forget learned words in Settings, Voice & input.',
  },
  {
    title: 'Without internet',
    body: 'Everything you log stays on your phone and works offline. Some phones need internet to turn speech into text; you can always type.',
  },
];

export default function HelpScreen() {
  return (
    <SettingsPage title="Help">
      <Article sections={SECTIONS} />
    </SettingsPage>
  );
}
