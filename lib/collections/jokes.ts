/**
 * JUKU JOKES, A FRESH ONE EVERY VISIT, FOR THE CARD ON TODAY.
 *
 * Every Estonian grew up on these. Juku is the boy in the joke, the way
 * Little Johnny is in English: the teacher asks him something, his mother
 * catches him at something, and he answers with the one thing nobody
 * expected. They are the first jokes a child tells and the first a learner
 * can follow, because they are short, they are dialogue, and the words are
 * the words of a classroom and a kitchen.
 *
 * WRITTEN RATHER THAN RECORDED, WHICH IS ADR-005 AMENDMENT 5. Nobody records
 * a joke in a dictionary, so these lines are typed, on the standing ADR-025
 * amendment 1 gave the scene bank and amendment 4 gave a beginner's
 * sentences: drafted, held by a machine to a rule it can check, and read by
 * the native Estonian speaker who develops this app in the pull request that
 * adds them. The machine's half is `jokes.test.ts`: every word of every
 * Estonian line is a spelling the shipped forms list knows (Ekilex and
 * Vabamorf, guessing off), or a name the test lets through by name, and every
 * English line carries no Estonian letter. What no machine can check is
 * whether a joke is funny and whether anybody would say it that way, which is
 * the person's reading. All 188 were read on 2026-10-25 and nine corrected.
 *
 * WHERE THEY MAY GO, AND WHERE THEY MAY NOT. On the card on Today and nowhere
 * else. Never a card answer, an exam item, a marking target, a scene line or a
 * sentence lent to a word, because each of those says its Estonian was
 * recorded; `scripts/invariants/jokes-stay-on-their-card.ts` holds the
 * readers to a closed list. Nothing is stored and nothing is graded: a joke is
 * read, laughed at or not, and gone.
 *
 * THE SHAPE. A joke is a list of lines, each with its English. A line that
 * opens with a short capitalized label and a colon is said by that person
 * (`Õpetaja: ...`, `Juku: ...`); any other line is the narrator. The English
 * is a translation of the line beside it rather than an explanation of the
 * joke, because a joke explained is a joke gone, and a few of them only work
 * in Estonian, which the learner is here to find out.
 *
 * WHICH ONE is a draw on every visit rather than a walk by the date. One joke
 * a day was the first shape, and the operator asked for a new one every time
 * somebody comes back to Today or reloads it: a joke read is a joke spent, and
 * the same one waiting all day is a card somebody learns to scroll past.
 *
 * Pure: no React, no Prisma, no clock.
 */
import { shuffle } from "@/lib/random/shuffle";

/** One line of a joke, in Estonian and in English. */
export type JokeLine = readonly [et: string, en: string];

export type Joke = readonly JokeLine[];

