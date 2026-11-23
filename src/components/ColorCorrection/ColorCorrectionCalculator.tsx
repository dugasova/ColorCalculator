import { useState, type CSSProperties } from "react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { BrandId } from "../../engine/brands";
import type { Level } from "../../engine/levels";
import type { ToneFamily } from "../../engine/shades";
import {
  calculateColorCorrection,
  calculateCorrectionTones,
  findNeutralizingShades,
  getDominantWheelTone,
  getExpectedUnwantedTone,
  getLineCorrectorCap,
  getLineCorrectorRule,
  isLineSelfNeutralizingAt,
  getLineMixingRatio,
  UNWANTED_TONES,
  type UnwantedTone,
} from "../../engine/correction";
import { getCorrectorProduct, type CorrectorSelection } from "../../engine/correctorProducts";
import { buildMixCorrector, formatChosenCorrectorName, type CorrectorBrand } from "../../format/formulaMessages";
import { formatCorrectionMix } from "../../format/formatCorrection";
import { usePalette } from "../../palette";
import { LevelField } from "../common/LevelField";
import { BrandField } from "../FormulaCalculator/fields/BrandField";
import { CorrectorChoiceField } from "../FormulaCalculator/fields/CorrectorChoiceField";
import { LineField } from "../FormulaCalculator/fields/LineField";
import "./ColorCorrectionCalculator.css";
import { NeutralizationWheel } from "./NeutralizationWheel";
import { TONES, TONE_COLORS } from "./toneColors";

function getTipKey(tone: UnwantedTone, technique: "deposit" | "lift-tone" | "multi-step"): string {
  const wheelTone = getDominantWheelTone(tone);
  if (technique === "multi-step") {
    if (wheelTone === "red") return "correction.tips.redMultiStep";
    if (wheelTone === "green") return "correction.tips.greenMultiStep";
    return "";
  }
  if (wheelTone === "orange") return "correction.tips.orange";
  if (wheelTone === "yellow") return "correction.tips.yellow";
  return "correction.tips.generic";
}

const TECHNIQUE_KEYS = {
  deposit: "correction.techniques.deposit",
  "lift-tone": "correction.techniques.liftTone",
  "multi-step": "correction.techniques.multiStep",
} as const;

// Wella's own advice beyond the corrector itself (colorist, 2026-11-17). Color Touch has
// neither /4 shades for a light green cast nor 0/33 + 0/44; its violet is corrected with a
// /3 shade, thinned with 0/00 on light blonde.
function getWellaTip(
  brand: CorrectorBrand,
  unwanted: UnwantedTone,
  level: Level,
): { key: string; shade?: string } | null {
  if (brand.brandId !== "wella") return null;
  if (brand.line === "color-touch") {
    if (unwanted === "blue") return { key: "correction.tips.wellaColorTouchBlueShade" };
    return unwanted === "violet" && level >= 9 ? { key: "correction.tips.wellaColorTouchVioletClear" } : null;
  }
  if (unwanted === "violet") return { key: "correction.tips.wellaVioletShade" };
  if (unwanted === "green") {
    const shade = getCorrectorProduct(brand.brandId, brand.line, "red", level)?.shade;
    return shade !== undefined ? { key: "correction.tips.wellaGreenShade", shade: `${level}${shade}` } : null;
  }
  if (unwanted === "blue") return { key: "correction.tips.wellaBlueWithoutMixtone" };
  return null;
}

// L'Oréal's advice for over-corrected hair (colorist, 2026-11-17). Dia Color has no
// boosters at all, so it always corrects with 5–15 g of a ready shade; Majirel does so for
// a light green on levels 8–10, where a red booster risks bright pink.
const OVER_CORRECTED: ReadonlySet<UnwantedTone> = new Set(["green", "blue", "violet"]);

