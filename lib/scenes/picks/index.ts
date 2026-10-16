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
  "uus-kolleeg": uusKolleeg,
};

/** What a learner may pick to say when a curveball comes up, wherever the scene writes none of its own. */
export const CURVEBALL_PICKS: Readonly<Record<string, readonly PickSpec[]>> = curveballPicks;
