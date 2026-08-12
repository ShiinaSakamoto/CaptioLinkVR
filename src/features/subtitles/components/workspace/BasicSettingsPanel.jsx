import { useAtom, useAtomValue } from "jotai";
import { memo, useCallback, useMemo } from "react";
import {
  advancedSettingsOpenAtom,
  renderSettingsAtom,
  visualQaHighlightKeyAtom,
  visualQaHighlightTargetAtom,
  vrAdjustPageAtom,
} from "../../../../stores/subtitleStore.js";
import { DEFAULT_RENDER_SETTINGS } from "../../constants/defaultRenderSettings.js";
import { VR_SETTINGS_RESET_KEYS } from "../../constants/settingsResetKeys.js";
import { useUpdateRenderSetting } from "../../hooks/useUpdateRenderSetting.js";
import { AxisControls } from "./axis/AxisControls.jsx";
import { AdvancedSettingsSection } from "./forms/AdvancedSettingsSection.jsx";
import { SettingsResetSection } from "./forms/SettingsResetSection.jsx";
import { ToggleSetting } from "./forms/SettingControls.jsx";
import { ValueSteppedControl } from "./forms/ValueSteppedControl.jsx";
import { ui } from "../../../../shared/uiText.js";
import styles from "../SubtitleWorkspace.module.scss";

// position/rotationモードごとに、renderSettingsのキー名がAxisControls上のどの軸(x/y/z)に
// 対応するかを表す。Visual QAのハイライト対象を解決するために使う。
const AXIS_HIGHLIGHT_KEY_MAP = {
  position: { positionX: "x", positionY: "y", positionZ: "z" },
  rotation: { rotationY: "x", rotationX: "y", rotationZ: "z" },
};