function getLorealTip(
  brand: CorrectorBrand,
  unwanted: UnwantedTone,
  level: Level,
  correctorTone: ToneFamily | undefined,
): { key: string; shade?: string } | null {
  if (brand.brandId !== "loreal" || !OVER_CORRECTED.has(unwanted) || correctorTone === undefined) return null;
  const shade = getCorrectorProduct(brand.brandId, brand.line, correctorTone, level)?.shade;
  if (shade === undefined) return null;
  const named = `${level}${shade}`;
  if (brand.line === "dia-color") return { key: "correction.tips.lorealDiaColorShade", shade: named };
  if (brand.line === "majirel" && unwanted === "green" && level >= 8) {
    return { key: "correction.tips.lorealMajirelLightGreen", shade: named };
  }
  return null;
}

// SoBoost is no longer sold in Ukraine (colorist, 2026-11-23); SoRed is the only booster
// left. What SoColor corrects with instead, tone by tone.
function getMatrixTip(
  brand: CorrectorBrand,
  unwanted: UnwantedTone,
  tones: readonly ToneFamily[],
): { key: string; shade?: string } | null {
  if (brand.brandId !== "matrix" || brand.line !== "socolor") return null;
  if (unwanted === "blue") return { key: "correction.tips.matrixCopperShade" };
  if (unwanted === "violet") return { key: "correction.tips.matrixGoldShade" };
  if (tones.includes("matt")) return { key: "correction.tips.matrixJadeShade" };
  if (tones.includes("violet")) return { key: "correction.tips.matrixVioletShade" };
  if (tones.includes("ash")) return { key: "correction.tips.matrixAshShade" };
  return null;
}

// When to take Igora's alternative mixtone (colorist, 2026-11-18).
function getIgoraTip(
  brand: CorrectorBrand,
  unwanted: UnwantedTone,
  level: Level,
  tones: readonly ToneFamily[],
): { key: string; shade?: string } | null {
  if (brand.brandId !== "igora") return null;
  if (unwanted === "green") return { key: "correction.tips.igoraGreen" };
  if (tones.includes("violet") && level >= 9) return { key: "correction.tips.igoraPearl" };
  return null;
}

