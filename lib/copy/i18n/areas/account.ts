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
    "Вы можете удалить свой аккаунт Kodukeel и всё, что в нём хранится, когда захотите. Для этого достаточно одного нажатия, и ничьё согласие не требуется. Сама эта страница ничего не удаляет: она говорит, где находится кнопка.",
    "Ви можете видалити свій обліковий запис Kodukeel і все, що в ньому зберігається, коли захочете. Для цього досить одного натискання, і нічия згода не потрібна. Сама ця сторінка нічого не видаляє: вона каже, де знаходиться кнопка."],
  ["How to delete it", "Как его удалить", "Як його видалити"],
  ["You’re signed in. Open {path} and press **Delete everything**. You’ll be asked to type a word to confirm.",
    "Вы вошли в систему. Откройте {path} и нажмите **Удалить всё**. Для подтверждения вас попросят ввести слово.",
    "Ви увійшли. Відкрийте {path} і натисніть **Видалити все**. Для підтвердження вас попросять ввести слово."],
  ["Sign in first, the same way and with the same address you used before. Then open {path} and press **Delete everything**. You’ll be asked to type a word to confirm.",
    "Сначала войдите тем же способом и с тем же адресом, что и раньше. Затем откройте {path} и нажмите **Удалить всё**. Для подтверждения вас попросят ввести слово.",
    "Спочатку увійдіть тим самим способом і з тією самою адресою, що й раніше. Потім відкрийте {path} і натисніть **Видалити все**. Для підтвердження вас попросять ввести слово."],
  ["In the Kodukeel app on a phone, the same choice is in its settings.",
    "В приложении Kodukeel на телефоне то же самое есть в его настройках.",
    "У застосунку Kodukeel на телефоні те саме є в його налаштуваннях."],
  ["Sign in to delete it", "Войдите, чтобы удалить", "Увійдіть, щоб видалити"],
  ["What is deleted", "Что удаляется", "Що видаляється"],
  ["Every card, review, task, setting, scanned page, level check, mock exam paper with your composition in it, tutor message, suggested fix, starred word, word put aside, badge and class membership, along with your sign-in record. All of it goes immediately, in one go.",
    "Каждая карточка, повторение, задание, настройка, отсканированная страница, проверка уровня, пробный экзамен с вашим сочинением, сообщение репетитору, предложенное исправление, отмеченное слово, отложенное слово, значок и членство в группе, а также ваша учётная запись для входа. Всё это удаляется сразу, одним действием.",
    "Кожна картка, повторення, завдання, налаштування, відсканована сторінка, перевірка рівня, пробний іспит із вашим твором, повідомлення репетиторові, запропоноване виправлення, позначене слово, відкладене слово, значок і членство в групі, а також ваш запис для входу. Усе це видаляється одразу, однією дією."],
  ["What is not", "Что не удаляется", "Що не видаляється"],
  ["The shared dictionary stays, because other learners have cards built on it, but any entry you edited stops being attributed to you.",
    "Общий словарь остаётся, потому что на нём построены карточки других учеников, но любая исправленная вами статья перестаёт быть записанной на вас.",
    "Спільний словник залишається, бо на ньому побудовані картки інших учнів, але будь-яка виправлена вами стаття перестає бути записаною на вас."],
  ["If this installation is not set up to delete the sign-in record itself, the button says so, and the address on the {privacy} page is who to ask.",
    "Если эта установка не настроена удалять учётную запись для входа сама, кнопка так и скажет, и обращаться нужно по адресу, указанному на странице {privacy}.",
    "Якщо цю установку не налаштовано видаляти запис для входу самостійно, кнопка так і скаже, і звертатися треба за адресою, вказаною на сторінці {privacy}."],
  ["There is no separate archive, and no backup that outlives a deletion by more than the hosting provider’s own retention window.",
    "Отдельного архива нет, и нет резервной копии, которая переживала бы удаление дольше, чем длится собственный срок хранения хостинг-провайдера.",
    "Окремого архіву немає, і немає резервної копії, яка переживала б видалення довше, ніж триває власний строк зберігання хостинг-провайдера."],
  ["Before you delete", "Перед удалением", "Перед видаленням"],
  ["Take an export first: this keeps no copy. {path} gives you everything as one file, and the same file restores into a fresh installation.",
    "Сначала сделайте экспорт: копия не сохраняется. {path} отдаёт вам всё одним файлом, и этот же файл восстанавливается в новой установке.",
    "Спочатку зробіть експорт: копія не зберігається. {path} віддає вам усе одним файлом, і цей самий файл відновлюється в новій установці."],
  // The two lines that point here.
  ["{link} says what goes and what stays, and works without the app.",
    "На странице {link} сказано, что удаляется и что остаётся; она работает и без приложения.",
    "На сторінці {link} сказано, що видаляється і що залишається; вона працює і без застосунку."],
  ["Without the app, or before you have signed in, {link} says where the button is and what it removes.",
    "Без приложения или до входа в систему страница {link} говорит, где находится кнопка и что она удаляет.",
    "Без застосунку або до входу сторінка {link} каже, де знаходиться кнопка і що вона видаляє."],
];

export const ACCOUNT_AREA: Area = {
  ru: Object.fromEntries(LINES.map(([en, ru]) => [en, ru])),
  uk: Object.fromEntries(LINES.map(([en, , uk]) => [en, uk])),
};
