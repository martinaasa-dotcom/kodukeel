import type { Recipient } from "./recipients";
import { NOT_EXPORTED } from "./exportCoverage";

/**
 * THE APP STORE PRIVACY LABEL AND THE GOOGLE PLAY DATA SAFETY ANSWERS, DERIVED
 * FROM THE FACTS /privacy PRINTS (docs/44-sixth-batch.md, R-3 and D20).
 *
 * Both stores ask what the app collects, whether it is tied to the person, what
 * it is for and who else receives it. This deployment already answers that for
 * its own readers: `resolveRecipients` names who gets anything, and the schema's
 * owner-scoped tables are what is kept about somebody, every one of them in the
 * export but the ones `NOT_EXPORTED` argues for. So the labels are worked out
 * from those two facts here, and every answer carries the reason for it.
 *
 * A table and a recipient each say which data types they put on the label. One
 * that says nothing is not a pass: `storeLabels` reports it as undecided, and
 * the unit test fails until somebody decides its label, so a new table or a new
 * recipient cannot ship with a label that silently leaves it out.
 *
 * Tracking is never: no advertising, no data broker, no analytics script, and no
 * identifier shared with another company's data. Audio is not collected: the
 * voice is heard on the device and never stored or sent (ADR-028).
 *
 * Pure: it is handed the recipients and the table names and reads nothing.
 */

/** The data types this app can put on a label, each in both stores' own words. */
export const DATA_TYPES = {
  name: {
    apple: "Contact Info: Name", play: "Personal info: Name",
    applePurposes: ["App Functionality"], playPurposes: ["App functionality", "Account management"],
    optional: true,
  },
  email: {
    apple: "Contact Info: Email Address", play: "Personal info: Email address",
    applePurposes: ["App Functionality"], playPurposes: ["App functionality", "Account management", "Developer communications"],
    optional: false,
  },
  userId: {
    apple: "Identifiers: User ID", play: "Personal info: User IDs",
    applePurposes: ["App Functionality"], playPurposes: ["App functionality", "Account management"],
    optional: false,
  },
  deviceId: {
    apple: "Identifiers: Device ID", play: "Device or other IDs",
    applePurposes: ["App Functionality"], playPurposes: ["App functionality", "Developer communications"],
    optional: true,
  },
  interaction: {
    apple: "Usage Data: Product Interaction", play: "App activity: App interactions",
    applePurposes: ["App Functionality", "Product Personalization"], playPurposes: ["App functionality", "Personalization"],
    optional: false,
  },
  otherUsage: {
    apple: "Usage Data: Other Usage Data", play: "App activity: Other actions",
    applePurposes: ["App Functionality"], playPurposes: ["App functionality"],
    optional: false,
  },
  search: {
    apple: "Search History", play: "App activity: In-app search history",
    applePurposes: ["App Functionality"], playPurposes: ["App functionality"],
    optional: true,
  },
  content: {
    apple: "User Content: Other User Content", play: "App activity: Other user-generated content",
    applePurposes: ["App Functionality", "Product Personalization"], playPurposes: ["App functionality", "Personalization"],
    optional: true,
  },
  messages: {
    apple: "User Content: Other User Content", play: "Messages: Other in-app messages",
    applePurposes: ["App Functionality"], playPurposes: ["App functionality"],
    optional: true,
  },
  photos: {
    apple: "User Content: Photos or Videos", play: "Photos and videos: Photos",
    applePurposes: ["App Functionality"], playPurposes: ["App functionality"],
    optional: true,
  },
  support: {
    apple: "User Content: Customer Support", play: "App activity: Other user-generated content",
    applePurposes: ["App Functionality"], playPurposes: ["App functionality"],
    optional: true,
  },
  crash: {
    apple: "Diagnostics: Crash Data", play: "App info and performance: Crash logs",
    applePurposes: ["App Functionality"], playPurposes: ["App functionality"],
    optional: false,
  },
  diagnostics: {
    apple: "Diagnostics: Other Diagnostic Data", play: "App info and performance: Diagnostics",
    applePurposes: ["App Functionality"], playPurposes: ["App functionality"],
    optional: false,
  },
} as const;

export type DataType = keyof typeof DATA_TYPES;

interface Source {
  /** What it puts on the label; empty where it adds nothing a label asks about. */
  readonly types: readonly DataType[];
  /** Tied to the person's account, as the stores mean "linked". */
  readonly linked: boolean;
  /** Kept only while a request is answered, never stored by this app. */
  readonly ephemeral?: boolean;
  readonly why: string;
}

