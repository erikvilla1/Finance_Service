/**
 * The daily line on the overview.
 *
 * ATTRIBUTION WAS THE HARD PART, NOT SELECTION. Motivational quotes are the
 * single most misattributed category of text in circulation, and several of
 * the most famous ones are not what they claim to be:
 *
 *   - "Success is not final, failure is not fatal…" is attributed to Churchill
 *     everywhere and is not his; the Churchill archives disclaim it.
 *   - "Do not go where the path may lead…" is not in Emerson's published work.
 *   - "Whatever you are, be a good one" is not traceable to Lincoln.
 *   - "Whether you think you can or you can't, you're right" is only loosely
 *     tied to Ford.
 *
 * All four were considered and dropped. What is left is either traceable to a
 * specific work, said on the record, or carried as a proverb with no claimed
 * author — because putting a fabricated Churchill line on the screen Robert
 * reads every morning is the kind of small dishonesty that quietly costs
 * trust in everything else on the page.
 *
 * If you add to this list, the bar is a source you could point at, not a
 * search result that agrees with you.
 */
export type Quote = { text: string; author: string };

export const QUOTES: Quote[] = [
  {
    // Meditations, Book V, 20.
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius",
  },
  {
    // "A Servant to Servants", North of Boston (1914).
    text: "The best way out is always through.",
    author: "Robert Frost",
  },
  {
    // Widely recorded from around 1902.
    text: "Genius is one percent inspiration and ninety-nine percent perspiration.",
    author: "Thomas Edison",
  },
  {
    // From the address "Press, the Fourth Estate" and reprinted widely.
    text: "Nothing in the world can take the place of persistence.",
    author: "Calvin Coolidge",
  },
  {
    // Stanford commencement address, 2005.
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    text: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
  },
  {
    // Nike "Failure" campaign, and repeated in interviews.
    text: "I can accept failure. Everyone fails at something. But I can't accept not trying.",
    author: "Michael Jordan",
  },
  {
    // On Writing (2000).
    text: "Amateurs sit and wait for inspiration. The rest of us just get up and go to work.",
    author: "Stephen King",
  },
  {
    // Terre des Hommes (1939).
    text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.",
    author: "Antoine de Saint-Exupéry",
  },
  { text: "Fall seven times, stand up eight.", author: "Japanese proverb" },
  {
    text: "If you want to go fast, go alone. If you want to go far, go together.",
    author: "African proverb",
  },
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
];

/**
 * One quote per day, the same one all day.
 *
 * DETERMINISTIC RATHER THAN RANDOM, for two reasons. A `Math.random()` pick
 * inside a server-rendered page produces a different value on the server and
 * on the client and React calls that a hydration mismatch. And a quote that
 * changed on every refresh would flicker through the set while Robert clicked
 * between Overview and Pipeline, which reads as a glitch rather than a
 * feature — "each time he logs in" is, in practice, once a day.
 *
 * Keyed on the UTC date so it turns over at a fixed moment rather than
 * drifting with whatever timezone the server happens to be in.
 */
export function quoteOfTheDay(now: Date = new Date()): Quote {
  const dayNumber = Math.floor(now.getTime() / 86_400_000);
  return QUOTES[dayNumber % QUOTES.length];
}