export const JOKES: readonly Joke[] = [
  [
    ["Õpetaja: Juku, nimeta viis Aafrika looma!", "Teacher: Juku, name five African animals!"],
    ["Juku: Neli lõvi ja üks elevant.", "Juku: Four lions and one elephant."],
  ],
  [
    ["Õpetaja: Juku, kui sul on kümme õuna ja sa annad Marile viis, mis sul siis on?", "Teacher: Juku, if you have ten apples and you give Mari five, what do you have then?"],
    ["Juku: Hea süda.", "Juku: A good heart."],
  ],
  [
    ["Õpetaja: Juku, miks su kodutöö on isa käekirjaga kirjutatud?", "Teacher: Juku, why is your homework in your dad's handwriting?"],
    ["Juku: Ma kasutasin tema pastakat.", "Juku: I used his pen."],
  ],
  [
    ["Õpetaja: Juku, kus asub Tallinn?", "Teacher: Juku, where is Tallinn?"],
    ["Juku: Õpiku kaheteistkümnendal leheküljel.", "Juku: On page twelve of the textbook."],
  ],
  [
    ["Õpetaja: Soojas asjad paisuvad, külmas tõmbuvad kokku. Juku, too näide!", "Teacher: Things get bigger in the warmth and smaller in the cold. Juku, give an example!"],
    ["Juku: Suvel on päevad pikad, talvel lühikesed.", "Juku: In summer the days are long, in winter they are short."],
  ],
  [
    ["Õpetaja: Juku, sa hilinesid jälle!", "Teacher: Juku, you're late again!"],
    ["Juku: Aga te ütlesite ise, et õppida pole kunagi liiga hilja.", "Juku: But you said yourself it's never too late to learn."],
  ],
  [
    ["Isa: Juku, kuidas koolis läks?", "Dad: Juku, how was school?"],
    ["Juku: Nagu Titanicul.", "Juku: Like the Titanic."],
    ["Isa: Kuidas nii?", "Dad: How so?"],
    ["Juku: Alguses läks kõik hästi, aga siis tuli kontrolltöö.", "Juku: It all went well at first, and then the test came along."],
  ],
  [
    ["Õpetaja: Juku, sinu kirjand koerast on sõna-sõnalt sama, mis su vennal.", "Teacher: Juku, your essay about the dog is word for word the same as your brother's."],
    ["Juku: Meil on ju sama koer.", "Juku: Well, we have the same dog."],
  ],
  [
    ["Õpetaja: Juku, kes avastas Ameerika?", "Teacher: Juku, who discovered America?"],
    ["Juku: Kolumbus.", "Juku: Columbus."],
    ["Õpetaja: Õige. Ja millal?", "Teacher: Right. And when?"],
    ["Juku: Kui ta sinna jõudis.", "Juku: When he got there."],
  ],
  [
    ["Õpetaja: Juku, mis on roheline ja hüppab?", "Teacher: Juku, what is green and jumps?"],
    ["Juku: Konn.", "Juku: A frog."],
    ["Õpetaja: Õige! Aga mis on punane ja hüppab?", "Teacher: Right! And what is red and jumps?"],
    ["Juku: Konn punases kampsunis.", "Juku: A frog in a red jumper."],
  ],
  [
    ["Õpetaja: Juku, nimeta kaks asesõna.", "Teacher: Juku, name two pronouns."],
    ["Juku: Kes, mina?", "Juku: Who, me?"],
    ["Õpetaja: Väga hea!", "Teacher: Very good!"],
  ],
  [
    ["Õpetaja: Juku, mis ajas on lause „Ma olen ilus“?", "Teacher: Juku, what tense is the sentence “I am beautiful”?"],
    ["Juku: Minevikus, õpetaja.", "Juku: The past, teacher."],
  ],
  [
    ["Õpetaja: Juku, kui sa ostad viis jäätist ja sööd kolm ära, mis sul siis on?", "Teacher: Juku, if you buy five ice creams and eat three, what do you have then?"],
    ["Juku: Kõhuvalu.", "Juku: A stomach ache."],
  ],
  [
    ["Ema: Juku, miks sa õpikut padja all hoiad?", "Mom: Juku, why do you keep your textbook under your pillow?"],
    ["Juku: Et teadmised öösel ise pähe imbuksid.", "Juku: So the knowledge soaks into my head by itself at night."],
  ],
  [
    ["Juku: Isa, kas sa oskad pimedas kirjutada?", "Juku: Dad, can you write in the dark?"],
    ["Isa: Muidugi.", "Dad: Of course."],
    ["Juku: Siis kustuta tuli ja kirjuta mu tunnistusele alla.", "Juku: Then turn off the light and sign my report card."],
  ],
  [
    ["Õpetaja: Kui mul on ühes käes viis õuna ja teises kuus, mis mul siis on?", "Teacher: If I have five apples in one hand and six in the other, what do I have?"],
    ["Juku: Väga suured käed.", "Juku: Very big hands."],
  ],
  [
    ["Õpetaja: Juku, kas isa aitas sind kodutööga?", "Teacher: Juku, did your dad help you with your homework?"],
    ["Juku: Ei, ta tegi kõik ise.", "Juku: No, he did it all himself."],
  ],
  [
    ["Õpetaja: Juku, nimeta üks kala!", "Teacher: Juku, name a fish!"],
    ["Juku: Kuldkala.", "Juku: A goldfish."],
    ["Õpetaja: Ja veel üks?", "Teacher: And another one?"],
    ["Juku: Teine kuldkala.", "Juku: Another goldfish."],
  ],
  [
    ["Juku: Isa, kas ussid on maitsvad?", "Juku: Dad, are worms tasty?"],
    ["Isa: Ära räägi laua taga sellistest asjadest!", "Dad: Don't talk about things like that at the table!"],
    ["Pärast lõunat.", "After lunch."],
    ["Isa: Noh, mida sa küsida tahtsid?", "Dad: Well, what did you want to ask?"],
    ["Juku: Su salatis oli uss, aga nüüd teda enam pole.", "Juku: There was a worm in your salad, but it's gone now."],
  ],
  [
    ["Õpetaja: Juku, miks sa hilinesid?", "Teacher: Juku, why were you late?"],
    ["Juku: Tee ääres oli silt „Kool. Aeglaselt!“", "Juku: There was a sign by the road: “School. Slow down!”"],
  ],
  [
    ["Ema: Juku, miks su sokk pahupidi on?", "Mom: Juku, why is your sock inside out?"],
    ["Juku: Teisel poolel oli auk.", "Juku: The other side had a hole in it."],
  ],
  [
    ["Ema: Juku, kas sa pesid käed?", "Mom: Juku, did you wash your hands?"],
    ["Juku: Jah.", "Juku: Yes."],
    ["Ema: Miks seep siis kuiv on?", "Mom: Then why is the soap dry?"],
    ["Juku: Ma pesin väga kiiresti.", "Juku: I washed them very quickly."],
  ],
  [
    ["Õpetaja: Juku, ütle „ma söön“ minevikus!", "Teacher: Juku, say “I eat” in the past!"],
    ["Juku: Ma sõin.", "Juku: I ate."],
    ["Õpetaja: Õige. Aga tulevikus?", "Teacher: Right. And in the future?"],
    ["Juku: Ma olen jälle näljane.", "Juku: I'll be hungry again."],
  ],
  [
    ["Õpetaja: Juku, mitu aastaaega on Eestis?", "Teacher: Juku, how many seasons are there in Estonia?"],
    ["Juku: Kaks. Suvi ja suve ootamine.", "Juku: Two. Summer, and waiting for summer."],
  ],
  [
    ["Ema: Juku, kapis oli kaks kooki, nüüd on ainult üks. Kuidas see juhtus?", "Mom: Juku, there were two cakes in the cupboard, and now there's only one. How did that happen?"],
    ["Juku: Kapis oli pime ja ma ei näinud teist.", "Juku: It was dark in the cupboard and I didn't see the other one."],
  ],
  [
    ["Isa: Juku, miks su tunnistusel on ainult kahed?", "Dad: Juku, why is your report card all twos out of five?"],
    ["Juku: Ma ei taha üle pingutada.", "Juku: I don't want to overdo it."],
  ],
  [
    ["Juku: Ema, ma säästsin täna kaks eurot! Jooksin bussi kõrval, selle asemel et bussi peale minna.", "Juku: Mom, I saved two euros today! I ran beside the bus instead of getting on it."],
    ["Ema: Rumal! Oleksid takso kõrval jooksnud, siis oleksid kümme säästnud.", "Mom: Silly! If you'd run beside a taxi, you'd have saved ten."],
  ],
  [
    ["Õpetaja: Juku, mis on sõna „suur“ vastand?", "Teacher: Juku, what's the opposite of “big”?"],
    ["Juku: Väike.", "Juku: Small."],
    ["Õpetaja: Ja sõna „reede“ vastand?", "Teacher: And the opposite of “Friday”?"],
    ["Juku: Esmaspäev.", "Juku: Monday."],
  ],
  [
    ["Ema: Juku, sa panid kingad valepidi jalga!", "Mom: Juku, you've put your shoes on the wrong feet!"],
    ["Juku: Aga mul ei ole teisi jalgu.", "Juku: But I haven't got any other feet."],
  ],
  [
    ["Õpetaja: Juku, ma loodan, et ma ei näinud, kuidas sa Mari pealt maha kirjutasid!", "Teacher: Juku, I hope I didn't just see you copying from Mari!"],
    ["Juku: Mina loodan ka, õpetaja.", "Juku: So do I, teacher."],
  ],
  [
    ["Õpetaja: Juku, miks su kodutöö nii lühike on?", "Teacher: Juku, why is your homework so short?"],
    ["Juku: Ma säästan metsa.", "Juku: I'm saving the forest."],
  ],
  [
    ["Ema: Juku, kas sina lõhkusid taldriku?", "Mom: Juku, did you break the plate?"],
    ["Juku: Ei, põrand lõhkus. Mina ainult pillasin.", "Juku: No, the floor did. I only dropped it."],
  ],
  [
    ["Õpetaja: Juku, millises kuus on kakskümmend kaheksa päeva?", "Teacher: Juku, which month has twenty-eight days?"],
    ["Juku: Kõigis.", "Juku: All of them."],
  ],
  [
    ["Õpetaja: Juku, kuidas nimetatakse inimest, kes räägib ka siis, kui keegi ei kuula?", "Teacher: Juku, what do you call a person who keeps talking when nobody is listening?"],
    ["Juku: Õpetajaks.", "Juku: A teacher."],
  ],
  [
    ["Juku: Ema, kas ma tohin õue mängima minna?", "Juku: Mom, can I go out to play?"],
    ["Ema: Nende auklike pükstega?", "Mom: With those holey trousers?"],
    ["Juku: Ei, naabri poistega.", "Juku: No, with the boys next door."],
  ],
  [
    ["Arst: Juku, kuidas sa käe murdsid?", "Doctor: Juku, how did you break your arm?"],
    ["Juku: Kas te näete seda treppi seal?", "Juku: Do you see those stairs over there?"],
    ["Arst: Jah.", "Doctor: Yes."],
    ["Juku: Mina ei näinud.", "Juku: Well, I didn't."],
  ],
  [
    ["Juku: Õpetaja, kas te karistaksite mind millegi eest, mida ma ei teinud?", "Juku: Teacher, would you punish me for something I didn't do?"],
    ["Õpetaja: Muidugi mitte.", "Teacher: Of course not."],
    ["Juku: Hästi, sest ma ei teinud kodutööd.", "Juku: Good, because I didn't do my homework."],
  ],
  [
    ["Õpetaja: Juku, tule tahvli juurde ja näita kaardil Ameerikat.", "Teacher: Juku, come to the board and show us America on the map."],
    ["Juku näitab.", "Juku points to it."],
    ["Õpetaja: Õige. Mari, kes avastas Ameerika?", "Teacher: Right. Mari, who discovered America?"],
    ["Mari: Juku!", "Mari: Juku!"],
  ],
  [
    ["Ema: Juku, mida sa täna koolis õppisid?", "Mom: Juku, what did you learn at school today?"],
    ["Juku: Seda, et eilne kodutöö oli vale.", "Juku: That yesterday's homework was wrong."],
  ],
  [
    ["Õpetaja: Juku, miks linnud lõunasse lendavad?", "Teacher: Juku, why do birds fly south?"],
    ["Juku: Sest jala on sinna liiga kaugele minna.", "Juku: Because it's too far to walk."],
  ],
  [
    ["Õpetaja: Juku, kui sul on üks euro ja sa küsid isalt veel ühe, mitu eurot sul siis on?", "Teacher: Juku, if you have one euro and ask your dad for another, how many euros do you have?"],
    ["Juku: Üks.", "Juku: One."],
    ["Õpetaja: Sa ei oska matemaatikat!", "Teacher: You don't know your math!"],
    ["Juku: Teie ei tunne mu isa.", "Juku: You don't know my dad."],
  ],
  [
    ["Õpetaja: Juku, mida sa suvel tegid?", "Teacher: Juku, what did you do in the summer?"],
    ["Juku: Kasvasin viis sentimeetrit.", "Juku: I grew five centimeters."],
  ],
  [
    ["Ema: Juku, miks sa hüppad?", "Mom: Juku, why are you jumping?"],
    ["Juku: Ma võtsin rohtu ja unustasin enne pudelit loksutada.", "Juku: I took my medicine and forgot to shake the bottle first."],
  ],
  [
    ["Õpetaja: Juku, sa hilined sel nädalal juba kolmandat korda!", "Teacher: Juku, this is the third time you're late this week!"],
    ["Juku: Ja täna on alles kolmapäev.", "Juku: And it's only Wednesday."],
  ],
  [
    ["Juku: Vanaisa, kas sa olid Noa laeval?", "Juku: Grandpa, were you on Noah's ark?"],
    ["Vanaisa: Ei olnud.", "Grandpa: No, I wasn't."],
    ["Juku: Kuidas sa siis ära ei uppunud?", "Juku: Then how come you didn't drown?"],
  ],
  [
    ["Ema: Juku, söö porgandit, see on silmadele hea.", "Mom: Juku, eat your carrot, it's good for your eyes."],
    ["Juku: Kust sa tead?", "Juku: How do you know?"],
    ["Ema: Kas sa oled kunagi näinud jänest prillidega?", "Mom: Have you ever seen a hare wearing glasses?"],
  ],
  [
    ["Õpetaja: Juku, mis on sünonüüm?", "Teacher: Juku, what is a synonym?"],
    ["Juku: Sõna, mida kasutad, kui teist sõna ei oska õigesti kirjutada.", "Juku: A word you use when you can't spell the other one."],
  ],
  [
    ["Õpetaja: Juku, mis on sõna „laps“ mitmus?", "Teacher: Juku, what's the plural of “child”?"],
    ["Juku: Kaksikud.", "Juku: Twins."],
  ],
  [
    ["Õpetaja: Juku, mis lahingus Napoleon suri?", "Teacher: Juku, in which battle did Napoleon die?"],
    ["Juku: Oma viimases.", "Juku: In his last one."],
  ],
  [
    ["Õpetaja: Juku, kuhu pandi Inglise kuningatele kroon?", "Teacher: Juku, where did they put the crown on English kings?"],
    ["Juku: Pähe.", "Juku: On the head."],
  ],
  [
    ["Ema: Juku, ära sikuta kassi saba!", "Mom: Juku, stop pulling the cat's tail!"],
    ["Juku: Ma ainult hoian. Kass ise sikutab.", "Juku: I'm only holding it. The cat is the one pulling."],
  ],
  [
    ["Juku: Õpetaja, mis see on, mis läheb aina üles, aga mitte kunagi alla?", "Juku: Teacher, what goes up and up but never comes down?"],
    ["Õpetaja: Ei tea.", "Teacher: I don't know."],
    ["Juku: Teie vanus.", "Juku: Your age."],
  ],
  [
    ["Õpetaja: Juku, miks sa alati nii räpane oled?", "Teacher: Juku, why are you always so dirty?"],
    ["Juku: Ma olen maapinnale lähemal kui teie.", "Juku: I'm closer to the ground than you are."],
  ],
  [
    ["Juku: Doktor, mulle tundub, et ma olen koer.", "Juku: Doctor, I think I'm a dog."],
    ["Arst: Mis ajast?", "Doctor: Since when?"],
    ["Juku: Kutsikast saadik.", "Juku: Since I was a puppy."],
  ],
  [
    ["Juku: Doktor, keegi ei pane mind tähele!", "Juku: Doctor, nobody ever notices me!"],
    ["Arst: Järgmine, palun!", "Doctor: Next, please!"],
  ],
  [
    ["Juku: Ema, kas ma saan jõuludeks koera?", "Juku: Mom, can I have a dog for Christmas?"],
    ["Ema: Ei, jõuludeks saad ikka verivorsti nagu kõik teised.", "Mom: No, you'll have blood sausage like everybody else."],
  ],
  [
    ["Juku: Isa, miks taevas on sinine?", "Juku: Dad, why is the sky blue?"],
    ["Isa: Ei tea.", "Dad: I don't know."],
    ["Juku: Aga miks meri on soolane?", "Juku: And why is the sea salty?"],
    ["Isa: Ei tea.", "Dad: I don't know."],
    ["Juku: Kas sa oled pahane, et ma nii palju küsin?", "Juku: Are you cross that I ask so much?"],
    ["Isa: Ei ole. Kuidas sa muidu midagi teada saad?", "Dad: Not at all. How else will you find anything out?"],
  ],
  [
    ["Ema: Juku, miks sa kodutööd ei tee?", "Mom: Juku, why aren't you doing your homework?"],
    ["Juku: Internet ei tööta. Pean ise mõtlema hakkama.", "Juku: The internet's down. I'll have to start thinking for myself."],
  ],
  [
    ["Juku: Ema, mäletad seda vaasi, mida meie pere on põlvest põlve edasi andnud?", "Juku: Mom, you know that vase our family has passed down from generation to generation?"],
    ["Ema: Jah?", "Mom: Yes?"],
    ["Juku: Minu põlvkond pillas selle maha.", "Juku: My generation dropped it."],
  ],
  [
    ["Õpetaja: Juku, kumb on lähemal, kuu või Austraalia?", "Teacher: Juku, which is closer, the moon or Australia?"],
    ["Juku: Kuu muidugi. Kuud on näha, Austraaliat ei ole.", "Juku: The moon, of course. You can see the moon, and you can't see Australia."],
  ],
  [
    ["Õpetaja: Juku, miks su kontrolltöö on tühi?", "Teacher: Juku, why is your test paper blank?"],
    ["Juku: Mari oli täna haige.", "Juku: Mari was off sick today."],
  ],
  [
    ["Ema: Juku, mine vaata, kas õues sajab vihma.", "Mom: Juku, go and see if it's raining outside."],
    ["Juku: Pole vaja. Kass tuli just märjana tuppa.", "Juku: No need. The cat just came in wet."],
  ],
  [
    ["Ema: Juku, mine kustuta tuli ära.", "Mom: Juku, go and turn the light off."],
    ["Juku: Pole vaja, ma panen silmad kinni.", "Juku: No need, I'll close my eyes."],
  ],
  [
    ["Ema: Juku, pane uks kinni, õues on külm!", "Mom: Juku, shut the door, it's cold outside!"],
    ["Juku: Kas siis on õues soojem, kui ma ukse kinni panen?", "Juku: Will it be warmer outside if I shut it?"],
  ],
  [
    ["Õpetaja: Juku, mida sa tead Surnumerest?", "Teacher: Juku, what do you know about the Dead Sea?"],
    ["Juku: Ma isegi ei teadnud, et see haige oli.", "Juku: I didn't even know it had been ill."],
  ],
  [
    ["Isa: Juku, kelleks sa suurena saada tahad?", "Dad: Juku, what do you want to be when you grow up?"],
    ["Juku: Pensionäriks. Siis ei pea kooli ega tööle minema.", "Juku: A pensioner. Then I won't have to go to school or to work."],
  ],
  [
    ["Ema: Juku, kas sa kukkusid uute pükstega lompi?", "Mom: Juku, did you fall into a puddle in your new trousers?"],
    ["Juku: Jah, mul ei olnud aega neid ära võtta.", "Juku: Yes, there wasn't time to take them off."],
  ],
  [
    ["Juku: Isa, miks kaelkirjakul nii pikk kael on?", "Juku: Dad, why does the giraffe have such a long neck?"],
    ["Isa: Sest tema pea on kehast nii kaugel.", "Dad: Because its head is so far from its body."],
  ],
  [
    ["Juku: Ema, miks isal juukseid ei ole?", "Juku: Mom, why hasn't Dad got any hair?"],
    ["Ema: Sest ta mõtleb väga palju.", "Mom: Because he thinks a lot."],
    ["Juku: Aga miks sul nii palju juukseid on?", "Juku: Then why have you got so much hair?"],
    ["Ema: Söö oma suppi!", "Mom: Eat your soup!"],
  ],
  [
    ["Õpetaja: Juku, tee mulle lause sõnaga „ise“!", "Teacher: Juku, make me a sentence with the word “yourself”!"],
    ["Juku: Tehke ise.", "Juku: Make it yourself."],
  ],
  [
    ["Juku: Isa, mu supis on kärbes!", "Juku: Dad, there's a fly in my soup!"],
    ["Isa: Ära karju, muidu tahavad kõik endale ka.", "Dad: Don't shout, or everybody will want one."],
  ],
  [
    ["Ema: Juku, kas sa andsid kuldkalale värsket vett?", "Mom: Juku, did you give the goldfish fresh water?"],
    ["Juku: Ei, ta pole vana vett veel ära joonud.", "Juku: No, it hasn't finished the old water yet."],
  ],
  [
    ["Õpetaja: Juku, miks sa hilinesid?", "Teacher: Juku, why are you late?"],
    ["Juku: Ma nägin unes jalgpalli ja mäng läks lisaajale.", "Juku: I was dreaming about football and the match went into extra time."],
  ],
  [
    ["Õpetaja: Juku, loe kümneni!", "Teacher: Juku, count to ten!"],
    ["Juku: Üks, kaks, kolm, neli, viis, kuus, seitse, kaheksa, üheksa, kümme.", "Juku: One, two, three, four, five, six, seven, eight, nine, ten."],
    ["Õpetaja: Tubli! Ja mis tuleb pärast kümmet?", "Teacher: Well done! And what comes after ten?"],
    ["Juku: Soldat, emand, kuningas ja äss.", "Juku: Jack, queen, king and ace."],
  ],
  [
    ["Juku helistab õpetajale.", "Juku rings his teacher."],
    ["Juku: Juku on täna haige ja kooli ei tule.", "Juku: Juku is ill today and won't be coming to school."],
    ["Õpetaja: Kellega ma räägin?", "Teacher: Who am I talking to?"],
    ["Juku: Minu isaga.", "Juku: My dad."],
  ],
  [
    ["Õpetaja: Juku, mis on kolm pluss kolm?", "Teacher: Juku, what's three plus three?"],
    ["Juku: Kuus.", "Juku: Six."],
    ["Õpetaja: Hea!", "Teacher: Good!"],
    ["Juku: Ainult hea? See oli ju täiesti õige!", "Juku: Only good? It was completely right!"],
  ],
  [
    ["Õpetaja: Juku, mida tähendab sõna „kannatlikkus“?", "Teacher: Juku, what does the word “patience” mean?"],
    ["Juku: Oodake, ma mõtlen.", "Juku: Wait, let me think."],
  ],
  [
    ["Juku: Minu koer oskab arvutada!", "Juku: My dog can do sums!"],
    ["Mari: Tõesti?", "Mari: Really?"],
    ["Juku: Jah. Küsisin temalt, kui palju on kaks miinus kaks, ja ta ei öelnud midagi.", "Juku: Yes. I asked him what two minus two is, and he said nothing."],
  ],
  [
    ["Õpetaja: Juku, ära räägi, kui mina räägin!", "Teacher: Juku, don't talk while I'm talking!"],
    ["Juku: Aga millal ma siis räägin?", "Juku: Then when do I get to talk?"],
  ],
  [
    ["Juku: Ema, meie õpetaja ei tea midagi!", "Juku: Mom, our teacher doesn't know anything!"],
    ["Ema: Miks sa nii arvad?", "Mom: What makes you think so?"],
    ["Juku: Ta küsib kogu aeg meie käest.", "Juku: She keeps asking us."],
  ],
  [
    ["Õpetaja: Juku, millal sajab lund?", "Teacher: Juku, when does it snow?"],
    ["Juku: Talvel.", "Juku: In winter."],
    ["Õpetaja: Õige. Aga Eestis?", "Teacher: Right. And in Estonia?"],
    ["Juku: Ükskõik millal, isegi jaanipäeval.", "Juku: Any time at all, even on Midsummer Day."],
  ],
  [
    ["Ema: Juku, vii koer jalutama!", "Mom: Juku, take the dog for a walk!"],
    ["Juku: Ta oskab ise ka jalutada.", "Juku: He can walk by himself."],
  ],
  [
    ["Juku: Ema, ma koristasin oma toa ära!", "Juku: Mom, I've tidied my room!"],
    ["Ema: Tubli! Aga kus kõik asjad on?", "Mom: Well done! But where is everything?"],
    ["Juku: Voodi all.", "Juku: Under the bed."],
  ],
  [
    ["Õpetaja: Juku, mis kell on?", "Teacher: Juku, what time is it?"],
    ["Juku: Kõhu järgi on lõunaaeg.", "Juku: Going by my stomach, it's lunchtime."],
  ],
  [
    ["Juku: Doktor, kui ma käe niimoodi üles tõstan, siis see valutab.", "Juku: Doctor, when I lift my arm like this, it hurts."],
    ["Arst: Ära siis niimoodi tõsta.", "Doctor: Then don't lift it like that."],
  ],
  [
    ["Isa: Juku, mina olin sinu vanuses viieline õpilane.", "Dad: Juku, at your age I was a top-marks pupil."],
    ["Juku: Sinul olid ju teised õpetajad.", "Juku: You had different teachers."],
  ],
  [
    ["Õpetaja: Juku, milline lind ei ehita pesa?", "Teacher: Juku, which bird doesn't build a nest?"],
    ["Juku: Kägu.", "Juku: The cuckoo."],
    ["Õpetaja: Õige! Aga miks?", "Teacher: Right! But why?"],
    ["Juku: Sest ta elab kellas.", "Juku: Because it lives in a clock."],
  ],
  [
    ["Juku: Ema, kas ma tohin klaverit mängida?", "Juku: Mom, can I play the piano?"],
    ["Ema: Pese enne käed!", "Mom: Wash your hands first!"],
    ["Juku: Aga ma mängin ainult mustade klahvidega.", "Juku: But I'll only play the black keys."],
  ],
  [
    ["Juku: Isa, mu mänguauto ei sõida. Vist on mootoris vesi.", "Juku: Dad, my toy car won't go. I think there's water in the engine."],
    ["Isa: Kus auto on?", "Dad: Where's the car?"],
    ["Juku: Vannis.", "Juku: In the bath."],
  ],
  [
    ["Õpetaja: Juku, mitu käänet on eesti keeles?", "Teacher: Juku, how many cases does Estonian have?"],
    ["Juku: Neliteist.", "Juku: Fourteen."],
    ["Õpetaja: Õige! Kas sa oskad kõiki?", "Teacher: Right! Do you know them all?"],
    ["Juku: Ei, aga ma tean, kus need õpikus on.", "Juku: No, but I know where they are in the textbook."],
  ],
  [
    ["Mari: Juku, mis on sõna „jäätis“ mitmus?", "Mari: Juku, what's the plural of “ice cream”?"],
    ["Juku: Õnn.", "Juku: Happiness."],
  ],
  [
    ["Õpetaja: Juku, pane sõna „kass“ omastavasse.", "Teacher: Juku, put the word “cat” in the case that says whose."],
    ["Juku: Minu kass.", "Juku: My cat."],
  ],
  [
    ["Õpetaja: Juku, too näide osastavast käändest!", "Teacher: Juku, give me an example of the case that means “some of”!"],
    ["Juku: Kooki, palun.", "Juku: Some cake, please."],
  ],
  [
    ["Õpetaja: Juku, ütle mulle üks lause tulevikus.", "Teacher: Juku, give me a sentence about the future."],
    ["Juku: Homme teen kodutöö ära.", "Juku: Tomorrow I'll do my homework."],
    ["Õpetaja: Väga hea.", "Teacher: Very good."],
    ["Juku: Seda ütlesin ma ka eile.", "Juku: That's what I said yesterday, too."],
  ],
  [
    ["Õpetaja: Juku, kas eesti keeles on sõna, kus on neli ühesugust tähte järjest?", "Teacher: Juku, is there an Estonian word with the same letter four times in a row?"],
    ["Juku: On küll. Jäääär.", "Juku: There is. The edge of the ice."],
  ],
  [
    ["Õpetaja: Juku, ütle mõni pikk sõna.", "Teacher: Juku, tell me a long word."],
    ["Juku: Kumm.", "Juku: Rubber band."],
    ["Õpetaja: See on ju lühike!", "Teacher: But that's a short one!"],
    ["Juku: Aga seda saab venitada.", "Juku: But you can stretch it."],
  ],
  [
    ["Turist: Vabandust, kuidas ma Estonia kontserdisaali saan?", "Tourist: Excuse me, how do I get to the Estonia concert hall?"],
    ["Juku: Harjutage palju.", "Juku: Practice a lot."],
  ],
  [
    ["Juku: Ema, kas ma olen ilus?", "Juku: Mom, am I handsome?"],
    ["Ema: Sul on väga ilus iseloom.", "Mom: You have a very lovely personality."],
  ],
  [
    ["Juku: Vanaema, miks sa prille kannad?", "Juku: Grandma, why do you wear glasses?"],
    ["Vanaema: Et paremini näha.", "Grandma: To see better."],
    ["Juku: Aga miks sa neid siis otsaees hoiad?", "Juku: Then why do you keep them on your forehead?"],
  ],
  [
    ["Vanaema: Juku, sa oled nii suureks kasvanud!", "Grandma: Juku, you've grown so big!"],
    ["Juku: Sina ka, vanaema.", "Juku: So have you, Grandma."],
  ],
  [
    ["Juku: Isa, kas ma võin homme koju jääda?", "Juku: Dad, can I stay at home tomorrow?"],
    ["Isa: Miks?", "Dad: Why?"],
    ["Juku: Täna oli juba kool.", "Juku: There was already school today."],
  ],
  [
    ["Õpetaja: Juku, sa magad tunnis!", "Teacher: Juku, you're asleep in class!"],
    ["Juku: Ei maga. Ma mõtlen silmad kinni.", "Juku: No, I'm not. I'm thinking with my eyes closed."],
  ],
  [
    ["Õpetaja: Juku, kirjuta tahvlile sõna „kass“.", "Teacher: Juku, write the word “kass” on the board."],
    ["Juku kirjutab: kas.", "Juku writes: kas."],
    ["Õpetaja: Kus teine s on?", "Teacher: Where's the second s?"],
    ["Juku: Kass sõi selle ära.", "Juku: The cat ate it."],
  ],
  [
    ["Õpetaja: Juku, nimeta mõni metsloom.", "Teacher: Juku, name a wild animal."],
    ["Juku: Hunt.", "Juku: A wolf."],
    ["Õpetaja: Õige. Veel?", "Teacher: Right. Any more?"],
    ["Juku: Hundi naine ja hundi lapsed.", "Juku: The wolf's wife and the wolf's children."],
  ],
  [
    ["Ema: Juku, miks sa panid koera nimeks Viis?", "Mom: Juku, why did you name the dog Five?"],
    ["Juku: Siis saan õpetajale öelda, et mul on kodus viis.", "Juku: Then I can tell my teacher I've got a five, top marks, at home."],
  ],
  [
    ["Juku: Isa, kas sa oskad saladust hoida?", "Juku: Dad, can you keep a secret?"],
    ["Isa: Muidugi.", "Dad: Of course."],
    ["Juku: Mina ka. Mul oli täna kontrolltöö.", "Juku: So can I. I had a test today."],
  ],
  [
    ["Õpetaja: Juku, mida tähendavad Eesti lipu värvid?", "Teacher: Juku, what do the colors of the Estonian flag mean?"],
    ["Juku: Sinine on taevas, must on muld ja valge on talv, mis kestab pool aastat.", "Juku: Blue is the sky, black is the soil, and white is the winter that lasts half the year."],
  ],
  [
    ["Turist: Kas Eestis on alati nii külm?", "Tourist: Is it always this cold in Estonia?"],
    ["Juku: Ei, vahel sajab ka vihma.", "Juku: No, sometimes it rains as well."],
  ],
  [
    ["Juku: Ema, miks meie suvi nii lühike on?", "Juku: Mom, why is our summer so short?"],
    ["Ema: Et talvel oleks millest rääkida.", "Mom: So that we have something to talk about in the winter."],
  ],
  [
    ["Juku: Isa, mis on saun?", "Juku: Dad, what is a sauna?"],
    ["Isa: See on koht, kus eestlased lõpuks rääkima hakkavad.", "Dad: It's the place where Estonians finally start talking."],
  ],
  [
    ["Õpetaja: Juku, mitu jalga on ämblikul?", "Teacher: Juku, how many legs does a spider have?"],
    ["Juku: Liiga palju.", "Juku: Too many."],
  ],
  [
    ["Õpetaja: Juku, ühe maja ehitamiseks kulub kaks kuud. Kui kaua kulub kahe maja ehitamiseks?", "Teacher: Juku, it takes two months to build one house. How long does it take to build two?"],
    ["Juku: Ka kaks kuud, kui mõlemat korraga ehitada.", "Juku: Two months as well, if you build them both at once."],
  ],
  [
    ["Õpetaja: Juku, kui sul on taskus kümme eurot ja sa kaotad viis, mis sul taskus on?", "Teacher: Juku, if you have ten euros in your pocket and you lose five, what's in your pocket?"],
    ["Juku: Auk.", "Juku: A hole."],
  ],
  [
    ["Mari: Juku, kuidas matemaatika kontrolltöö läks?", "Mari: Juku, how did the math test go?"],
    ["Juku: Ülesanded olid lihtsad. Ainult vastused olid rasked.", "Juku: The questions were easy. It was only the answers that were hard."],
  ],
  [
    ["Õpetaja: Juku, kui palju on pool kaheksast?", "Teacher: Juku, what is half of eight?"],
    ["Juku: Sõltub. Pikuti pooleks on kolm, põiki pooleks on null.", "Juku: It depends. Cut down the middle it's a three, cut across it's a zero."],
  ],
  [
    ["Juku: Õpetaja, ma ei saa aru!", "Juku: Teacher, I don't understand!"],
    ["Õpetaja: Millest sa aru ei saa?", "Teacher: What don't you understand?"],
    ["Juku: Miks me peame koolis käima.", "Juku: Why we have to go to school."],
  ],
  [
    ["Ema: Juku, vanaema andis sulle kommi. Mis sa ütled?", "Mom: Juku, Grandma gave you a sweet. What do you say?"],
    ["Juku: Aitäh. Aga kui sa annad veel ühe, siis ütlen kaks korda.", "Juku: Thank you. And if you give me another one, I'll say it twice."],
  ],
  [
    ["Juku: Vanaisa, kas sa olid väiksena ka vallatu?", "Juku: Grandpa, were you naughty when you were little too?"],
    ["Vanaisa: Natuke.", "Grandpa: A little."],
    ["Juku: Ja kuidas sa sellest lahti said?", "Juku: And how did you stop?"],
    ["Vanaisa: Kasvasin suureks.", "Grandpa: I grew up."],
  ],
  [
    ["Isa: Juku, kes sõi kõik kommid ära?", "Dad: Juku, who ate all the sweets?"],
    ["Juku: Mina ainult vaatasin. Need kadusid ise.", "Juku: I was only watching. They disappeared by themselves."],
  ],
  [
    ["Juku: Ema, mul on üks hea ja üks halb uudis.", "Juku: Mom, I've got some good news and some bad news."],
    ["Ema: Alusta heast.", "Mom: Start with the good."],
    ["Juku: Ma sain matemaatikas viie!", "Juku: I got a five in math, top marks!"],
    ["Ema: Ja halb?", "Mom: And the bad?"],
    ["Juku: See ei ole tõsi.", "Juku: It isn't true."],
  ],
  [
    ["Õpetaja: Juku, mis juhtus 1918. aastal?", "Teacher: Juku, what happened in 1918?"],
    ["Juku: Ei tea, ma ei olnud siis veel sündinud.", "Juku: I don't know, I hadn't been born yet."],
    ["Õpetaja: Eesti sai iseseisvaks!", "Teacher: Estonia became independent!"],
    ["Juku: Näete, ilma minuta saadi ka hakkama.", "Juku: See, they managed without me as well."],
  ],
  [
    ["Õpetaja: Juku, miks su koolikott on tühi?", "Teacher: Juku, why is your schoolbag empty?"],
    ["Juku: Nii on seda kergem kanda.", "Juku: It's easier to carry like that."],
  ],
  [
    ["Juku: Doktor, ma unustan kõik ära.", "Juku: Doctor, I forget everything."],
    ["Arst: Mis ajast?", "Doctor: Since when?"],
    ["Juku: Mis ajast mis?", "Juku: Since when what?"],
  ],
  [
    ["Juku: Doktor, ma näen kõike topelt.", "Juku: Doctor, I'm seeing everything twice."],
    ["Arst: Istuge sellele toolile.", "Doctor: Sit down on that chair."],
    ["Juku: Kummale?", "Juku: Which one?"],
  ],
  [
    ["Juku: Doktor, kui ma kohvi joon, siis valutab mu silm.", "Juku: Doctor, when I drink coffee, my eye hurts."],
    ["Arst: Võtke enne lusikas tassist välja.", "Doctor: Take the spoon out of the cup first."],
  ],
  [
    ["Ema: Juku, miks sa vanaemale nii aeglaselt kirja kirjutad?", "Mom: Juku, why are you writing to Grandma so slowly?"],
    ["Juku: Vanaema loeb aeglaselt.", "Juku: Grandma reads slowly."],
  ],
  [
    ["Juku: Isa, kas kõik lumehelbed on erinevad?", "Juku: Dad, is every snowflake different?"],
    ["Isa: On küll.", "Dad: Yes, every one."],
    ["Juku: Aga kes need kõik üle kontrollis?", "Juku: But who checked them all?"],
  ],
  [
    ["Õpetaja: Juku, sinu joonistusel ei ole midagi peal!", "Teacher: Juku, there's nothing on your drawing!"],
    ["Juku: On küll. See on jääkaru lumetormis.", "Juku: Yes, there is. It's a polar bear in a snowstorm."],
  ],
  [
    ["Õpetaja: Juku, mis sinu pildil on?", "Teacher: Juku, what's in your picture?"],
    ["Juku: Lehm, kes sööb rohtu.", "Juku: A cow eating grass."],
    ["Õpetaja: Aga kus rohi on?", "Teacher: But where's the grass?"],
    ["Juku: Lehm sõi ära.", "Juku: The cow ate it."],
    ["Õpetaja: Ja kus lehm on?", "Teacher: And where's the cow?"],
    ["Juku: Mis ta seal tühjal karjamaal ikka teeb.", "Juku: Well, what would she be doing in an empty pasture?"],
  ],
  [
    ["Juku: Ema, kas ma tohin kommi?", "Juku: Mom, can I have a sweet?"],
    ["Ema: Pärast õhtusööki.", "Mom: After dinner."],
    ["Juku: Siis anna mulle õhtusöök kohe.", "Juku: Then give me dinner right now."],
  ],
  [
    ["Juku: Vanaema, miks sul nii palju kortse on?", "Juku: Grandma, why have you got so many wrinkles?"],
    ["Vanaema: Iga korts on ühe naeratuse jälg.", "Grandma: Every wrinkle is where a smile has been."],
    ["Juku: Siis sa oled väga palju naernud.", "Juku: Then you've laughed an awful lot."],
  ],
  [
    ["Juku: Ema, kus ma sündisin?", "Juku: Mom, where was I born?"],
    ["Ema: Tallinnas.", "Mom: In Tallinn."],
    ["Juku: Aga sina?", "Juku: And you?"],
    ["Ema: Tartus.", "Mom: In Tartu."],
    ["Juku: Aga isa?", "Juku: And Dad?"],
    ["Ema: Pärnus.", "Mom: In Pärnu."],
    ["Juku: Kui hea, et me kõik kokku saime!", "Juku: What luck that we all found each other!"],
  ],
  [
    ["Õpetaja: Juku, miks sa ütled, et sinu koer on tark?", "Teacher: Juku, why do you say your dog is clever?"],
    ["Juku: Kui ma kodutööd teen, läheb ta teise tuppa.", "Juku: When I do my homework, he goes into another room."],
  ],
  [
    ["Juku: Isa, mitu korda päevas peab hambaid pesema?", "Juku: Dad, how many times a day do you have to brush your teeth?"],
    ["Isa: Kaks korda.", "Dad: Twice."],
    ["Juku: Ma pesin eile kaks korda, nii et täna ei pea.", "Juku: I brushed them twice yesterday, so I don't have to today."],
  ],
  [
    ["Ema: Juku, kas sa sõid õuna ära?", "Mom: Juku, did you eat the apple?"],
    ["Juku: Jah, aga südame andsin Marile.", "Juku: Yes, but I gave my heart to Mari."],
  ],
  [
    ["Mari: Juku, kas sa tuled minu sünnipäevale?", "Mari: Juku, are you coming to my birthday?"],
    ["Juku: Kas tort on ka?", "Juku: Will there be cake?"],
    ["Mari: On.", "Mari: Yes."],
    ["Juku: Siis ma tulen kaks korda.", "Juku: Then I'll come twice."],
  ],
  [
    ["Õpetaja: Juku, kes kirjutas „Kalevipoja“?", "Teacher: Juku, who wrote Kalevipoeg?"],
    ["Juku: Mitte mina, ausalt!", "Juku: It wasn't me, honestly!"],
  ],
  [
    ["Ema: Juku, miks vannitoa põrand märg on?", "Mom: Juku, why is the bathroom floor wet?"],
    ["Juku: Ma katsetasin, kas mu paat ujub.", "Juku: I was testing whether my boat floats."],
  ],
  [
    ["Juku: Ema, kui palju ma väärt olen?", "Juku: Mom, how much am I worth?"],
    ["Ema: Sa oled kallim kui kogu maailm.", "Mom: You're worth more than the whole world."],
    ["Juku: Kas ma saan siis ühe euro?", "Juku: Then can I have one euro?"],
  ],
  [
    ["Õpetaja: Juku, nimeta midagi, kuhu on lihtne sisse saada, aga raske välja.", "Teacher: Juku, name something that is easy to get into but hard to get out of."],
    ["Juku: Voodi hommikul.", "Juku: Bed, in the morning."],
  ],
  [
    ["Õpetaja: Juku, kumb on raskem, kilo rauda või kilo sulgi?", "Teacher: Juku, which is heavier, a kilo of iron or a kilo of feathers?"],
    ["Juku: Raud.", "Juku: The iron."],
    ["Õpetaja: Vale, nad on täpselt sama rasked!", "Teacher: Wrong, they weigh exactly the same!"],
    ["Juku: Siis laske mõlemal oma varbale kukkuda.", "Juku: Then drop them both on your toe."],
  ],
  [
    ["Ema: Juku, kas sa võtsid vanni?", "Mom: Juku, did you take a bath?"],
    ["Juku: Miks, kas mõni on puudu?", "Juku: Why, is one missing?"],
  ],
  [
    ["Juku: Ema, õpetaja ütles, et ma olen klassis milleski kõige parem!", "Juku: Mom, the teacher said I'm the best in the class at something!"],
    ["Ema: Milles?", "Mom: At what?"],
    ["Juku: Rääkimises.", "Juku: Talking."],
  ],
  [
    ["Juku: Vanaisa, mis oli enne internetti?", "Juku: Grandpa, what was there before the internet?"],
    ["Vanaisa: Mina.", "Grandpa: Me."],
  ],
  [
    ["Juku: Isa, mitu inimest teie kontoris töötab?", "Juku: Dad, how many people work in your office?"],
    ["Isa: Umbes pooled.", "Dad: About half of them."],
  ],
  [
    ["Õpetaja: Juku, miks sul on üks sokk punane ja teine roheline?", "Teacher: Juku, why is one of your socks red and the other green?"],
    ["Juku: Mul on kodus täpselt samasugune paar veel.", "Juku: I've got another pair just like it at home."],
  ],
  [
    ["Õpetaja: Juku, miks sa kella aknast välja viskasid?", "Teacher: Juku, why did you throw the clock out of the window?"],
    ["Juku: Tahtsin näha, kuidas aeg lendab.", "Juku: I wanted to see time fly."],
  ],
  [
    ["Juku: Isa, aita mul ühist nimetajat leida!", "Juku: Dad, help me find the common denominator!"],
    ["Isa: Kas nad otsivad seda ikka veel? Minu ajal otsiti ka.", "Dad: Are they still looking for it? They were looking for it in my day too."],
  ],
  [
    ["Juku: Ema, mu voodi all on koletis!", "Juku: Mom, there's a monster under my bed!"],
    ["Ema: Ütle talle, et ta seal all ka koristaks.", "Mom: Tell it to tidy up while it's under there."],
  ],
  [
    ["Ema: Juku, miks sa kikivarvul kõnnid?", "Mom: Juku, why are you walking on tiptoe?"],
    ["Juku: Et unerohtu mitte äratada.", "Juku: So I don't wake the sleeping pills."],
  ],
  [
    ["Õpetaja: Juku, nimeta kolm asja, milles on piima.", "Teacher: Juku, name three things that have milk in them."],
    ["Juku: Juust, või ja lehm.", "Juku: Cheese, butter and a cow."],
  ],
  [
    ["Õpetaja: Juku, kuidas nimetatakse Tartus elavaid inimesi?", "Teacher: Juku, what do we call the people who live in Tartu?"],
    ["Juku: Tartlased.", "Juku: Tartu folk."],
    ["Õpetaja: Õige! Aga Pärnus elavaid?", "Teacher: Right! And the ones who live in Pärnu?"],
    ["Juku: Suvitajad.", "Juku: Summer holidaymakers."],
  ],
  [
    ["Õpetaja: Juku, mis on kõige laisem loom?", "Teacher: Juku, which animal is the laziest?"],
    ["Juku: Meie kass. Ta magab kakskümmend tundi päevas.", "Juku: Our cat. It sleeps twenty hours a day."],
    ["Õpetaja: Kust sa seda tead?", "Teacher: How do you know?"],
    ["Juku: Ma vaatasin teda terve päeva.", "Juku: I watched it all day."],
  ],
  [
    ["Mari: Juku, mis kell on, kui elevant istub aia peal?", "Mari: Juku, what time is it when an elephant sits on the fence?"],
    ["Juku: Ei tea.", "Juku: I don't know."],
    ["Mari: Aeg osta uus aed.", "Mari: Time to buy a new fence."],
  ],
  [
    ["Õpetaja: Mari, mis on kaks pluss kaks?", "Teacher: Mari, what's two plus two?"],
    ["Mari: Neli.", "Mari: Four."],
    ["Õpetaja: Juku, mis on seitsekümmend kolm korda nelikümmend üks?", "Teacher: Juku, what's seventy-three times forty-one?"],
    ["Juku: Miks Mari sai lihtsa?", "Juku: Why did Mari get the easy one?"],
  ],
  [
    ["Õpetaja: Juku, kirjuta sada korda „Ma ei räägi tunnis“.", "Teacher: Juku, write “I must not talk in class” a hundred times."],
    ["Juku kirjutab: Ma ei räägi tunnis, korda sada.", "Juku writes: I must not talk in class, times a hundred."],
  ],
  [
    ["Inglise keele tund.", "An English lesson."],
    ["Õpetaja: Juku, mida tähendab „I don't know“?", "Teacher: Juku, what does “I don't know” mean?"],
    ["Juku: Ma ei tea.", "Juku: I don't know."],
    ["Õpetaja: Õige!", "Teacher: Right!"],
    ["Juku: Oi, arvasin ära.", "Juku: Phew, I guessed it."],
  ],
  [
    ["Juku: Isa, kas sa annad mulle raha kino jaoks?", "Juku: Dad, can you give me some money for the cinema?"],
    ["Isa: Mis film see on?", "Dad: What's the film?"],
    ["Juku: „Minu isa on maailma kõige lahkem“.", "Juku: “My Dad Is the Kindest in the World”."],
  ],
  [
    ["Juku: Ema, kas meile tulevad külalised?", "Juku: Mom, are we having guests?"],
    ["Ema: Ei, miks sa küsid?", "Mom: No, why do you ask?"],
    ["Juku: Sa koristad.", "Juku: You're tidying up."],
  ],
  [
    ["Juku: Vanaema, sinu pannkoogid on maailma parimad!", "Juku: Grandma, your pancakes are the best in the world!"],
    ["Vanaema: Sa pole ju teiste omasid proovinud.", "Grandma: But you've never tried anybody else's."],
    ["Juku: Pole vaja.", "Juku: No need."],
  ],
  [
    ["Õpetaja: Juku, kus sa elad?", "Teacher: Juku, where do you live?"],
    ["Juku: Kodus.", "Juku: At home."],
    ["Õpetaja: Ja kus su kodu on?", "Teacher: And where is your home?"],
    ["Juku: Seal, kus ema on.", "Juku: Wherever Mom is."],
  ],
  [
    ["Õpetaja: Juku, miks sa redeli kooli tõid?", "Teacher: Juku, why did you bring a ladder to school?"],
    ["Juku: Te ütlesite, et pärast seda kooli lähme kõrgkooli.", "Juku: You said that after this school we go to a higher one."],
  ],
  [
    ["Juku: Õpetaja, kas ma võin koju minna?", "Juku: Teacher, can I go home?"],
    ["Õpetaja: Miks?", "Teacher: Why?"],
    ["Juku: Mu pea on juba täis.", "Juku: My head is full already."],
  ],
  [
    ["Juku: Ema, koer sõi mu kodutöö ära.", "Juku: Mom, the dog ate my homework."],
    ["Ema: Kas talle maitses?", "Mom: Did he like it?"],
    ["Juku: Ei, seal oli liiga palju vigu.", "Juku: No, it had too many mistakes in it."],
  ],
  [
    ["Õpetaja: Juku, mis on keha kõige töökam osa?", "Teacher: Juku, which part of the body works the hardest?"],
    ["Juku: Süda.", "Juku: The heart."],
    ["Õpetaja: Õige! Miks?", "Teacher: Right! Why?"],
    ["Juku: Sest sellel pole kunagi puhkust.", "Juku: Because it never gets a holiday."],
  ],
  [
    ["Õpetaja: Juku, mis on Eesti kõige tähtsam jõgi?", "Teacher: Juku, which is the most important river in Estonia?"],
    ["Juku: Emajõgi.", "Juku: The Emajõgi, the Mother River."],
    ["Õpetaja: Miks?", "Teacher: Why?"],
    ["Juku: Sest emaga ei vaielda.", "Juku: Because you don't argue with your mother."],
  ],
  [
    ["Õpetaja: Juku, mis on Soome pealinn?", "Teacher: Juku, what is the capital of Finland?"],
    ["Juku: Helsingi. Aga laupäeviti Tallinn.", "Juku: Helsinki. But on Saturdays it's Tallinn."],
  ],
  [
    ["Juku: Ema, miks ma pean õhtul magama minema, kui ma pole väsinud, ja hommikul üles tõusma, kui ma olen väsinud?", "Juku: Mom, why do I have to go to bed when I'm not tired, and get up when I am?"],
    ["Ema: Hea küsimus. Mina küsin sama asja.", "Mom: Good question. I've been asking the same thing."],
  ],
  [
    ["Juku: Õpetaja, eilne kodutöö oli nii raske, et isa sai kahe.", "Juku: Teacher, yesterday's homework was so hard that Dad got a two out of five."],
  ],
  [
    ["Juku: Ema, miks hambaarst küsib alati midagi just siis, kui mul suu lahti on?", "Juku: Mom, why does the dentist always ask me questions when my mouth is open?"],
  ],
  [
    ["Mari: Juku, kas sulle meeldib koolis käia?", "Mari: Juku, do you like going to school?"],
    ["Juku: Kõige rohkem meeldib mulle koolist koju minna.", "Juku: What I like best is going home from school."],
  ],
  [
    ["Juku: Ema, õpetaja ütles, et mu käekiri on nagu arstil.", "Juku: Mom, the teacher said my handwriting is like a doctor's."],
    ["Ema: Kas see on hea?", "Mom: Is that good?"],
    ["Juku: Ta ütles, et keegi ei saa sellest aru.", "Juku: She said nobody can read it."],
  ],
  [
    ["Õpetaja: Juku, kui sul on viis kommi ja Mari võtab kaks, mitu sul alles jääb?", "Teacher: Juku, if you have five sweets and Mari takes two, how many are left?"],
    ["Juku: Viis. Mari ei saa neid kätte.", "Juku: Five. Mari can't get at them."],
  ],
  [
    ["Juku: Ema, kas kalad magavad?", "Juku: Mom, do fish sleep?"],
    ["Ema: Magavad.", "Mom: They do."],
    ["Juku: Kus nende padjad on?", "Juku: Where are their pillows?"],
  ],
  [
    ["Juku: Ema, ma tahan venda!", "Juku: Mom, I want a brother!"],
    ["Ema: Miks?", "Mom: Why?"],
    ["Juku: Siis saab ta minu asemel nõusid pesta.", "Juku: Then he can do the washing up instead of me."],
  ],
  [
    ["Õpetaja: Juku, miks sinu kirjandis on ainult üks lause?", "Teacher: Juku, why is there only one sentence in your essay?"],
    ["Juku: Te ütlesite, et kirjutage lühidalt ja selgelt.", "Juku: You told us to write it short and clear."],
  ],
  [
    ["Juku: Vanaema, kas ma võin sinu juures ööbida?", "Juku: Grandma, can I stay the night at yours?"],
    ["Vanaema: Muidugi. Aga miks?", "Grandma: Of course. But why?"],
    ["Juku: Sinu juures ei pea hambaid pesema.", "Juku: At yours I don't have to brush my teeth."],
  ],
  [
    ["Ema: Juku, mine magama, kell on juba palju!", "Mom: Juku, off to bed, it's late!"],
    ["Juku: Kui palju?", "Juku: How late?"],
    ["Ema: Üheksa.", "Mom: Nine."],
    ["Juku: See pole ju palju.", "Juku: That's not much at all."],
  ],
  [
    ["Õpetaja: Juku, miks sa koolis kiivrit kannad?", "Teacher: Juku, why are you wearing a helmet at school?"],
    ["Juku: Te ütlesite, et täna tuleb raske kontrolltöö.", "Juku: You said there's a hard test coming today."],
  ],
  [
    ["Õpetaja: Juku, nimeta üks eestlaste rahvuslik toit.", "Teacher: Juku, name a national Estonian dish."],
    ["Juku: Kama.", "Juku: Kama."],
    ["Õpetaja: Õige! Veel?", "Teacher: Right! Another?"],
    ["Juku: Kama piimaga.", "Juku: Kama with milk."],
  ],
  [
    ["Juku: Ema, ma tean, kust tulevad lapsed!", "Juku: Mom, I know where children come from!"],
    ["Ema: Kust siis?", "Mom: Where, then?"],
    ["Juku: Lasteaiast.", "Juku: From the kindergarten."],
  ],
  [
    ["Juku: Isa, kas ma võin pärast õhtusööki telekat vaadata?", "Juku: Dad, can I watch TV after dinner?"],
    ["Isa: Võid. Aga ära lülita seda sisse.", "Dad: You can. Just don't switch it on."],
  ],
  [
    ["Ema: Juku, miks sa oma pildile päikest ei joonistanud?", "Mom: Juku, why didn't you draw a sun in your picture?"],
    ["Juku: See on Eesti november.", "Juku: It's November in Estonia."],
  ],
  [
    ["Õpetaja: Juku, too näide kahest asjast, mis ei saa kunagi kokku.", "Teacher: Juku, give an example of two things that never meet."],
    ["Juku: Mina ja kodutöö.", "Juku: Me and homework."],
  ],
  [
    ["Juku: Ema, kas ma võin minna Mari juurde?", "Juku: Mom, can I go round to Mari's?"],
    ["Ema: Kas su tuba on korras?", "Mom: Is your room tidy?"],
    ["Juku: Mari tuba on korras.", "Juku: Mari's room is tidy."],
  ],
  [
    ["Õpetaja: Juku, palun ära vaata Mari tööd!", "Teacher: Juku, please don't look at Mari's work!"],
    ["Juku: Ma ei vaata. Ma kontrollin, kas tal on õige.", "Juku: I'm not looking. I'm checking she's got it right."],
  ],
  [
    ["Juku: Ema, ma olen täna väga tubli olnud.", "Juku: Mom, I've been very good today."],
    ["Ema: Mida sa tahad?", "Mom: What do you want?"],
  ],
  [
    ["Õpetaja: Juku, miks sa naerad?", "Teacher: Juku, why are you laughing?"],
    ["Juku: Ma mõtlesin ühe nalja peale.", "Juku: I thought of a joke."],
    ["Õpetaja: Räägi siis meile ka!", "Teacher: Then tell us too!"],
    ["Juku: See oli teie kohta.", "Juku: It was about you."],
  ],
];

