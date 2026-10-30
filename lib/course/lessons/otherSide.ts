import { normalisePhrase } from "./ledger";
import type { LessonSpec, Speaker } from "./types";

/**
 * WHO THE LEARNER IS TALKING TO ON SAY IT.
 *
 * The questions on Say it were voiced by whoever opened the conversation, and
 * the role-play's partner was named the same way. In most lessons that
 * person is the one asking, but where Tom opens, the learner's own stand-in
 * opened: on a new colleague's first day Kadri asked her questions in Tom's
 * voice, and the raise was asked for in Tom's voice rather than the manager's.
 *
 * So the other side is whoever opens the conversation, unless that is Tom,
 * the learner's stand-in in nearly every cast, and then the first speaker who
 * is not him. An ask written word for word as a line of the conversation is
 * voiced by whoever said that line, Tom again excepted.
 */
export interface OtherSide {
  /** The person the learner answers, named on the intro and the thread. */
  readonly partner: Speaker;
  /** Who says this ask, for its voice. */
  readonly askerOf: (askEt: string) => Speaker;
}

const STAND_IN = "Tom";

export function otherSideOf(lesson: Pick<LessonSpec, "conversation">): OtherSide {
  const said = new Map<string, Speaker>();
  for (const line of lesson.conversation) if (line.et && !said.has(normalisePhrase(line.et))) said.set(normalisePhrase(line.et), line.who);
  const speakers = [...new Set(lesson.conversation.map((l) => l.who))];
  const opener = speakers[0] ?? "";
  const partner = opener === STAND_IN ? (speakers.find((s) => s !== STAND_IN) ?? opener) : opener;
  return {
    partner,
    askerOf: (askEt) => {
      const who = said.get(normalisePhrase(askEt));
      return who && who !== STAND_IN ? who : partner;
    },
  };
}
