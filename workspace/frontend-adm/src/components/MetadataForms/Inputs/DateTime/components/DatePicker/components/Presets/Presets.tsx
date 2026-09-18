import { List } from "ui-kit"
import { PresetsProps } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Presets/types";
import { DEFAULT_TEST_ID , DEFAULT_PRESETS } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Presets/constants";
import { PresetItems } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/types";
import { checkEqualDate } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/components/Presets/utils";
import { isValidDate } from "components/MetadataForms/Inputs/DateTime/components/DatePicker/utils";
import styles from './styles/styles.module.css'
import { useEffect, useState, useMemo } from "react";


export const Presets = ({
    customPresets = [],
    includeDefaultPresets,
    value,
    onSelectDateRange,
    onSelectDate,
    minDate,
    maxDate,
    testId = DEFAULT_TEST_ID,
  }: PresetsProps) => {
    const [selectedPreset, setSelectedPreset] = useState<PresetItems | null>(null);
  
    const mergedPresets = useMemo(() => [
      ...(includeDefaultPresets ? DEFAULT_PRESETS : []),
      ...customPresets,
    ], [includeDefaultPresets, customPresets]);
  
    const listOptions = useMemo(() => 
      mergedPresets.map((preset) => ({
        label: preset.label,
        value: preset.value,
        testId: preset.testId,
      })),
    [mergedPresets]);
  
    const handleSelectPreset = (selectedValues: PresetItems[]) => {
        if (selectedValues.length > 0) {
          const selectedValue = selectedValues[0];
          const selectedPreset = mergedPresets.find((option) => option.value === selectedValue);
      
          if (selectedPreset) {
            const range = selectedPreset.getRange(minDate, maxDate);
            setSelectedPreset(selectedValue);
            onSelectDateRange?.(range);

            if (range[0] !== null && range[1] !== null) {
              onSelectDate?.([range[0], range[1]]);
            }
          }
        } else {
          setSelectedPreset(null);
        }
      };
  
    useEffect(() => {
      if (value) {
        const [startDate, endDate] = value;
  
        if (!isValidDate(startDate) || !isValidDate(endDate)) {
          setSelectedPreset(null);
          return;
        }
  
        const matchingPreset = mergedPresets.find((item) => {
          const range = item.getRange(minDate, maxDate);
          const [presetStart, presetEnd] = range;
          return (
            checkEqualDate(startDate, presetStart) &&
            checkEqualDate(endDate, presetEnd)
          );
        });
  
        setSelectedPreset(matchingPreset?.value ?? null);
      }
    }, [value, minDate, maxDate, mergedPresets]);
  
    return (
      <div className={styles["preset-container"]} data-test-id={testId}>
        <List
          options={listOptions}
          type="single"
          value={selectedPreset ? [selectedPreset] : []}
          onChange={handleSelectPreset}
          testId={`${testId}-list`}
        />
      </div>
    );
  };
 