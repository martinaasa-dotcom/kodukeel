import type { Area } from "./area";
import { RU } from "./ru";
import { UK } from "./uk";
import { START } from "./areas/start";
import { TODAY } from "./areas/today";
import { REVIEW } from "./areas/review";
import { SITUATIONS } from "./areas/situations";
import { REFERENCE } from "./areas/reference";
import { APP } from "./areas/app";
import { ROUNDS } from "./areas/rounds";
import { PROGRESS } from "./areas/progress";
import { COURSE } from "./areas/course";
import { SHELL } from "./areas/shell";
import { FINISH } from "./areas/finish";
import { GRAMMAR_CASES } from "./areas/grammarCases";
import { GRAMMAR_TOPICS } from "./areas/grammarTopics";
import { LETTERS } from "./areas/letters";
import { LANDING } from "./areas/landing";
import { TWENTY } from "./areas/twenty";
import { LEGAL } from "./areas/legal";
import { PUBLIC } from "./areas/public";
import { MEANING } from "./areas/meaning";
import { SPEAKERS } from "./areas/speakers";
import { NEWCOMERS } from "./areas/newcomers";
import { SWEEP } from "./areas/sweep";
import { EXAM } from "./areas/exam";
import { HEROES } from "./areas/heroes";
import { SAYINGS } from "./areas/sayings";
import { TWINS } from "./areas/twins";
import { FIRST_DAY } from "./areas/firstDay";
import { WORKBOOK } from "./areas/workbook";
import { GAMES_AREA } from "./areas/games";
import { WORDPLAY } from "./areas/wordplay";
import { SPEAKING } from "./areas/speaking";
import { VOICE_ROUNDS } from "./areas/voiceRounds";
import { RECORDINGS } from "./areas/recordings";
import { SPEAKING_ROUND } from "./areas/speakingRound";
import { SCENE_SPEECH } from "./areas/sceneSpeech";
import { CHAT } from "./areas/chat";
import { LESSONS_AREA } from "./areas/lessons";
import { LESSON_TEXT_AREA } from "./areas/lessonText";
import { SOUNDS_AREA } from "./areas/sounds";

/**
 * Every area of the interface that has been translated. The first is the
 * navigation, the round briefings and the language setting itself, which were
 * written before the app was split into areas.
 */
export const AREAS: readonly (readonly [name: string, area: Area])[] = [
  ["core", { ru: RU, uk: UK }],
  ["start", START],
  ["today", TODAY],
  ["review", REVIEW],
  ["situations", SITUATIONS],
  ["reference", REFERENCE],
  ["app", APP],
  ["rounds", ROUNDS],
  ["progress", PROGRESS],
  ["course", COURSE],
  ["shell", SHELL],
  ["finish", FINISH],
  ["grammarCases", GRAMMAR_CASES],
  ["grammarTopics", GRAMMAR_TOPICS],
  ["letters", LETTERS],
  ["landing", LANDING],
  ["twenty", TWENTY],
  ["legal", LEGAL],
  ["public", PUBLIC],
  ["meaning", MEANING],
  ["speakers", SPEAKERS],
  ["newcomers", NEWCOMERS],
  ["sweep", SWEEP],
  ["exam", EXAM],
  ["heroes", HEROES],
  ["sayings", SAYINGS],
  ["twins", TWINS],
  ["workbook", WORKBOOK],
  ["games", GAMES_AREA],
  ["wordplay", WORDPLAY],
  ["speaking", SPEAKING],
  ["voiceRounds", VOICE_ROUNDS],
  ["recordings", RECORDINGS],
  ["speakingRound", SPEAKING_ROUND],
  ["sceneSpeech", SCENE_SPEECH],
  ["chat", CHAT],
  ["firstDay", FIRST_DAY],
  ["lessons", LESSONS_AREA],
  ["lessonText", LESSON_TEXT_AREA],
  ["sounds", SOUNDS_AREA],
];
