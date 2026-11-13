import { useTranslation } from "react-i18next";
import { formatFormulaText } from "../../format/formatFormula";
import type { ApplicationZone } from "../../engine/applicationZone";
import { formatFillerStepText } from "../../format/formatPrePigmentation";
import { formatBrandLineLabel } from "../../engine/formatLineLabel";
import type { PrePigmentationResult } from "../../engine/prePigmentation";
import type { RepeatFormulaRequest } from "../../history";
import { PrePigmentationStep } from "./PrePigmentationStep";
import { SessionDetailsPanel } from "./SessionDetailsPanel";
import { FormulaMixSection } from "./FormulaMixSection";
import { TimingPricingSection } from "./TimingPricingSection";
import { useFormulaSave } from "./useFormulaSave";
import type {
  FormulaHair,
  FormulaMix,
  FormulaPricing,
  FormulaPricingHandlers,
  FormulaProduct,
} from "./formulaResultsModel";

export interface FormulaResultsProps {
  product: FormulaProduct;
  hair: FormulaHair;
  mix: FormulaMix;
  applicationZone: ApplicationZone;
  // Recommended (or colorist-opted-in) filler step ahead of this target-color formula --
  // see PrePigmentationField/PrePigmentationStep. Null whenever the checkbox is off or
  // the level drop doesn't warrant it (getPrePigmentationNeed returns 'none').
  prePigmentationResult: PrePigmentationResult | null;
  neutralizationApplied: boolean;
  onNeutralizationAppliedChange: (applied: boolean) => void;
  appliedBy: string;
  processingMinutes: number;
  onProcessingMinutesChange: (minutes: number) => void;
  pricing: FormulaPricing;
  pricingHandlers: FormulaPricingHandlers;
  // Bubbled from SessionDetailsPanel's onSaved -- lets the caller reset the whole
  // calculator (brand/shade/level, not just this panel's client fields) once the "Saved!"
  // confirmation has finished showing.
  onSaved?: () => void;
  // Forwarded to SessionDetailsPanel so repeating a past visit re-links the save to the
  // same client instead of silently creating a duplicate profile -- see
  // buildRepeatFormulaRequest and SessionDetailsPanel's own `repeatRequest` prop.
  repeatRequest?: RepeatFormulaRequest | null;
}

// The results panel of the simple calculator: the optional filler step, the mix with its
// guidance, timing and pricing, and the save/share panel. It owns the two things that
// span all of them -- the shareable formula text and the save.
export function FormulaResults({
  product,
  hair,
  mix,
  applicationZone,
  prePigmentationResult,
  neutralizationApplied,
  onNeutralizationAppliedChange,
  appliedBy,
  processingMinutes,
  onProcessingMinutesChange,
  pricing,
  pricingHandlers,
  onSaved,
  repeatRequest,
}: FormulaResultsProps) {
  const { t } = useTranslation();
  const { targetShade } = mix;

  const targetColorFormulaText = formatFormulaText({
    brandName: product.brandName,
    line: product.line,
    startLevel: hair.startLevel,
    processingMinutes,
    applicationZone,
    neutralizationApplied,
    ...mix,
  });
  // Same brand+line display convention as the target-color title above (formatFormulaText),
  // reused for the filler worked example so both steps of a two-part formula name the
  const fullBrandLabel = formatBrandLineLabel(product.brandName, product.line);
  // Prepend the filler ("Step 1") text ahead of the target-color formula ("Step 2") once
  // the colorist has opted into the pre-pigmentation step -- see PrePigmentationField.
  // fillerStepText is null whenever prePigmentationResult is null (checkbox off, or the
  // level drop doesn't warrant it), so the plain single-step text is used unchanged.
  const fillerStepText =
    prePigmentationResult !== null
      ? formatFillerStepText(targetShade.level, prePigmentationResult, fullBrandLabel)
      : null;
  const formulaText =
    fillerStepText !== null
      ? `${fillerStepText}\n\n${t("prePigmentation.finalStepLabel")}\n${targetColorFormulaText}`
      : targetColorFormulaText;

  const { shortages, handleSave } = useFormulaSave({
    product,
    hair,
    mix,
    applicationZone,
    prePigmentationResult,
    neutralizationApplied,
    appliedBy,
    processingMinutes,
    pricing,
  });

  return (
    <div className="results">
      {prePigmentationResult !== null && (
        <>
          <PrePigmentationStep
            targetLevel={targetShade.level}
            result={prePigmentationResult}
            brandName={fullBrandLabel}
          />
          <h2 className="results__section-heading">{t("prePigmentation.finalStepLabel")}</h2>
        </>
      )}
      <FormulaMixSection
        mix={mix}
        porosity={hair.canvas.porosity}
        applicationZone={applicationZone}
        shortages={shortages}
        neutralizationApplied={neutralizationApplied}
        onNeutralizationAppliedChange={onNeutralizationAppliedChange}
      />
      <TimingPricingSection
        recommendedProcessingMinutes={mix.result.recommendedProcessingMinutes}
        processingMinutes={processingMinutes}
        onProcessingMinutesChange={onProcessingMinutesChange}
        pricing={pricing}
        pricingHandlers={pricingHandlers}
      />
      <SessionDetailsPanel
        formulaText={formulaText}
        processingMinutes={processingMinutes}
        onSave={handleSave}
        onSaved={onSaved}
        appliedBy={appliedBy}
        canvas={hair.canvas}
        repeatRequest={repeatRequest}
      />
    </div>
  );
}