export const BasicSettingsPanel = memo(() => {
  const settings = useAtomValue(renderSettingsAtom);
  const updateSetting = useUpdateRenderSetting();
  const [adjustPage, setAdjustPage] = useAtom(vrAdjustPageAtom);
  const [advancedOpen, setAdvancedOpen] = useAtom(advancedSettingsOpenAtom);
  const highlightKey = useAtomValue(visualQaHighlightKeyAtom);
  const highlightTarget = useAtomValue(visualQaHighlightTargetAtom);
  const isPosition = adjustPage === "position";

  const highlightedAxis = useMemo(
    () => (highlightKey ? AXIS_HIGHLIGHT_KEY_MAP[adjustPage]?.[highlightKey] ?? null : null),
    [adjustPage, highlightKey],
  );

  const axisLabels = useMemo(
    () => (isPosition
      ? { y: ui.yAxis, x: ui.xAxis, z: ui.zAxis }
      : { y: ui.rotateX, x: ui.rotateY, z: ui.rotateZ }),
    [isPosition],
  );

  const axisValues = useMemo(
    () => (isPosition
      ? { x: settings.positionX, y: settings.positionY, z: -settings.positionZ }
      : { x: settings.rotationY, y: -settings.rotationX, z: -settings.rotationZ }),
    [isPosition, settings.positionX, settings.positionY, settings.positionZ, settings.rotationX, settings.rotationY, settings.rotationZ],
  );

  const axisRanges = useMemo(
    () => (isPosition
      ? { x: [-2, 2, 0.05], y: [-1, 3, 0.05], z: [0, 4, 0.05] }
      : { x: [-90, 90, 1], y: [-45, 45, 1], z: [-45, 45, 1] }),
    [isPosition],
  );

  const axisDefaults = useMemo(
    () => (isPosition
      ? {
          x: DEFAULT_RENDER_SETTINGS.positionX,
          y: DEFAULT_RENDER_SETTINGS.positionY,
          z: -DEFAULT_RENDER_SETTINGS.positionZ,
        }
      : {
          x: DEFAULT_RENDER_SETTINGS.rotationY,
          y: -DEFAULT_RENDER_SETTINGS.rotationX,
          z: -DEFAULT_RENDER_SETTINGS.rotationZ,
        }),
    [isPosition],
  );

  const handleAxisChange = useCallback(
    (key, value) => {
      if (isPosition) {
        updateSetting(key === "z" ? "positionZ" : `position${key.toUpperCase()}`, key === "z" ? -value : value);
        return;
      }
      updateSetting(
        key === "x" ? "rotationY" : key === "y" ? "rotationX" : "rotationZ",
        key === "x" ? value : -value,
      );
    },
    [isPosition, updateSetting],
  );

  return (
    <div className={styles.settingsPanel}>
      <section className={styles.controlSurface}>
        <div className={styles.controlPrimary}>
          <ValueSteppedControl
            settingKey="fontSizePercent"
            label={ui.textSize(settings.fontSizePercent)}
            value={settings.fontSizePercent}
            min="50"
            max="200"
            step="5"
            onChange={(value) => updateSetting("fontSizePercent", value)}
            onReset={() => updateSetting("fontSizePercent", DEFAULT_RENDER_SETTINGS.fontSizePercent)}
            tooltipKey="vr-font-size"
          />
          <ValueSteppedControl
            settingKey="wrapWidthPercent"
            label={ui.wrapWidth(settings.wrapWidthPercent)}
            description={ui.wrapWidthDescription}
            value={settings.wrapWidthPercent}
            min="30"
            max="100"
            step="5"
            onChange={(value) => updateSetting("wrapWidthPercent", value)}
            onReset={() => updateSetting("wrapWidthPercent", DEFAULT_RENDER_SETTINGS.wrapWidthPercent)}
            tooltipKey="vr-wrap-width"
          />
          <div className={styles.controlAxisBlock}>
            <div className={styles.innerTabs} role="tablist" aria-label="位置と回転">
              <button
                type="button"
                role="tab"
                aria-selected={adjustPage === "position"}
                className={adjustPage === "position" ? styles.isSelected : ""}
                onClick={() => setAdjustPage("position")}
              >
                {ui.position}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={adjustPage === "rotation"}
                className={adjustPage === "rotation" ? styles.isSelected : ""}
                onClick={() => setAdjustPage("rotation")}
              >
                {ui.rotation}
              </button>
            </div>

            <div className={styles.controlAxisBody}>
              <AxisControls
                mode={isPosition ? "position" : "rotation"}
                labels={axisLabels}
                values={axisValues}
                ranges={axisRanges}
                defaults={axisDefaults}
                onChange={handleAxisChange}
                tooltipContextKey={adjustPage}
                highlightedAxis={highlightedAxis}
                highlightedTarget={highlightTarget}
              />
            </div>
          </div>
        </div>

        <AdvancedSettingsSection open={advancedOpen} onToggle={() => setAdvancedOpen((current) => !current)}>
          <ValueSteppedControl
            settingKey="renderScale"
            label={ui.subtitleQuality(settings.renderScale)}
            description={ui.subtitleQualityDescription}
            value={settings.renderScale}
            min="0.5"
            max="1.5"
            step="0.05"
            onChange={(value) => updateSetting("renderScale", value)}
            onReset={() => updateSetting("renderScale", DEFAULT_RENDER_SETTINGS.renderScale)}
            tooltipKey="vr-render-scale"
          />
          <ValueSteppedControl
            settingKey="overlayMaxFps"
            label={ui.overlayMaxFps(settings.overlayMaxFps)}
            value={settings.overlayMaxFps}
            min="10"
            max="60"
            step="5"
            onChange={(value) => updateSetting("overlayMaxFps", value)}
            onReset={() => updateSetting("overlayMaxFps", DEFAULT_RENDER_SETTINGS.overlayMaxFps)}
            tooltipKey="vr-overlay-fps"
          />
          <ToggleSetting
            settingKey="vrchatChatboxEnabled"
            label={ui.vrchatChatbox}
            checked={settings.vrchatChatboxEnabled}
            onChange={(value) => updateSetting("vrchatChatboxEnabled", value)}
          />
        </AdvancedSettingsSection>
      </section>

      <SettingsResetSection label={ui.resetVrSettings} keys={VR_SETTINGS_RESET_KEYS} />
    </div>
  );
});

BasicSettingsPanel.displayName = "BasicSettingsPanel";
