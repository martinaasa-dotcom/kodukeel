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
import { LESSONS_B1_AREA } from "./areas/lessonsB1";
import { LESSONS_B2_AREA } from "./areas/lessonsB2";
import { LESSONS_C1_AREA } from "./areas/lessonsC1";
import { LESSON_TEXT_B1_OBJEKT } from "./areas/lessonTextB1Objekt";
import { LESSON_TEXT_B1_REKTSIOON } from "./areas/lessonTextB1Rektsioon";
import { LESSON_TEXT_B1_RAHA } from "./areas/lessonTextB1Raha";
import { LESSON_TEXT_B1_KODU } from "./areas/lessonTextB1Kodu";
import { LESSON_TEXT_B1_UUDISED } from "./areas/lessonTextB1Uudised";
import { LESSON_TEXT_B2_KONEKEEL } from "./areas/lessonTextB2Konekeel";
import { LESSON_TEXT_B2_KAUDNE } from "./areas/lessonTextB2Kaudne";
import { LESSON_TEXT_B2_PERE } from "./areas/lessonTextB2Pere";
import { LESSON_TEXT_B2_TOO } from "./areas/lessonTextB2Too";
import { LESSON_TEXT_B2_ARUTELU } from "./areas/lessonTextB2Arutelu";
import { LESSON_TEXT_B1_ARVAMUS } from "./areas/lessonTextB1Arvamus";
import { LESSON_TEXT_B1_ASJAAJAMINE } from "./areas/lessonTextB1Asjaajamine";
import { LESSON_TEXT_B2_TERVIS } from "./areas/lessonTextB2Tervis";
import { LESSON_TEXT_B2_RIIK } from "./areas/lessonTextB2Riik";
import { LESSON_TEXT_C1_ISIKSUS } from "./areas/lessonTextC1Isiksus";
import { LESSON_TEXT_C1_MEEDIA } from "./areas/lessonTextC1Meedia";
import { LESSON_TEXT_B2_KULTUUR } from "./areas/lessonTextB2Kultuur";
import { LESSON_TEXT_C1_KODU } from "./areas/lessonTextC1Kodu";
import { LESSON_SCENES_AREA } from "./areas/lessonScenes";
import { SOUNDS_AREA } from "./areas/sounds";
import { ADMIN_SPEECH } from "./areas/adminSpeech";
import { ACCOUNT_AREA } from "./areas/account";
import { PHONES_AREA } from "./areas/phones";

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
  ["lessonsB1", LESSONS_B1_AREA],
  ["lessonsB2", LESSONS_B2_AREA],
  ["lessonsC1", LESSONS_C1_AREA],
  ["lessonTextB1Objekt", LESSON_TEXT_B1_OBJEKT],
  ["lessonTextB1Rektsioon", LESSON_TEXT_B1_REKTSIOON],
  ["lessonTextB1Raha", LESSON_TEXT_B1_RAHA],
  ["lessonTextB1Kodu", LESSON_TEXT_B1_KODU],
  ["lessonTextB1Uudised", LESSON_TEXT_B1_UUDISED],
  ["lessonTextB2Pere", LESSON_TEXT_B2_PERE],
  ["lessonTextB2Too", LESSON_TEXT_B2_TOO],
  ["lessonTextB2Arutelu", LESSON_TEXT_B2_ARUTELU],
  ["lessonTextB1Arvamus", LESSON_TEXT_B1_ARVAMUS],
  ["lessonTextB1Asjaajamine", LESSON_TEXT_B1_ASJAAJAMINE],
  ["lessonTextB2Konekeel", LESSON_TEXT_B2_KONEKEEL],
  ["lessonTextB2Tervis", LESSON_TEXT_B2_TERVIS],
  ["lessonTextB2Kaudne", LESSON_TEXT_B2_KAUDNE],
  ["lessonTextB2Riik", LESSON_TEXT_B2_RIIK],
  ["lessonTextC1Isiksus", LESSON_TEXT_C1_ISIKSUS],
  ["lessonTextB2Kultuur", LESSON_TEXT_B2_KULTUUR],
  ["lessonTextC1Meedia", LESSON_TEXT_C1_MEEDIA],
  ["lessonTextC1Kodu", LESSON_TEXT_C1_KODU],
  ["lessonScenes", LESSON_SCENES_AREA],
  ["sounds", SOUNDS_AREA],
  ["adminSpeech", ADMIN_SPEECH],
  ["account", ACCOUNT_AREA],
  ["phones", PHONES_AREA],
];