export function ColorCorrectionCalculator() {
  const { t } = useTranslation();
  const brands = usePalette();
  const [currentLevel, setCurrentLevel] = useState<Level>(6);
  const [targetLevel, setTargetLevel] = useState<Level>(8);
  const [unwantedTone, setUnwantedToneState] = useState<UnwantedTone>("orange");
  const [baseGrams, setBaseGrams] = useState(30);
  const [brandIdState, setBrandId] = useState<BrandId>("generic");
  const [lineState, setLine] = useState<string | null>(null);
  const [selection, setSelection] = useState<CorrectorSelection>({});
  // Grams the colorist typed in for a tone, over the Rule of 10.
  const [amounts, setAmounts] = useState<Partial<Record<ToneFamily, number>>>({});

  // The palette can lose a custom brand (or a line) while this screen is open.
  const brandId = brandIdState in brands ? brandIdState : "generic";
  const brand = brands[brandId];
  const availableLines = Array.from(new Set(brand.shades.map(shade => shade.line ?? null)));
  const line = availableLines.includes(lineState) ? lineState : (availableLines[0] ?? null);

  // A different tone, brand, line or level offers different correctors: start the choice
  // and the typed-in amounts over.
  const resetCorrector = () => {
    setSelection({});
    setAmounts({});
  };
  const setUnwantedTone = (tone: UnwantedTone) => {
    setUnwantedToneState(tone);
    resetCorrector();
  };
  const handleBrandChange = (id: BrandId) => {
    setBrandId(id);
    setLine(brands[id]?.shades[0]?.line ?? null);
    resetCorrector();
  };
  const handleLineChange = (value: string | null) => {
    setLine(value);
    resetCorrector();
  };
  const handleTargetLevelChange = (level: Level) => {
    setTargetLevel(level);
    resetCorrector();
  };

  const result = calculateColorCorrection(currentLevel, targetLevel, unwantedTone);
  const correctorBrand: CorrectorBrand = { brandId, line, level: targetLevel };
  const correctorRule = getLineCorrectorRule(brand, line);
  // Igora Royal's 12- series neutralizes on its own: no mixtone goes into it.
  const selfNeutralizing = isLineSelfNeutralizingAt(brand, line, targetLevel);
  const recommendedTones = selfNeutralizing
    ? []
    : calculateCorrectionTones(
        unwantedTone,
        targetLevel,
        baseGrams,
        getLineCorrectorCap(brand, line),
        correctorRule,
        line,
      );
  const ruleKey = correctorRule === "rule-of-11" ? "correction.ruleOfEleven" : "correction.ruleOfTen";
  // The Rule of 10 row keeps the recommendation; the mix takes what the colorist typed.
  const recommendedGrams = Math.round(recommendedTones.reduce((sum, part) => sum + part.grams, 0) * 10) / 10;
  const correctiveTones = recommendedTones.map(part => ({ ...part, grams: amounts[part.tone] ?? part.grams }));
  const correctorGrams = Math.round(correctiveTones.reduce((sum, part) => sum + part.grams, 0) * 10) / 10;
  const mixingRatio = getLineMixingRatio(brand, line, currentLevel, targetLevel);
  const correctorResult = {
    recommendedCorrectiveTone: correctiveTones[0]?.tone ?? null,
    correctorGrams,
    correctiveTones,
    mixingRatio,
  };
  const mixCorrector = buildMixCorrector(correctorResult, correctorBrand, selection);
  const mixText = formatCorrectionMix(baseGrams, mixingRatio, mixCorrector);
  const correctorName =
    mixCorrector !== null ? mixCorrector.parts.map(part => part.name).join(" + ") : t("correction.correctorNone");
  const wheelCorrectorName = correctiveTones
    .map(part => formatChosenCorrectorName(part.tone, correctorBrand, selection[part.tone]))
    .join(" + ");
  const neutralizingShades = findNeutralizingShades(brand, line, unwantedTone, targetLevel);
  const expectedTone = getExpectedUnwantedTone(targetLevel, line);
  const unwantedToneName = t(`correction.tones.${unwantedTone}`);
  const tipKey = getTipKey(unwantedTone, result.technique);
  const brandTip = selfNeutralizing
    ? {
        key: brandId === "redken" ? "correction.tips.redkenNoMixtones" : "correction.tips.igoraSelfNeutralizing",
        shade: undefined,
      }
    : (getWellaTip(correctorBrand, unwantedTone, targetLevel) ??
      getLorealTip(correctorBrand, unwantedTone, targetLevel, correctiveTones[0]?.tone) ??
      getMatrixTip(
        correctorBrand,
        unwantedTone,
        correctiveTones.map(part => part.tone),
      ) ??
      getIgoraTip(
        correctorBrand,
        unwantedTone,
        targetLevel,
        correctiveTones.map(part => part.tone),
      ));

  return (
    <div className="calculator calculator--wide">
      <h1 className="calculator__title">
        {t("correction.titlePrefix")} <span className="calculator__title-accent">{t("correction.titleAccent")}</span>
      </h1>
      <p className="correction__subtitle">{t("correction.subtitle")}</p>

      <div className="calculator__form">
        <BrandField brandId={brandId} onBrandIdChange={handleBrandChange} idSuffix="Correction" />
        <LineField availableLines={availableLines} line={line} onLineChange={handleLineChange} idSuffix="Correction" />
        <LevelField
          id="currentLevel"
          label={t("correction.currentLevel")}
          value={currentLevel}
          onChange={setCurrentLevel}
        />
        <LevelField
          id="targetLevel"
          label={t("correction.targetLevel")}
          value={targetLevel}
          onChange={handleTargetLevelChange}
        />

        <div className="field correction__tone-field">
          <label id="unwantedToneLabel">{t("correction.unwantedTone")}</label>
          <div className="tone-grid" role="radiogroup" aria-labelledby="unwantedToneLabel">
            {UNWANTED_TONES.map(tone => (
              <button
                key={tone}
                type="button"
                role="radio"
                aria-checked={unwantedTone === tone}
                className={clsx("tone-btn", unwantedTone === tone && "tone-btn--active")}
                style={{ "--tone-color": TONE_COLORS[tone] } as CSSProperties}
                onClick={() => setUnwantedTone(tone)}
              >
                <span className="tone-dot" />
                <span>{t(`correction.tones.${tone}`)}</span>
              </button>
            ))}
          </div>
          <p className="correction__expected">
            {t("correction.expectedTone", {
              level: targetLevel,
              tone: t(`correction.tones.${expectedTone}`).toLowerCase(),
            })}
            {expectedTone !== unwantedTone && (
              <button type="button" className="link-button" onClick={() => setUnwantedTone(expectedTone)}>
                {t("correction.expectedToneUse")}
              </button>
            )}
          </p>
        </div>

        <NeutralizationWheel
          tones={TONES}
          toneColors={TONE_COLORS}
          selectedTone={unwantedTone}
          onSelectTone={setUnwantedTone}
        />

        <div className="field">
          <label htmlFor="baseGrams">{t("correction.baseGrams")}</label>
          <input
            type="number"
            id="baseGrams"
            min={1}
            value={baseGrams}
            onChange={e => setBaseGrams(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="results">
        <div className="results__stats">
          <div className="stat">
            <span className="stat__label">{t("correction.stats.developer")}</span>
            <span className="stat__value">
              {t("correction.developerValue", { volume: result.developer.volume, percent: result.developer.percent })}
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">{t("correction.stats.technique")}</span>
            <span className="stat__value correction__stat-value--small">{t(TECHNIQUE_KEYS[result.technique])}</span>
          </div>
          <div className="stat">
            <span className="stat__label">{t("correction.stats.corrector")}</span>
            <span className="stat__value correction__stat-value--small">{correctorName}</span>
          </div>
        </div>

        <div className="results__row">
          <span className="results__row-label">{t(`${ruleKey}.label`)}</span>
          <span>{t("correction.ruleOfTen.value", { correctorGrams: recommendedGrams, baseGrams })}</span>
        </div>
        <CorrectorChoiceField
          result={correctorResult}
          brand={correctorBrand}
          selection={selection}
          onSelectionChange={setSelection}
          onAmountChange={(tone, grams) => setAmounts({ ...amounts, [tone]: grams })}
        />
        <div className="results__row">
          <span className="results__row-label">{t("correction.mixLabel")}</span>
          <span className="correction__mix">{mixText}</span>
        </div>
        {neutralizingShades.length > 0 && (
          <div className="results__row">
            <span className="results__row-label">{t("correction.neutralizingShadesLabel")}</span>
            <span>{neutralizingShades.map(shade => shade.code).join(", ")}</span>
          </div>
        )}
        <p className="correction__explanation">{t(`${ruleKey}.explanation`, { level: targetLevel })}</p>

        {wheelCorrectorName !== "" && (
          <p className="correction__explanation">
            {t("correction.explanation", { corrector: wheelCorrectorName, tone: unwantedToneName })}
          </p>
        )}

        {brandTip !== null && <p className="correction__note">{t(brandTip.key, { shade: brandTip.shade })}</p>}
        {result.technique === "multi-step" && <p className="correction__note">{t("correction.tips.multiStep")}</p>}
        {tipKey !== "" && <p className="correction__note">{t(tipKey)}</p>}

        <p className="correction__note correction__note--strand">{t("correction.strandTest")}</p>
        <p className="correction__disclaimer">{t("correction.disclaimer")}</p>
      </div>
    </div>
  );
}