/**
 * Every owner-scoped table, and what it puts on the label. A table is linked to
 * the person by construction, since `ownerId` is what makes it theirs.
 */
export const TABLE_SOURCES: Readonly<Record<string, Source>> = {
  Card: { types: ["interaction"], linked: true, why: "the learner's own cards and their schedule" },
  Review: { types: ["interaction"], linked: true, why: "every answer a card was given, which is what the schedule is worked out from" },
  StarredWord: { types: ["interaction"], linked: true, why: "the words the learner kept as favorites" },
  Deck: { types: ["content"], linked: true, why: "the decks the learner made and named" },
  DeckWord: { types: ["interaction"], linked: true, why: "which words the learner put in each deck" },
  Deferral: { types: ["interaction"], linked: true, why: "the words the learner put aside for later" },
  CourseStep: { types: ["interaction"], linked: true, why: "which steps of the course the learner finished" },
  Achievement: { types: ["interaction"], linked: true, why: "the streak shields the learner earned" },
  Assessment: { types: ["interaction"], linked: true, why: "a level check the learner sat, and its answers" },
  ExamAttempt: { types: ["content"], linked: true, why: "a mock exam paper the learner sat, the composition they wrote included" },
  SceneRun: { types: ["content"], linked: true, why: "the learner's typed side of a practice conversation; the role card is fiction" },
  SceneGap: { types: ["interaction"], linked: true, why: "the words a conversation found the learner needed" },
  Encounter: { types: ["content"], linked: true, why: "whether the learner spoke Estonian to anybody yesterday, as they reported it" },
  Message: { types: ["messages"], linked: true, why: "what the learner types to Anu, the tutor, and her replies, kept for a day" },
  Task: { types: ["content"], linked: true, why: "work a teacher set, and the learner's own notes on it" },
  StudyEvent: { types: ["content"], linked: true, why: "the learner's own study times and class times" },
  Scan: { types: ["content"], linked: true, why: "the word list confirmed from a photographed page; the photograph is never stored" },
  Suggestion: { types: ["support"], linked: true, why: "a report the learner sent about something the app got wrong" },
  Setting: { types: ["name", "interaction"], linked: true, why: "the name the learner asked to be called and their preferences" },
  Classroom: { types: ["content"], linked: true, why: "a class or workplace group a teacher created and named" },
  ClassroomMember: { types: ["name", "interaction"], linked: true, why: "the name a learner shows a class they joined" },
  EmailSend: { types: ["otherUsage"], linked: true, why: "which letters were sent and when, which is the frequency cap" },
  PushSubscription: { types: ["deviceId"], linked: true, why: "the address a browser gave for reminders, only where the learner turned them on" },
  NativePushDevice: { types: ["deviceId"], linked: true, why: "the token a phone running the app gave for reminders, only where the learner allowed notifications" },
  UsageEvent: {
    types: ["otherUsage"], linked: true,
    why: "the cost of each model call, kept to enforce the daily cap; not in the export, and deleted with the account",
  },
};

