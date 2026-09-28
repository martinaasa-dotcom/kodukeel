/**
 * Where to talk to real people, which no learning app usually says.
 *
 * Every entry is a public program, credited by name, with a link that was
 * opened before it was written down: a dead link on the one screen that
 * points out of the app would be the app saying "go" and not meaning it.
 * The descriptions are English and make no claim that needs checking beyond
 * what the site itself says on its front page.
 *
 * Pure.
 */
export interface PlaceToTalk {
  readonly name: string;
  readonly what: string;
  readonly href: string;
}

export const PLACES_TO_TALK: readonly PlaceToTalk[] = [
  {
    name: "Integratsiooni Sihtasutus, the Integration Foundation",
    what: "Runs the Estonian Language Houses in Tallinn and Narva: language cafés, clubs and drop-in sessions where everyone has come to speak Estonian, including you.",
    href: "https://integratsioon.ee/en",
  },
  {
    name: "Settle in Estonia",
    what: "The state's welcome program for people who've just moved here, with free Estonian courses: a real teacher and a room full of other beginners.",
    href: "https://www.settleinestonia.ee/",
  },
  {
    name: "Keeleklikk",
    what: "A free online Estonian course from beginner upward, with a teacher who answers your emails. It pairs nicely with this app.",
    href: "https://www.keeleklikk.ee/",
  },
];
