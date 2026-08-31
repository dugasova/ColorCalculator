import { useTranslation } from "react-i18next";
import "./FormulaCalculator.css";
import { usePalette } from "../../palette";
import type { RepeatFormulaRequest } from "../../history";
import { useFormulaCalculatorState } from "./useFormulaCalculatorState";
import { BrandField } from "./fields/BrandField";
import { LineField } from "./fields/LineField";
import { StartLevelField } from "./fields/StartLevelField";
import { GrayPercentField } from "./fields/GrayPercentField";
import { ShadeField } from "./fields/ShadeField";
import { AdditionalShadeField } from "./fields/AdditionalShadeField";
import { AdditionalShadeGramsField } from "./fields/AdditionalShadeGramsField";
import { BlendModeField } from "./fields/BlendModeField";
import { BlendComponentField } from "./fields/BlendComponentField";
import { BlendRatioField } from "./fields/BlendRatioField";
import { DeveloperVolumeField } from "./fields/DeveloperVolumeField";
import { ApplicationZoneField } from "./fields/ApplicationZoneField";
import { TotalGramsField } from "./fields/TotalGramsField";
import { CrossBrandMatchField } from "./fields/CrossBrandMatchField";
import { FormulaResults } from "./FormulaResults";

export interface FormulaCalculatorProps {
  appliedBy: string;
  repeatRequest?: RepeatFormulaRequest | null;
}

export default function FormulaCalculator({ appliedBy, repeatRequest }: FormulaCalculatorProps) {
  const { t } = useTranslation();
  const brands = usePalette();
  const {
    startLevel, setStartLevel,
    grayPercent, setGrayPercent,
    targetShadeCode,
    applicationZone,
    totalGrams, setTotalGrams,
    brandId,
    line,
    manualDeveloperVolume, setManualDeveloperVolume,
    setManualPricePerGram,
    markupMultiplier, setMarkupMultiplier,
    setManualServicePrice,
    additionalShadeCode,
    additionalShadeGrams, setAdditionalShadeGrams,
    blendModeEnabled,
    setBlendShadeACode, setBlendShadeBCode,
    blendPrimaryPercent, setBlendPrimaryPercent,
    neutralizationApplied, setNeutralizationApplied,
    setManualProcessingMinutes,

    availableLines,
    lineShades,
    targetShade,
    result,
    additionalShade,
    effectiveResult,
    blendCandidates,
    blendShadeACodeEffective,
    blendShadeBCodeEffective,
    blendShadeA,
    blendShadeB,
    blend,
    processingMinutes,
    pricePerGram,
    productCost,
    recommendedServicePrice,
    servicePrice,

    handleBrandIdChange,
    handleLineChange,
    handleTargetShadeCodeChange,
    handleCrossBrandMatchSelect,
    handleAdditionalShadeCodeChange,
    handleBlendModeChange,
    handleApplicationZoneChange,
  } = useFormulaCalculatorState(brands, repeatRequest);

  return (
    <div className="calculator calculator--wide">
      <h1 className="calculator__title">{t('app.titlePrefix')} <span className="calculator__title-accent">{t('app.titleAccent')}</span></h1>
      <div className="calculator__form">
        <BrandField brandId={brandId} onBrandIdChange={handleBrandIdChange} />
        <LineField availableLines={availableLines} line={line} onLineChange={handleLineChange} />
        <StartLevelField startLevel={startLevel} onStartLevelChange={setStartLevel} />
        <GrayPercentField grayPercent={grayPercent} onGrayPercentChange={setGrayPercent} />
        <ShadeField
          lineShades={lineShades}
          targetShadeCode={targetShadeCode}
          targetShade={targetShade}
          onTargetShadeCodeChange={handleTargetShadeCodeChange}
        />
        <CrossBrandMatchField
          targetShade={targetShade}
          currentBrandId={brandId}
          brands={brands}
          onSelectMatch={handleCrossBrandMatchSelect}
        />
        <BlendModeField substituteBlend={blendModeEnabled} onSubstituteBlendChange={handleBlendModeChange} />
        {!blendModeEnabled && (
          <>
            <AdditionalShadeField
              lineShades={lineShades}
              additionalShadeCode={additionalShadeCode}
              onAdditionalShadeCodeChange={handleAdditionalShadeCodeChange}
            />
            <AdditionalShadeGramsField
              additionalShadeCode={additionalShadeCode}
              additionalShadeGrams={additionalShadeGrams}
              onAdditionalShadeGramsChange={setAdditionalShadeGrams}
            />
          </>
        )}
        {blendModeEnabled && (
          <div className="blend-group">
            <div className="blend-group__fields">
              <BlendComponentField
                id="blendShadeA"
                label={t('fields.blendShadeA')}
                placeholder={t('fields.blendShadeNone')}
                candidates={blendCandidates}
                shadeCode={blendShadeACodeEffective}
                onShadeCodeChange={setBlendShadeACode}
              />
              <BlendComponentField
                id="blendShadeB"
                label={t('fields.blendShadeB')}
                placeholder={t('fields.blendShadeNone')}
                candidates={blendCandidates}
                shadeCode={blendShadeBCodeEffective}
                onShadeCodeChange={setBlendShadeBCode}
              />
            </div>
            {blendShadeA !== null && blendShadeB !== null && result.grams !== null && (
              <BlendRatioField
                shadeA={blendShadeA}
                shadeB={blendShadeB}
                colorGrams={result.grams.colorGrams}
                primaryPercent={blendPrimaryPercent}
                onPrimaryPercentChange={setBlendPrimaryPercent}
              />
            )}
          </div>
        )}
        <DeveloperVolumeField
          targetShade={targetShade}
          manualDeveloperVolume={manualDeveloperVolume}
          onManualDeveloperVolumeChange={setManualDeveloperVolume}
        />
        <ApplicationZoneField applicationZone={applicationZone} onApplicationZoneChange={handleApplicationZoneChange} />
        <TotalGramsField totalGrams={totalGrams} onTotalGramsChange={setTotalGrams} />
      </div>
      <FormulaResults
        brandName={brands[brandId].name}
        line={line}
        targetShade={targetShade}
        startLevel={startLevel}
        grayPercent={grayPercent}
        applicationZone={applicationZone}
        result={effectiveResult}
        additionalShade={additionalShade}
        additionalShadeGrams={additionalShadeGrams}
        blend={blend}
        neutralizationApplied={neutralizationApplied}
        onNeutralizationAppliedChange={setNeutralizationApplied}
        appliedBy={appliedBy}
        processingMinutes={processingMinutes}
        onProcessingMinutesChange={setManualProcessingMinutes}
        pricePerGram={pricePerGram}
        onPricePerGramChange={setManualPricePerGram}
        markupMultiplier={markupMultiplier}
        onMarkupMultiplierChange={setMarkupMultiplier}
        productCost={productCost}
        recommendedServicePrice={recommendedServicePrice}
        servicePrice={servicePrice}
        onServicePriceChange={setManualServicePrice}
      />
    </div>
  );
}
