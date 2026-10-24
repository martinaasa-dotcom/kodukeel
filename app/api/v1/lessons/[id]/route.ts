import { apiError } from "@/lib/api/errors";
import { translationsOf } from "@/lib/api/lessonText";
import { apiJson } from "@/lib/api/respond";
import type { LessonResponse } from "@/lib/api/contract";
import { requireBearerUser } from "@/lib/auth/bearer";
import { nativePart } from "@/lib/audio/native";
import { tr } from "@/lib/copy/locale";
import { lessonView } from "@/lib/progress/lessonView";
import { localeFor } from "@/lib/progress/locale";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * ONE LESSON, AS THE WEB'S LESSON SCREEN RECEIVES IT (N-7, ADR-029).
 *
 * The body is `lessonView`, which the lesson page hands `LessonRunner` (D2):
 * the lesson, its practice and review built on the server against what the
 * lessons before it taught, and the finished screen's three facts. Any lesson
 * may be read, as on the web, and reading one records nothing. The lesson's
 * Estonian is served as it stands and never built, joined or respelled here
 * (D11); its English comes beside it in the learner's language as the web
 * draws it, through the same `tr` over the `lessonText` area.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const who = await requireBearerUser(request);
  if (who instanceof Response) return who;
  const { id } = await params;
  const [view, locale] = await Promise.all([lessonView(who.ownerId, id), localeFor(who.ownerId)]);
  if (!view) return apiError("not_found", { message: "That lesson isn't part of the course." });
  const body: LessonResponse = {
    ...view,
    locale,
    // The part the native speaker recorded whole, as the lesson screen works it out (N-6).
    nativePart: nativePart(view.lesson.conversation),
    translations: locale === "en"
      ? {}
      : translationsOf([view.lesson, view.practice, view.review, view.next], (english) => tr(locale, english)),
  };
  return apiJson(body);
}
