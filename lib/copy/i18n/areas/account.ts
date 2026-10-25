import type { Area } from "../area";

/**
 * THE ACCOUNT DELETION PAGE IN RUSSIAN AND UKRAINIAN (N-8), AND THE TWO LINES
 * THAT POINT AT IT FROM /privacy AND /help.
 *
 * `/account/delete` is the address a store's data safety form names, read by
 * somebody who may no longer have the app, so the standard is the legal
 * area's: one row a sentence, plain words, every claim exactly as strong as
 * the English and no stronger. The sentences about what is deleted are
 * /privacy's own, so they say here what they say there.
 *
 * Machine translated, reviewed by no native speaker yet. No Estonian.
 */
const LINES: readonly (readonly [en: string, ru: string, uk: string])[] = [
  ["Deleting your account", "Удаление аккаунта", "Видалення облікового запису"],
  ["How to delete your Kodukeel account, what goes with it and what stays, with or without the app.",
    "Как удалить аккаунт Kodukeel, что удаляется вместе с ним и что остаётся, с приложением или без него.",
    "Як видалити обліковий запис Kodukeel, що видаляється разом із ним і що залишається, із застосунком чи без нього."],
  ["You can delete your Kodukeel account, and everything it holds, whenever you like. It takes one press, and nobody has to agree to it. This page deletes nothing itself: it tells you where the button is.",
    "Ты можешь удалить свой аккаунт Kodukeel и всё, что в нём хранится, когда захочешь. Для этого достаточно одного нажатия, и ничьё согласие не нужно. Сама эта страница ничего не удаляет: она подсказывает, где кнопка.",
    "Ти можеш видалити свій обліковий запис Kodukeel і все, що в ньому зберігається, коли захочеш. Для цього досить одного натискання, і нічия згода не потрібна. Сама ця сторінка нічого не видаляє: вона підказує, де кнопка."],
  ["How to delete it", "Как его удалить", "Як його видалити"],
  ["You’re signed in. Open {path} and press **Delete everything**. You’ll be asked to type a word to confirm.",
    "Вход выполнен. Открой {path} и нажми **Удалить всё**. Для подтверждения тебя попросят ввести слово.",
    "Вхід виконано. Відкрий {path} і натисни **Видалити все**. Для підтвердження тебе попросять ввести слово."],
  ["Sign in first, the same way and with the same address you used before. Then open {path} and press **Delete everything**. You’ll be asked to type a word to confirm.",
    "Сначала войди тем же способом и с тем же адресом, что и раньше. Затем открой {path} и нажми **Удалить всё**. Для подтверждения тебя попросят ввести слово.",
    "Спочатку увійди тим самим способом і з тією самою адресою, що й раніше. Потім відкрий {path} і натисни **Видалити все**. Для підтвердження тебе попросять ввести слово."],
  ["In the Kodukeel app on a phone, the same choice is in its settings.",
    "В приложении Kodukeel на телефоне то же самое можно сделать в настройках.",
    "У застосунку Kodukeel на телефоні те саме можна зробити в налаштуваннях."],
  ["Sign in to delete it", "Войди, чтобы удалить", "Увійди, щоб видалити"],
  ["What is deleted", "Что удаляется", "Що видаляється"],
  ["Every card, review, task, setting, scanned page, level check, mock exam paper with your composition in it, tutor message, suggested fix, starred word, word put aside, badge and class membership, along with your sign-in record. All of it goes immediately, in one go.",
    "Каждая карточка, повторение, задание, настройка, отсканированная страница, проверка уровня, пробный экзамен с твоим сочинением, сообщение репетитору, предложенное исправление, отмеченное слово, отложенное слово, значок и членство в группе, а также твоя учётная запись для входа. Всё это удаляется сразу, одним действием.",
    "Кожна картка, повторення, завдання, налаштування, відсканована сторінка, перевірка рівня, пробний іспит із твоїм твором, повідомлення репетиторові, запропоноване виправлення, позначене слово, відкладене слово, значок і членство в групі, а також твій запис для входу. Усе це видаляється одразу, однією дією."],
  ["What is not", "Что не удаляется", "Що не видаляється"],
  ["The shared dictionary stays, because other learners have cards built on it, but any entry you edited stops being attributed to you.",
    "Общий словарь остаётся, потому что на нём построены карточки других учеников, но в исправленных тобой статьях твоё авторство больше не указывается.",
    "Спільний словник залишається, бо на ньому побудовані картки інших учнів, але у виправлених тобою статтях твоє авторство більше не зазначається."],
  ["If this installation is not set up to delete the sign-in record itself, the button says so, and the address on the {privacy} page is who to ask.",
    "Если в этой установке нельзя автоматически удалить учётную запись для входа, кнопка так и скажет, а обращаться нужно по адресу со страницы {privacy}.",
    "Якщо в цій установці не можна автоматично видалити запис для входу, кнопка так і скаже, а звертатися треба за адресою зі сторінки {privacy}."],
  ["There is no separate archive, and no backup that outlives a deletion by more than the hosting provider’s own retention window.",
    "Отдельного архива нет, а резервные копии хранятся после удаления не дольше, чем это предусмотрено у хостинг-провайдера.",
    "Окремого архіву немає, а резервні копії зберігаються після видалення не довше, ніж це передбачено в хостинг-провайдера."],
  ["Before you delete", "Перед удалением", "Перед видаленням"],
  ["Take an export first: this keeps no copy. {path} gives you everything as one file, and the same file restores into a fresh installation.",
    "Сначала сделай экспорт: копия не сохраняется. {path} отдаёт тебе всё одним файлом, и из этого же файла всё можно восстановить в новой установке.",
    "Спочатку зроби експорт: копія не зберігається. {path} віддає тобі все одним файлом, і з цього самого файлу все можна відновити в новій установці."],
  // The two lines that point here.
  ["{link} says what goes and what stays, and works without the app.",
    "На странице {link} сказано, что удаляется и что остаётся; она работает и без приложения.",
    "На сторінці {link} сказано, що видаляється й що залишається; вона працює й без застосунку."],
  ["Without the app, or before you have signed in, {link} says where the button is and what it removes.",
    "Без приложения или до входа в систему страница {link} подсказывает, где кнопка и что она удаляет.",
    "Без застосунку або до входу сторінка {link} підказує, де кнопка й що вона видаляє."],
];

export const ACCOUNT_AREA: Area = {
  ru: Object.fromEntries(LINES.map(([en, ru]) => [en, ru])),
  uk: Object.fromEntries(LINES.map(([en, , uk]) => [en, uk])),
};