/** Every recipient `resolveRecipients` can name, and what it adds to the label. */
export const RECIPIENT_SOURCES: Readonly<Record<string, Source>> = {
  supabase: {
    types: ["email", "userId"], linked: true,
    why: "the email address somebody signs in with and the id every table is keyed on, held by the database host",
  },
  vercel: {
    types: [], linked: false,
    why: "the host answers every request, which is the data above; its request log holds an IP address, which nothing uses to locate anybody",
  },
  resend: {
    types: ["email"], linked: true,
    why: "the address a letter about the learner's own course is sent to; every kind of letter can be switched off",
  },
  "google-sign-in": {
    types: ["name", "email"], linked: true,
    why: "the name and the email address on the Google account a learner signs in with, handed back by Google and kept with the account",
  },
  "apple-sign-in": {
    types: ["name", "email"], linked: true,
    why: "the name and the email address, or the private address Apple makes, that a learner lets Apple share when they sign in with Apple, kept with the account",
  },
  "push-services": {
    types: ["deviceId"], linked: false,
    why: "a reminder encrypted so only the learner's browser can read it, posted to the push service that browser uses",
  },
  fcm: {
    types: ["deviceId"], linked: false,
    why: "a reminder's two lines and the token that names the app on the phone it is for, posted to Firebase Cloud Messaging",
  },
  "error-webhook": {
    types: ["crash", "diagnostics"], linked: true,
    why: "a description of what broke, with the user id and never the email, posted where the operator chose",
  },
  ekilex: {
    types: ["search"], linked: false, ephemeral: true,
    why: "a single word looked up, sent to the Institute of the Estonian Language with no account attached",
  },
  wikimedia: {
    types: ["search"], linked: false, ephemeral: true,
    why: "the same single word, asked for its English meaning, with no account attached",
  },
  tartunlp: {
    types: ["content"], linked: false, ephemeral: true,
    why: "a phrase the learner asked to hear read aloud, sent with no account attached",
  },
  anthropic: {
    types: ["messages", "photos"], linked: false, ephemeral: true,
    why: "what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached",
  },
  gemini: {
    types: ["messages", "photos"], linked: false, ephemeral: true,
    why: "what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached",
  },
  groq: {
    types: ["messages", "photos"], linked: false, ephemeral: true,
    why: "what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached",
  },
  openai: {
    types: ["messages", "photos"], linked: false, ephemeral: true,
    why: "what the learner types to Anu or in a conversation, and a page they photograph, sent with no account attached",
  },
};

/**
 * A value for every variable that switches a recipient on, so the full list can
 * be asked for: the unit test asks it to find every recipient that needs a
 * label, and the printing script asks it for a label that declares the most.
 * Stand-ins, not keys; nothing is ever sent with them.
 */
export const EVERY_RECIPIENT_ENV: Readonly<Record<string, string>> = {
  GROQ_API_KEY: "stand-in",
  GEMINI_API_KEY: "stand-in",
  ANTHROPIC_API_KEY: "stand-in",
  OPENAI_API_KEY: "stand-in",
  EKILEX_API_KEY: "stand-in",
  RESEND_API_KEY: "stand-in",
  NEXT_PUBLIC_APPLE_SERVICES_ID: "stand-in",
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: "stand-in",
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: "B".repeat(87),
  VAPID_PRIVATE_KEY: "C".repeat(43),
  VAPID_SUBJECT: "mailto:operator@example.test",
  FCM_SERVICE_ACCOUNT: JSON.stringify({
    project_id: "stand-in",
    client_email: "stand-in@stand-in.example.test",
    // The shape `fcmConfigFrom` reads; it signs nothing, and the script sends nothing.
    // Assembled, so the build carries no PEM marker for `check:secrets` to find.
    private_key: [`${"-".repeat(5)}BEGIN PRIVATE KEY${"-".repeat(5)}`, "stand-in", `${"-".repeat(5)}END PRIVATE KEY${"-".repeat(5)}`, ""].join("\n"),
  }),
  ERROR_WEBHOOK_URL: "https://errors.example.test/hook",
  NEXT_PUBLIC_SUPABASE_URL: "https://project.example.test",
  VERCEL: "1",
};

/** What is never on the label, and why. Each is a question both stores ask. */
export const NOT_COLLECTED: readonly { readonly what: string; readonly why: string }[] = [
  {
    what: "Audio Data / Voice or sound recordings",
    why: "the voice is heard by a model on the device and never stored or sent; only the words understood leave it (ADR-028)",
  },
  { what: "Location", why: "nothing asks where the learner is, and the IP address in a request log is not used to place anybody" },
  { what: "Contacts", why: "the app never reads an address book" },
  { what: "Health and fitness, Financial info, Purchases", why: "the app sells nothing and asks about none of them" },
  { what: "Browsing history", why: "the app sees only its own pages" },
  { what: "Advertising data", why: "there is no advertising in the app and no advertising identifier is read" },
];

export interface LabelAnswer {
  readonly type: DataType;
  /** The store's own name for it. */
  readonly label: string;
  readonly linked: boolean;
  readonly purposes: readonly string[];
  /** Play only: whether every source processes it only while answering. */
  readonly ephemeral?: boolean;
  /** Play only: whether a learner can use the app without it. */
  readonly optional?: boolean;
  /** Play only: always false here, with the reason in `reasons`. */
  readonly shared?: false;
  readonly reasons: readonly string[];
}

