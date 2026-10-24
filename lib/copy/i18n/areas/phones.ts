import type { Area } from "../area";

/**
 * NOTIFICATIONS ON A PHONE (N-9), AS THE PUBLIC PAGES SAY THEM.
 *
 * Firebase Cloud Messaging as a recipient on /privacy and /trust, the
 * paragraph on /privacy that says what a phone hands over, and the line on
 * /funding that says who pays for it. Every line is generated or printed only
 * where the operator has set an account up, and each claim is exactly as
 * strong as the English.
 *
 * Machine translated, reviewed by no native speaker yet. No Estonian.
 */
const LINES: readonly (readonly [en: string, ru: string, uk: string])[] = [
  ["Google, through Firebase Cloud Messaging", "Google, через Firebase Cloud Messaging", "Google, через Firebase Cloud Messaging"],
  ["a reminder you allowed on a phone with the app: the token that names the app on that phone, and the two lines the reminder says",
    "напоминание, которое вы разрешили на телефоне с приложением: токен, обозначающий приложение на этом телефоне, и две строки, которые говорит напоминание",
    "нагадування, яке ви дозволили на телефоні із застосунком: токен, що позначає застосунок на цьому телефоні, і два рядки, які каже нагадування"],
  ["**Reminders on a phone.** If you allow notifications in the Kodukeel app, the phone gives us a token that names the app on it, and we keep that token, which kind of phone it is and the app's version. A reminder is sent through Google's Firebase Cloud Messaging with that token and the two lines it says, the ones an email's subject and preview carry. It is booked like an email, and we keep no record of whether it was shown or opened. Turning notifications off, or signing out in the app, stops it.",
    "**Напоминания на телефоне.** Если вы разрешите уведомления в приложении Kodukeel, телефон передаст нам токен, обозначающий приложение на нём, и мы храним этот токен, тип телефона и версию приложения. Напоминание отправляется через Firebase Cloud Messaging от Google с этим токеном и двумя строками, которые оно говорит, теми же, что несут тема и превью письма. Оно записывается так же, как письмо, и мы не храним никаких сведений о том, было ли оно показано или открыто. Чтобы прекратить напоминания, выключите уведомления или выйдите из аккаунта в приложении.",
    "**Нагадування на телефоні.** Якщо ви дозволите сповіщення в застосунку Kodukeel, телефон передасть нам токен, що позначає застосунок на ньому, і ми зберігаємо цей токен, тип телефона і версію застосунку. Нагадування надсилається через Firebase Cloud Messaging від Google з цим токеном і двома рядками, які воно каже, тими самими, що несуть тема й прев'ю листа. Воно записується так само, як лист, і ми не зберігаємо жодних відомостей про те, чи його показали або відкрили. Щоб припинити нагадування, вимкніть сповіщення або вийдіть з облікового запису в застосунку."],
  ["Notifications on a phone", "Уведомления на телефоне", "Сповіщення на телефоні"],
  ["Carries the reminders a learner allowed to a phone running the app, on Android itself and on an iPhone through Apple's service.",
    "Доставляет напоминания, которые ученик разрешил, на телефон с приложением: на Android напрямую, на iPhone через службу Apple.",
    "Доставляє нагадування, які учень дозволив, на телефон із застосунком: на Android напряму, на iPhone через службу Apple."],
  ["Reminders go to the computer the learner asked on, or by email, as they did before the app existed.",
    "Напоминания идут на компьютер, где ученик их включил, или по почте, как до появления приложения.",
    "Нагадування йдуть на комп'ютер, де учень їх увімкнув, або поштою, як до появи застосунку."],
  ["Firebase Cloud Messaging carries no charge on any plan, so Google bears the cost of every message.",
    "Firebase Cloud Messaging бесплатен на любом тарифе, поэтому стоимость каждого сообщения несёт Google.",
    "Firebase Cloud Messaging безкоштовний на будь-якому тарифі, тому вартість кожного повідомлення несе Google."],
];

export const PHONES_AREA: Area = {
  ru: Object.fromEntries(LINES.map(([en, ru]) => [en, ru])),
  uk: Object.fromEntries(LINES.map(([en, , uk]) => [en, uk])),
};
