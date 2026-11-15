import React from "react";
import { AbsoluteFill, Composition } from "remotion";
import { Captions, Word } from "./common/Captions";
import { BridgeShort, BRIDGE_FRAMES } from "./videos/bridge/Bridge";
import bridgeTestWords from "../projects/_test/words.json";
import { SubakShort, SUBAK_FRAMES } from "./videos/subak_wereng/Bridge";
import subakWords from "../projects/subak_wereng/words.json";
import { KrakatauShort, KRAKATAU_FRAMES } from "./videos/krakatau_suara/Bridge";
import krakatauWords from "../projects/krakatau_suara/words.json";
import { SmongShort, SMONG_FRAMES } from "./videos/smong_simeulue/Bridge";
import smongWords from "../projects/smong_simeulue/words.json";
import { RajaEsShort, RAJAES_FRAMES } from "./videos/raja_es/Bridge";
import rajaEsWords from "../projects/raja_es/words.json";
import { PasirShort, PASIR_FRAMES } from "./videos/pasir_hisap/Bridge";
import pasirWords from "../projects/pasir_hisap/words.json";
import { VaksinShort, VAKSIN_FRAMES } from "./videos/vaksin_sapi/Bridge";
import vaksinWords from "../projects/vaksin_sapi/words.json";
import { KalengShort, KALENG_FRAMES } from "./videos/kaleng_pahat/Bridge";
import kalengWords from "../projects/kaleng_pahat/words.json";
import { BajauShort, BAJAU_FRAMES } from "./videos/bajau_limpa/Bridge";
import bajauWords from "../projects/bajau_limpa/words.json";
import { KendiShort, KENDI_FRAMES } from "./videos/kendi_keringat/Bridge";
import { HargaShort, HARGA_FRAMES } from "./videos/harga_sembilan/Bridge";
import kendiWords from "../projects/kendi_keringat/words.json";
import hargaWords from "../projects/harga_sembilan/words.json";
import { VasaShort, VASA_FRAMES } from "./videos/kapal_vasa/Bridge";
import vasaWords from "../projects/kapal_vasa/words.json";
import { WortelShort, WORTEL_FRAMES } from "./videos/wortel_radar/Bridge";
import wortelWords from "../projects/wortel_radar/words.json";
import { ZebraShort, ZEBRA_FRAMES } from "./videos/kapal_zebra/Bridge";
import zebraWords from "../projects/kapal_zebra/words.json";
import { JarakShort, JARAK_FRAMES } from "./videos/jarak_jepang/Bridge";
import jarakWords from "../projects/jarak_jepang/words.json";
import { MaskerShort, MASKER_FRAMES } from "./videos/masker_kencing/Bridge";
import maskerWords from "../projects/masker_kencing/words.json";

// Every short = its 3D picture + the shared word-by-word captions on top.
// New video: import its <Short> + FRAMES + words.json and add one <Composition> below (see /generate-vidio).
const withCaptions = (Short: React.FC, words: Word[]) => {
  const C: React.FC = () => (
    <AbsoluteFill>
      <Short />
      <Captions words={words} />
    </AbsoluteFill>
  );
  return C;
};

const V = { fps: 30, width: 1080, height: 1920 };

export const Root: React.FC = () => (
  <>
    {/* example from the skill (no captions) */}
    <Composition id="BridgeShort" component={BridgeShort} durationInFrames={BRIDGE_FRAMES} {...V} />
    {/* caption test: bridge picture + an Indonesian test voice's words */}
    <Composition id="CaptionTest" component={withCaptions(BridgeShort, bridgeTestWords as Word[])} durationInFrames={BRIDGE_FRAMES} {...V} />
    <Composition id="SubakWereng" component={withCaptions(SubakShort, subakWords as Word[])} durationInFrames={SUBAK_FRAMES} {...V} />
    <Composition id="KrakatauSuara" component={withCaptions(KrakatauShort, krakatauWords as Word[])} durationInFrames={KRAKATAU_FRAMES} {...V} />
    <Composition id="SmongSimeulue" component={withCaptions(SmongShort, smongWords as Word[])} durationInFrames={SMONG_FRAMES} {...V} />
    <Composition id="RajaEs" component={withCaptions(RajaEsShort, rajaEsWords as Word[])} durationInFrames={RAJAES_FRAMES} {...V} />
    <Composition id="PasirHisap" component={withCaptions(PasirShort, pasirWords as Word[])} durationInFrames={PASIR_FRAMES} {...V} />
    <Composition id="VaksinSapi" component={withCaptions(VaksinShort, vaksinWords as Word[])} durationInFrames={VAKSIN_FRAMES} {...V} />
    <Composition id="KalengPahat" component={withCaptions(KalengShort, kalengWords as Word[])} durationInFrames={KALENG_FRAMES} {...V} />
    <Composition id="BajauLimpa" component={withCaptions(BajauShort, bajauWords as Word[])} durationInFrames={BAJAU_FRAMES} {...V} />
    <Composition id="KendiKeringat" component={withCaptions(KendiShort, kendiWords as Word[])} durationInFrames={KENDI_FRAMES} {...V} />
    <Composition id="HargaSembilan" component={withCaptions(HargaShort, hargaWords as Word[])} durationInFrames={HARGA_FRAMES} {...V} />
    <Composition id="KapalVasa" component={withCaptions(VasaShort, vasaWords as Word[])} durationInFrames={VASA_FRAMES} {...V} />
    <Composition id="KapalZebra" component={withCaptions(ZebraShort, zebraWords as Word[])} durationInFrames={ZEBRA_FRAMES} {...V} />
    <Composition id="JarakJepang" component={withCaptions(JarakShort, jarakWords as Word[])} durationInFrames={JARAK_FRAMES} {...V} />
    <Composition id="MaskerKencing" component={withCaptions(MaskerShort, maskerWords as Word[])} durationInFrames={MASKER_FRAMES} {...V} />
    <Composition id="WortelRadar" component={withCaptions(WortelShort, wortelWords as Word[])} durationInFrames={WORTEL_FRAMES} {...V} />
  </>
);
