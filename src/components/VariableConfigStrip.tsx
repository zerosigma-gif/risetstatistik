import React from 'react';
import { getT } from '../i18n/translations';
import type { AnalysisConfig, ColumnDef, Language } from '../types/stats';

interface VariableConfigStripProps {
  columns: ColumnDef[];
  config: AnalysisConfig;
  language: Language;
  onChange: (next: Partial<AnalysisConfig>) => void;
}

export const VariableConfigStrip: React.FC<VariableConfigStripProps> = ({
  columns,
  config,
  language,
  onChange,
}) => {
  const t = getT(language);
  const numericCols = columns.filter((c) => c.scale !== 'nominal');
  const categoricalCols = columns.filter((c) => c.scale === 'nominal' || c.scale === 'ordinal');
  const allCols = columns;

  const toggleMultiVar = (listKey: 'dependentVars' | 'independentVars', colKey: string) => {
    const validNumericKeys = numericCols.map((c) => c.key);
    const current = config[listKey].filter((k) => validNumericKeys.includes(k));
    const exists = current.includes(colKey);
    const nextSet = new Set(
      exists ? current.filter((k) => k !== colKey) : [...current, colKey]
    );
    const orderedNext = validNumericKeys.filter((k) => nextSet.has(k));
    onChange({ [listKey]: orderedNext });
  };

  return (
    <div className="px-4 py-2.5 border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17] text-xs space-y-2">
      {/* Descriptives or Correlation: multi-select numeric variables */}
      {(config.activeTest === 'descriptives' || config.activeTest === 'correlation') && (
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-[#475569] dark:text-[#94A3B8] mr-1">
              {config.activeTest === 'correlation' ? t.vars.dependentsTwo : t.vars.dependents}:
            </span>
            {numericCols.map((col) => {
              const active = config.dependentVars.includes(col.key);
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => toggleMultiVar('dependentVars', col.key)}
                  className={`h-7 px-2.5 rounded border text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'border-[#1E40AF] bg-[#1E40AF] text-white font-medium dark:border-[#3B82F6] dark:bg-[#3B82F6]'
                      : 'border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#94A3B8]'
                  }`}
                >
                  {col.label}
                </button>
              );
            })}
            {numericCols.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const allSelected = numericCols.every((c) =>
                    config.dependentVars.includes(c.key)
                  );
                  onChange({
                    dependentVars: allSelected ? [] : numericCols.map((c) => c.key),
                  });
                }}
                className="px-2 py-1 text-[11px] font-medium text-[#1E40AF] dark:text-[#60A5FA] hover:underline cursor-pointer whitespace-nowrap"
              >
                {numericCols.every((c) => config.dependentVars.includes(c.key))
                  ? t.vars.clearAll
                  : t.vars.selectAll}
              </button>
            )}
          </div>

          {config.activeTest === 'correlation' && (
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-[#475569] dark:text-[#94A3B8]">
                {t.vars.corMethod}:
              </span>
              <div className="inline-flex rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] p-0.5">
                {(['pearson', 'spearman'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange({ corMethod: m })}
                    className={`px-2.5 py-0.5 rounded text-xs capitalize cursor-pointer ${
                      config.corMethod === m
                        ? 'bg-[#0F172A] text-white dark:bg-[#3B82F6]'
                        : 'text-[#475569] dark:text-[#94A3B8]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Independent T-Test or One-Way ANOVA */}
      {(config.activeTest === 'ttest_ind' || config.activeTest === 'anova') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <label className="font-medium text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
              {t.vars.dependent}:
            </label>
            <select
              value={config.dependentVars[0] ?? ''}
              onChange={(e) => onChange({ dependentVars: [e.target.value] })}
              className="flex-1 h-8 px-2.5 py-0 leading-normal rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC]"
            >
              {numericCols.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
              {t.vars.grouping}:
            </label>
            <select
              value={config.groupingVar}
              onChange={(e) => onChange({ groupingVar: e.target.value })}
              className="flex-1 h-8 px-2.5 py-0 leading-normal rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC]"
            >
              {(categoricalCols.length > 0 ? categoricalCols : allCols).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Paired T-Test */}
      {config.activeTest === 'ttest_paired' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <label className="font-medium text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
              {t.vars.varA}:
            </label>
            <select
              value={config.pairedVarA}
              onChange={(e) => onChange({ pairedVarA: e.target.value })}
              className="flex-1 h-8 px-2.5 py-0 leading-normal rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC]"
            >
              {numericCols.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
              {t.vars.varB}:
            </label>
            <select
              value={config.pairedVarB}
              onChange={(e) => onChange({ pairedVarB: e.target.value })}
              className="flex-1 h-8 px-2.5 py-0 leading-normal rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC]"
            >
              {numericCols.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Linear Regression */}
      {config.activeTest === 'regression' && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 min-w-[240px]">
              <label className="font-medium text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
                {t.vars.dependent}:
              </label>
              <select
                value={config.dependentVars[0] ?? ''}
                onChange={(e) => {
                  const nextDep = e.target.value;
                  onChange({
                    dependentVars: [nextDep],
                    independentVars: config.independentVars.filter(
                      (k) => k !== nextDep && numericCols.some((c) => c.key === k)
                    ),
                  });
                }}
                className="flex-1 h-8 px-2.5 py-0 leading-normal rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC]"
              >
                {numericCols.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-[#475569] dark:text-[#94A3B8] mr-1">
                {t.vars.predictors}:
              </span>
              {numericCols
                .filter((c) => c.key !== config.dependentVars[0])
                .map((col) => {
                  const active = config.independentVars.includes(col.key);
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => toggleMultiVar('independentVars', col.key)}
                      className={`h-7 px-2.5 rounded border text-xs transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'border-[#1E40AF] bg-[#1E40AF] text-white font-medium dark:border-[#3B82F6] dark:bg-[#3B82F6]'
                          : 'border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#94A3B8]'
                      }`}
                    >
                      {col.label}
                    </button>
                  );
                })}
              {(() => {
                const candidatePredictors = numericCols.filter(
                  (c) => c.key !== config.dependentVars[0]
                );
                if (candidatePredictors.length <= 1) return null;
                const allSelected = candidatePredictors.every((c) =>
                  config.independentVars.includes(c.key)
                );
                return (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        independentVars: allSelected
                          ? []
                          : candidatePredictors.map((c) => c.key),
                      })
                    }
                    className="px-2 py-1 text-[11px] font-medium text-[#1E40AF] dark:text-[#60A5FA] hover:underline cursor-pointer whitespace-nowrap"
                  >
                    {allSelected ? t.vars.clearAll : t.vars.selectAll}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Chi-Square */}
      {config.activeTest === 'chisquare' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <label className="font-medium text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
              {t.vars.catRow}:
            </label>
            <select
              value={config.categoricalVarA}
              onChange={(e) => onChange({ categoricalVarA: e.target.value })}
              className="flex-1 h-8 px-2.5 py-0 leading-normal rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC]"
            >
              {(categoricalCols.length >= 2 ? categoricalCols : allCols).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
              {t.vars.catCol}:
            </label>
            <select
              value={config.categoricalVarB}
              onChange={(e) => onChange({ categoricalVarB: e.target.value })}
              className="flex-1 h-8 px-2.5 py-0 leading-normal rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC]"
            >
              {(categoricalCols.length >= 2 ? categoricalCols : allCols).map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
