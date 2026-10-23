/**
 * THE ROUND TRIP FROM A LESSON TO ITS OWN CONVERSATION AND BACK.
 *
 * A check-in ends by offering the lesson's conversation (`lessonScenes.ts`),
 * and the conversation ends by sending the learner back to the lesson, which
 * reads why they came back: `done` is the conversation finished, `left` is
 * the way out pressed partway. Both open the lesson on its finish, since the
 * scripted conversation was already held before the link was offered; only
 * `done` stops offering the real one again.
 *
 * AND THE MODULE COMES WITH THEM. Most A1 lessons are opened as a step of
 * today's module, and the step is an address (`lib/course/focus.ts`). The
 * marker is carried to the conversation under a name of its own rather than
 * as `module`, because under `module` the conversation would become the step
 * and the module's own way on would tick it from the scene, past the lesson's
 * finish, which is what records the evening and builds its cards. Back at
 * the lesson it is `module` again, so the finish draws the module's way on.
 *
 * Pure: nothing here is trusted, `readFocus` decides whether the value is a
 * marker at all and a forged one only changes which link is drawn.
 */
import { focusHref, focusValue, readFocus, type ModuleFocus } from "@/lib/course/focus";

/** The query parameter the module marker travels under while the learner is in the conversation. */
export const LESSON_RETURN_PARAM = "lessonModule";

/** Why the learner is coming back to the lesson. */
export type ConversationReturn = "done" | "left";

/** Read the lesson page's `conversation` parameter: anything else is no round trip at all. */
export function conversationFrom(value: unknown): ConversationReturn | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "done" || raw === "left" ? raw : null;
}

/** The lesson's conversation, carrying the module marker where the lesson is a step of one. */
export function lessonSceneHref(sceneId: string, focus: ModuleFocus | null): string {
  const href = `/situations/${sceneId}`;
  if (!focus) return href;
  return `${href}?${new URLSearchParams({ [LESSON_RETURN_PARAM]: focusValue(focus) }).toString()}`;
}

/** Back to the lesson, saying why, with the module marker restored if one came along. */
export function backToLessonHref(lessonId: string, why: ConversationReturn, carried: unknown): string {
  const href = `/course/lessons/${lessonId}?conversation=${why}`;
  const focus = readFocus(carried);
  return focus ? focusHref(href, focus) : href;
}
