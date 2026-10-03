#!/usr/bin/env python3
"""
WHICH SPELLINGS THE LANGUAGE GIVES TO MORE THAN ONE WORD, AND WHICH WORD EACH
SENTENCE MEANS, FROM VABAMORF.

Reads one JSON object on stdin, `{"words": [...], "sentences": [[token, ...], ...]}`,
and writes one back, `{"homographs": [...], "readings": [[sentence, token, [lemma, ...]], ...]}`.
Called by `scripts/build-homographs.ts`; nothing here touches the repository.

A sentence recorded under one entry is lent to another for a spelling only
that entry claims (`lib/dict/borrow.ts`), and the dictionary is six thousand
entries where the language is a hundred and fifty thousand. So `jooksul` was
lent to `jooks` as "on the run" in `aastasadade jooksul`, where it is the
postposition "during", and `veeres` to `veer` as "in the edge" where it is the
past of `veerema`. Vabamorf holds the whole lexicon and says so.

TWO QUESTIONS, BECAUSE THE FIRST ALONE COST GOOD CARDS. Whether a spelling can
belong to more than one word is asked of the lexicon, with guessing off, and
is the list a loan is checked against. Which word a sentence means is asked of
the disambiguator, over the sentence: the lexicon alone reads `arstiks` as a
form of `arst` and of the rare verb `arstima`, so refusing every spelling with
two readings took `Õpin ülikoolis arstiks` away with `aastasadade jooksul`.
In context the first is `arst` and the second is the postposition.

THE FIRST WORD OF A SENTENCE IS LOWER-CASED, because a capital there carries no
name: read as written, `Metsast saadavad hüved` came back as the surname Mets.
A capital anywhere else is kept, which is what reads `Rong väljub Tapa
jaamast` as the town rather than as "kill!".

A VERB AND ITS OWN PARTICIPLES ARE ONE WORD. Vabamorf reads `mängivad` as the
third person plural of `mängima` and as the plural of the participle `mängiv`,
and `tulnud` as `tulema` and as `tulnud` and `tulnu`. Every one of those is the
verb, and counting them apart would stop the commonest finite forms lending a
conjugation card at all. So where a verb is among the readings, a reading as a
participle is folded into it.

    pip install estnltk
"""
import json
import sys

try:
    from estnltk.vabamorf.morf import Vabamorf
except ImportError:
    sys.stderr.write("estnltk is not installed: pip install estnltk\n")
    sys.exit(2)

# What a verb's participles end in: present and past, active and passive, and
# the abessive `-mata`. A nominal reading ending in one of these beside a verb
# reading is that verb.
PARTICIPLE = ("v", "nud", "nu", "tud", "tu", "dud", "du", "tav", "dav", "mata")

BATCH = 2000


def words_of(analyses):
    verbs = {a["lemma"] for a in analyses if a["partofspeech"] == "V"}
    words = set()
    for a in analyses:
        lemma = a["lemma"]
        if verbs and a["partofspeech"] != "V" and lemma.endswith(PARTICIPLE):
            continue
        words.add(lemma.lower())
    return words


def main() -> None:
    vm = Vabamorf()
    given = json.load(sys.stdin)

    homographs = []
    words = given["words"]
    for at in range(0, len(words), BATCH):
        chunk = words[at:at + BATCH]
        read = vm.analyze(chunk, guess=False, propername=False, disambiguate=False)
        for spelling, result in zip(chunk, read):
            if len(words_of(result["analysis"])) > 1:
                homographs.append(spelling)
    ambiguous = set(homographs)

    readings = []
    for index, tokens in enumerate(given["sentences"]):
        if not tokens or not any(t.lower() in ambiguous for t in tokens):
            continue
        tokens = [tokens[0].lower(), *tokens[1:]]
        read = vm.analyze(tokens, guess=True, propername=True, disambiguate=True)
        seen = set()
        for token, result in zip(tokens, read):
            spelling = token.lower()
            if spelling not in ambiguous or spelling in seen:
                continue
            seen.add(spelling)
            readings.append([index, spelling, sorted(words_of(result["analysis"]))])

    json.dump({"homographs": homographs, "readings": readings}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