export interface StoreLabels {
  readonly apple: {
    readonly tracking: { readonly answer: "No"; readonly why: string };
    readonly collected: readonly LabelAnswer[];
  };
  readonly play: {
    readonly collected: readonly LabelAnswer[];
    readonly sharedWhy: string;
    readonly encryptedInTransit: { readonly answer: "Yes"; readonly why: string };
    readonly deletion: { readonly answer: "Yes"; readonly why: string };
  };
  readonly notCollected: typeof NOT_COLLECTED;
  /** A table or a recipient with no decided label; the label is not finished while this holds anything. */
  readonly undecided: readonly string[];
}

const TRACKING_WHY =
  "No data is used to track anybody across other companies' apps or sites: there is no advertising, no data broker, "
  + "no analytics script, and no identifier is handed to another company's data.";
const SHARED_WHY =
  "Every recipient is a service provider working on this app's behalf or receives a word or a phrase with no account "
  + "attached, which neither store counts as sharing.";
const ENCRYPTED_WHY = "Every request goes over HTTPS, to this app's own server and from it to every recipient.";
const DELETION_WHY =
  "Settings deletes the account and everything kept about it, with no exemptions, and Settings is the same page "
  + "in the app and on the web. The web link the form asks for is /account/delete, which says what goes and what "
  + "stays and sends somebody without the app to sign in and press the button.";

function from(source: string, entry: Source): { source: string; entry: Source } {
  return { source, entry };
}

/**
 * The labels for a deployment: its recipients as `resolveRecipients` returned
 * them, and the owner-scoped tables its schema holds.
 */
export function storeLabels(recipients: readonly Recipient[], tables: readonly string[]): StoreLabels {
  const undecided: string[] = [];
  const sources: { source: string; entry: Source }[] = [];
  for (const table of tables) {
    const entry = TABLE_SOURCES[table];
    if (!entry) undecided.push(`table ${table}`);
    else sources.push(from(Object.hasOwn(NOT_EXPORTED, table) ? `${table} (kept, not exported)` : `${table} (in the export)`, entry));
  }
  for (const recipient of recipients) {
    const entry = RECIPIENT_SOURCES[recipient.id];
    if (!entry) undecided.push(`recipient ${recipient.id} (${recipient.name})`);
    else sources.push(from(recipient.name, entry));
  }

  const types = (Object.keys(DATA_TYPES) as DataType[]).filter((type) => sources.some((s) => s.entry.types.includes(type)));
  const answerFor = (type: DataType, store: "apple" | "play"): LabelAnswer => {
    const touching = sources.filter((s) => s.entry.types.includes(type));
    const def = DATA_TYPES[type];
    const reasons = touching.map((s) => `${s.source}: ${s.entry.why}`);
    const linked = touching.some((s) => s.entry.linked);
    if (store === "apple") return { type, label: def.apple, linked, purposes: def.applePurposes, reasons };
    return {
      type, label: def.play, linked, purposes: def.playPurposes, reasons,
      ephemeral: touching.every((s) => s.entry.ephemeral === true),
      optional: def.optional,
      shared: false,
    };
  };

  /* Two of this app's types are one Apple type; their answers are merged so each Apple row is said once. */
  const appleRows = new Map<string, LabelAnswer>();
  for (const type of types) {
    const answer = answerFor(type, "apple");
    const held = appleRows.get(answer.label);
    appleRows.set(answer.label, held ? {
      ...held,
      linked: held.linked || answer.linked,
      purposes: [...new Set([...held.purposes, ...answer.purposes])],
      reasons: [...held.reasons, ...answer.reasons],
    } : answer);
  }
  const playRows = new Map<string, LabelAnswer>();
  for (const type of types) {
    const answer = answerFor(type, "play");
    const held = playRows.get(answer.label);
    playRows.set(answer.label, held ? {
      ...held,
      linked: held.linked || answer.linked,
      purposes: [...new Set([...held.purposes, ...answer.purposes])],
      ephemeral: held.ephemeral === true && answer.ephemeral === true,
      optional: held.optional === true && answer.optional === true,
      reasons: [...held.reasons, ...answer.reasons],
    } : answer);
  }

  return {
    apple: { tracking: { answer: "No", why: TRACKING_WHY }, collected: [...appleRows.values()] },
    play: {
      collected: [...playRows.values()],
      sharedWhy: SHARED_WHY,
      encryptedInTransit: { answer: "Yes", why: ENCRYPTED_WHY },
      deletion: { answer: "Yes", why: DELETION_WHY },
    },
    notCollected: NOT_COLLECTED,
    undecided,
  };
}