/** One line, split into who says it and what they say. */
export interface SaidLine {
  /** The person saying it, as the joke names them, or null for the narrator. */
  readonly by: string | null;
  readonly text: string;
}

/**
 * One capitalized word and a colon at the front of a line is the speaker. One
 * word, so a narrator's `Juku kirjutab: kas.` stays the narrator's.
 */
const SPEAKER = /^(\p{Lu}\p{L}*): (.+)$/u;

export function splitLine(line: string): SaidLine {
  const match = SPEAKER.exec(line);
  if (!match) return { by: null, text: line };
  return { by: match[1]!, text: match[2]! };
}

/*
  WHO SAYS IT, IN WHICH VOICE, when the card reads the joke aloud. Juku gets
  the clearest voice on the list (`SCENE_VOICE`, measured), because his line
  is the one the joke turns on; the women and the men around him each get a
  voice of their own, so a learner hears two people talking rather than one
  person reading. The names are the speech service's own identifiers, and
  `jokes.test.ts` holds every speaker in the table to one it offers. Mari is
  not the teacher's voice, because in one joke she has the punchline in the
  teacher's own lesson.
*/
const VOICE_OF: Readonly<Record<string, string>> = {
  Juku: "tambet",
  Õpetaja: "mari",
  Ema: "mari",
  Vanaema: "mari",
  Mari: "liivika",
  Isa: "kalev",
  Vanaisa: "kalev",
  Arst: "kalev",
  Turist: "kalev",
};

/** The voice a speaker is read in, or null for the narrator, who is read in the learner's own. */
export function voiceFor(by: string | null): string | null {
  return by === null ? null : (VOICE_OF[by] ?? null);
}

/**
 * A few jokes for one visit, as indices into `JOKES`, all different: the one
 * the card opens with and the spares its "another one" walks. `random` is a
 * parameter so a test can hand in a fixed one.
 */
export function jokesForVisit(count: number, random: () => number = Math.random): number[] {
  return shuffle(JOKES.map((_, i) => i), random).slice(0, Math.min(count, JOKES.length));
}
