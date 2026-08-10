import { useAtomValue } from "jotai";
import { memo } from "react";
import { renderSettingsAtom } from "../../../../stores/subtitleStore.js";
import { TEXT_COLOR_PRESETS } from "../../constants/styleColorPresets.js";
import { DEFAULT_RENDER_SETTINGS } from "../../constants/defaultRenderSettings.js";
import { STYLE_SETTINGS_RESET_KEYS } from "../../constants/settingsResetKeys.js";
import { useUpdateRenderSetting } from "../../hooks/useUpdateRenderSetting.js";
import { OPACITY_PERCENT_MAX, OPACITY_PERCENT_MIN } from "../../utils/subtitleOpacity.js";
import { ColorSetting } from "./forms/ColorSetting.jsx";
import { SettingSection } from "./forms/SettingControls.jsx";
import { SettingsResetSection } from "./forms/SettingsResetSection.jsx";
import { ValueSteppedControl } from "./forms/ValueSteppedControl.jsx";
import { STYLE_FEATURES } from "./styleFeatures.js";
import { ui } from "../../../../shared/uiText.js";
import styles from "../SubtitleWorkspace.module.scss";

const StyleFeatureFields = memo(({ fields, settings, updateSetting }) =>
  fields.map((field) => {
    if (field.type === "color") {
      return (
        <ColorSetting
          key={field.key}
          settingKey={field.key}
          label={field.label(settings[field.key])}
          value={settings[field.key]}
          onChange={(value) => updateSetting(field.key, value)}
          presets={field.presets}
          presetKindLabel={field.presetKindLabel}
        />
      );
    }

    return (
      <ValueSteppedControl
        key={field.key}
        settingKey={field.key}
        label={field.label(settings[field.key])}
        description={field.description}
        value={settings[field.key]}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(value) => updateSetting(field.key, value)}
        onReset={() => updateSetting(field.key, field.reset)}
        tooltipKey={field.tooltipKey}
      />
    );
  }),
);

StyleFeatureFields.displayName = "StyleFeatureFields";

export const StyleSettingsPanel = memo(() => {
  const settings = useAtomValue(renderSettingsAtom);
  const updateSetting = useUpdateRenderSetting();

  return (
    <div className={styles.settingsPanel}>
      <div className={styles.styleSections}>
        <div className={styles.styleStandaloneField}>
          <ColorSetting
            settingKey="textColor"
            label={ui.textColorLabel(settings.textColor)}
            value={settings.textColor}
            onChange={(value) => updateSetting("textColor", value)}
            presets={TEXT_COLOR_PRESETS}
            presetKindLabel={ui.textColorKind}
          />
          <ValueSteppedControl
            settingKey="textOpacityPercent"
            label={ui.textOpacityLabel(settings.textOpacityPercent)}
            description={ui.textOpacityDescription}
            value={settings.textOpacityPercent}
            min={String(OPACITY_PERCENT_MIN)}
            max={String(OPACITY_PERCENT_MAX)}
            step="1"
            onChange={(value) => updateSetting("textOpacityPercent", value)}
            onReset={() => updateSetting("textOpacityPercent", DEFAULT_RENDER_SETTINGS.textOpacityPercent)}
            tooltipKey="style-text-opacity"
          />
        </div>

        <div className={styles.styleFeatureList}>
          {STYLE_FEATURES.map((feature) => (
            <SettingSection
              key={feature.id}
              settingKey={feature.enabledKey}
              title={feature.title}
              enabled={settings[feature.enabledKey]}
              onEnabledChange={(value) => updateSetting(feature.enabledKey, value)}
            >
              <StyleFeatureFields
                fields={feature.fields}
                settings={settings}
                updateSetting={updateSetting}
              />
            </SettingSection>
          ))}
        </div>
      </div>

      <SettingsResetSection label={ui.resetStyleSettings} keys={STYLE_SETTINGS_RESET_KEYS} />
    </div>
  );
});

StyleSettingsPanel.displayName = "StyleSettingsPanel";
