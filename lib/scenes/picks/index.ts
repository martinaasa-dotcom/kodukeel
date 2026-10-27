import type { PickSpec, ScenePicks } from "../picks";
import { abiPalumine } from "./abi-palumine";
import { ametiasutus } from "./ametiasutus";
import { apteek } from "./apteek";
import { arstiAeg } from "./arsti-aeg";
import { bussipeatus } from "./bussipeatus";
import { bussipilet } from "./bussipilet";
import { eksamB1 } from "./eksam-b1";
import { eksamB2 } from "./eksam-b2";
import { elamisluba } from "./elamisluba";
import { elanikeKoosolek } from "./elanike-koosolek";
import { graafik } from "./graafik";
import { hadaabi } from "./hadaabi";
import { helistamine } from "./helistamine";
import { kaebus } from "./kaebus";
import { keeletund } from "./keeletund";
import { kohvikus } from "./kohvikus";
import { kokkulepe } from "./kokkulepe";
import { kolmPalvet } from "./kolm-palvet";
import { koosolek } from "./koosolek";
import { kuulsin } from "./kuulsin";
import { lastevanemad } from "./lastevanemad";
import { nadalavahetus } from "./nadalavahetus";
import { ootamine } from "./ootamine";
import { palk } from "./palk";
import { pangas } from "./pangas";
import { perearst } from "./perearst";
import { peretoetus } from "./peretoetus";
import { poodiPiima } from "./poodi-piima";
import { raamatuklubi } from "./raamatuklubi";
import { raamatukogu } from "./raamatukogu";
import { restoranisTellimine } from "./restoranis-tellimine";
import { riidepood } from "./riidepood";
import { sobraMure } from "./sobra-mure";
import { soovitus } from "./soovitus";
import { tagatisraha } from "./tagatisraha";
import { teeKusimine } from "./tee-kusimine";
import { tehnilineTugi } from "./tehniline-tugi";
import { tootukassa } from "./tootukassa";
import { toovestlus } from "./toovestlus";
import { trepikoda } from "./trepikoda";
import { turul } from "./turul";
import { uuriRemont } from "./uuri-remont";
import { uusKolleeg } from "./uus-kolleeg";
import { a1Trepil } from "./a1-trepil";
import { a1Kursus } from "./a1-kursus";
import { a1Plaan } from "./a1-plaan";
import { a1Kohvik } from "./a1-kohvik";
import { a1Tee } from "./a1-tee";
import { a1Mutsipood } from "./a1-mutsipood";
import { a1Nadal } from "./a1-nadal";
import { a1Kutse } from "./a1-kutse";
import { a2Raamatukogu } from "./a2-raamatukogu";
import { a2Linnas } from "./a2-linnas";
import { a2Suvi } from "./a2-suvi";
import { a2Arst } from "./a2-arst";
import { a2Piletikassa } from "./a2-piletikassa";
import { a2Restoran } from "./a2-restoran";
import { a2Intervjuu } from "./a2-intervjuu";
import { a2VanaSober } from "./a2-vana-sober";
import { b1Vaidlus } from "./b1-vaidlus";
import { curveballPicks } from "./curveballs";

/** Every scene's picks, by scene id. One file per scene, so two people writing picks never touch one file. */
export const PICKS: Readonly<Record<string, ScenePicks>> = {
  "abi-palumine": abiPalumine,
  "ametiasutus": ametiasutus,
  "apteek": apteek,
  "arsti-aeg": arstiAeg,
  "bussipeatus": bussipeatus,
  "bussipilet": bussipilet,
  "eksam-b1": eksamB1,
  "eksam-b2": eksamB2,
  "elamisluba": elamisluba,
  "elanike-koosolek": elanikeKoosolek,
  "graafik": graafik,
  "hadaabi": hadaabi,
  "helistamine": helistamine,
  "kaebus": kaebus,
  "keeletund": keeletund,
  "kohvikus": kohvikus,
  "kokkulepe": kokkulepe,
  "kolm-palvet": kolmPalvet,
  "koosolek": koosolek,
  "kuulsin": kuulsin,
  "lastevanemad": lastevanemad,
  "nadalavahetus": nadalavahetus,
  "ootamine": ootamine,
  "palk": palk,
  "pangas": pangas,
  "perearst": perearst,
  "peretoetus": peretoetus,
  "poodi-piima": poodiPiima,
  "raamatuklubi": raamatuklubi,
  "raamatukogu": raamatukogu,
  "restoranis-tellimine": restoranisTellimine,
  "riidepood": riidepood,
  "sobra-mure": sobraMure,
  "soovitus": soovitus,
  "tagatisraha": tagatisraha,
  "tee-kusimine": teeKusimine,
  "tehniline-tugi": tehnilineTugi,
  "tootukassa": tootukassa,
  "toovestlus": toovestlus,
  "trepikoda": trepikoda,
  "turul": turul,
  "uuri-remont": uuriRemont,
  "a1-trepil": a1Trepil,
  "a1-kursus": a1Kursus,
  "a1-plaan": a1Plaan,
  "a1-kohvik": a1Kohvik,
  "a1-tee": a1Tee,
  "a1-mutsipood": a1Mutsipood,
  "a1-nadal": a1Nadal,
  "a1-kutse": a1Kutse,
  "a2-raamatukogu": a2Raamatukogu,
  "a2-linnas": a2Linnas,
  "a2-suvi": a2Suvi,
  "a2-arst": a2Arst,
  "a2-piletikassa": a2Piletikassa,
  "a2-restoran": a2Restoran,
  "a2-intervjuu": a2Intervjuu,
  "a2-vana-sober": a2VanaSober,
  "b1-vaidlus": b1Vaidlus,
  "uus-kolleeg": uusKolleeg,
};

/** What a learner may pick to say when a curveball comes up, wherever the scene writes none of its own. */
export const CURVEBALL_PICKS: Readonly<Record<string, readonly PickSpec[]>> = curveballPicks;
