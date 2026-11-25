import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Columns2,
  Database,
  Download,
  FilePlus2,
  FileText,
  FlaskConical,
  Moon,
  Plus,
  SlidersHorizontal,
  Sun,
  Upload,
} from 'lucide-react';
import { SAMPLE_DATASET_FACTORIES } from '../data/sampleDatasets';
import { getT } from '../i18n/translations';
import type {
  AnalysisType,
  ColumnDef,
  FormatConfig,
  Language,
  SplitPreset,
  ThemeMode,
  TransformType,
} from '../types/stats';

type MenuId = 'split' | 'datasets' | 'formatting' | 'analyze' | null;

interface TopHeaderProps {
  language: Language;
  onToggleLanguage: (lang: Language) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  datasetName: string;
  rowCount: number;
  colCount: number;
  splitPreset: SplitPreset;
  onSelectSplit: (preset: SplitPreset) => void;
  onLoadSample: (sampleId: string) => void;
  onOpenCsvImport: () => void;
  onExportCsv: () => void;
  onCreateBlankDataset: () => void;
  onAddRow: () => void;
  onAddColumn: () => void;
  formatConfig: FormatConfig;
  onChangeFormat: (next: Partial<FormatConfig>) => void;
  numericColumns: ColumnDef[];
  onQuickTransform: (colKey: string, transform: TransformType) => void;
  activeTest: AnalysisType;
  onSelectTest: (test: AnalysisType) => void;
  onOpenDocxReport: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  language,
  onToggleLanguage,
  theme,
  onToggleTheme,
  datasetName,
  rowCount,
  colCount,
  splitPreset,
  onSelectSplit,
  onLoadSample,
  onOpenCsvImport,
  onExportCsv,
  onCreateBlankDataset,
  onAddRow,
  onAddColumn,
  formatConfig,
  onChangeFormat,
  numericColumns,
  onQuickTransform,
  activeTest,
  onSelectTest,
  onOpenDocxReport,
}) => {
  const t = getT(language);
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [quickTransformCol, setQuickTransformCol] = useState<string>(
    numericColumns[0]?.key ?? ''
  );
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!numericColumns.some((c) => c.key === quickTransformCol)) {
      setQuickTransformCol(numericColumns[0]?.key ?? '');
    }
  }, [numericColumns, quickTransformCol]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const toggleMenu = (id: Exclude<MenuId, null>) => {
    setOpenMenu((prev) => (prev === id ? null : id));
  };

  const analyzeGroups: Array<{
    groupLabel: string;
    items: Array<{ id: AnalysisType; label: string }>;
  }> = [
    {
      groupLabel: t.analyzeMenu.exploration,
      items: [{ id: 'descriptives', label: t.tests.descriptives }],
    },
    {
      groupLabel: t.analyzeMenu.ttest,
      items: [
        { id: 'ttest_ind', label: t.tests.ttest_ind },
        { id: 'ttest_paired', label: t.tests.ttest_paired },
      ],
    },
    {
      groupLabel: t.analyzeMenu.anova,
      items: [{ id: 'anova', label: t.tests.anova }],
    },
    {
      groupLabel: t.analyzeMenu.correlation,
      items: [{ id: 'correlation', label: t.tests.correlation }],
    },
    {
      groupLabel: t.analyzeMenu.regression,
      items: [{ id: 'regression', label: t.tests.regression }],
    },
    {
      groupLabel: t.analyzeMenu.frequencies,
      items: [{ id: 'chisquare', label: t.tests.chisquare }],
    },
  ];

  const menuBtnClass = (isOpen: boolean) =>
    `inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
      isOpen
        ? 'bg-[#0F172A] text-white dark:bg-[#3B82F6] dark:text-white'
        : 'text-[#334155] dark:text-[#CBD5E1] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
    }`;

  return (
    <header className="h-12 px-4 md:px-6 flex items-center justify-between gap-4 border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] select-none z-40 shrink-0">
      {/* Zone 1: Single-line brand wordmark */}
      <div className="flex items-center gap-3.5 min-w-0 shrink-0">
        <span className="font-display text-[15px] font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap shrink-0">
          {t.brand}
        </span>
        <span
          aria-hidden="true"
          className="hidden lg:inline-block h-4 w-px bg-[#E2E8F0] dark:bg-[#1F2937]"
        />
        <span className="hidden lg:inline-flex items-center gap-2 text-xs text-[#64748B] dark:text-[#94A3B8] truncate max-w-[260px]">
          <span className="truncate font-medium text-[#334155] dark:text-[#E2E8F0]">
            {datasetName}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular whitespace-nowrap">
            {rowCount}×{colCount}
          </span>
        </span>
      </div>

      {/* Zone 2: Jamovi-inspired 4-menu analytical ribbon: Split, Datasets, Formatting, Analyze */}
      <nav ref={navRef} className="flex items-center gap-1 md:gap-2 relative">
        {/* SPLIT MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('split')}
            className={menuBtnClass(openMenu === 'split')}
            aria-expanded={openMenu === 'split'}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>{t.menus.split}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {openMenu === 'split' && (
            <div className="absolute left-0 mt-1.5 w-64 rounded-md border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] shadow-lg py-1.5 z-50">
              {(['50-50', '35-65', '65-35', 'table-only', 'visual-only'] as SplitPreset[]).map(
                (preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      onSelectSplit(preset);
                      setOpenMenu(null);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      splitPreset === preset
                        ? 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#1E40AF] dark:text-[#60A5FA] font-semibold'
                        : 'text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]'
                    }`}
                  >
                    <span>{t.splitOptions[preset]}</span>
                    {splitPreset === preset && <span className="font-mono-tabular">✓</span>}
                  </button>
                )
              )}
              <div className="mt-1 pt-1.5 px-3.5 pb-1 border-t border-[#E2E8F0] dark:border-[#1F2937] text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                {t.splitOptions.dragHint}
              </div>
            </div>
          )}
        </div>

        {/* DATASETS MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('datasets')}
            className={menuBtnClass(openMenu === 'datasets')}
            aria-expanded={openMenu === 'datasets'}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{t.menus.datasets}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {openMenu === 'datasets' && (
            <div className="absolute left-0 mt-1.5 w-80 rounded-md border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] shadow-lg py-1.5 z-50">
              <div className="px-3.5 py-1.5 text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                {t.datasetsMenu.sampleTitle}
              </div>
              {SAMPLE_DATASET_FACTORIES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => {
                    onLoadSample(sample.id);
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] transition-colors flex flex-col gap-0.5 cursor-pointer"
                >
                  <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                    {language === 'id' ? sample.nameId : sample.nameEn}
                  </span>
                  <span className="text-[11px] font-mono-tabular text-[#64748B] dark:text-[#94A3B8]">
                    {sample.meta}
                  </span>
                </button>
              ))}
              <div className="my-1 border-t border-[#E2E8F0] dark:border-[#1F2937]" />
              <button
                type="button"
                onClick={() => {
                  onOpenCsvImport();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs font-medium text-[#1E40AF] dark:text-[#60A5FA] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t.datasetsMenu.importCsv}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportCsv();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t.datasetsMenu.exportCsv}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onCreateBlankDataset();
                  setOpenMenu(null);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B] flex items-center gap-2 cursor-pointer"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>{t.datasetsMenu.newBlank}</span>
              </button>
              <div className="my-1 border-t border-[#E2E8F0] dark:border-[#1F2937]" />
              <div className="px-2 py-1 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onAddRow();
                    setOpenMenu(null);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded border border-[#E2E8F0] dark:border-[#1F2937] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t.datasetsMenu.addRow}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAddColumn();
                    setOpenMenu(null);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs rounded border border-[#E2E8F0] dark:border-[#1F2937] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t.datasetsMenu.addColumn}</span>
                </button>
              </div>
              <div className="mt-1 px-3.5 py-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                {t.datasetsMenu.inMemoryNote}
              </div>
            </div>
          )}
        </div>

        {/* FORMATTING MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('formatting')}
            className={menuBtnClass(openMenu === 'formatting')}
            aria-expanded={openMenu === 'formatting'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{t.menus.formatting}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {openMenu === 'formatting' && (
            <div className="absolute right-0 md:left-0 mt-1.5 w-[300px] rounded-md border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] shadow-lg p-3 z-50 space-y-3">
              <div>
                <div className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1.5">
                  {t.formattingMenu.decimals}
                </div>
                <div className="grid grid-cols-3 gap-1 bg-[#F1F5F9] dark:bg-[#0B0F17] p-1 rounded">
                  {([2, 3, 4] as const).map((dec) => (
                    <button
                      key={dec}
                      type="button"
                      onClick={() => onChangeFormat({ decimals: dec })}
                      className={`py-1 text-xs font-mono-tabular rounded transition-colors cursor-pointer ${
                        formatConfig.decimals === dec
                          ? 'bg-[#FFFFFF] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] font-semibold shadow-xs'
                          : 'text-[#475569] dark:text-[#94A3B8]'
                      }`}
                    >
                      .{dec}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8] mb-1.5">
                  {t.formattingMenu.density}
                </div>
                <div className="grid grid-cols-2 gap-1 bg-[#F1F5F9] dark:bg-[#0B0F17] p-1 rounded">
                  {(['compact', 'comfortable'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onChangeFormat({ density: d })}
                      className={`py-1 text-xs rounded transition-colors cursor-pointer ${
                        formatConfig.density === d
                          ? 'bg-[#FFFFFF] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] font-semibold shadow-xs'
                          : 'text-[#475569] dark:text-[#94A3B8]'
                      }`}
                    >
                      {t.formattingMenu[d]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-[#E2E8F0] dark:border-[#1F2937]">
                <label className="flex items-center justify-between text-xs cursor-pointer py-1">
                  <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                    {t.formattingMenu.apaP}
                  </span>
                  <input
                    type="checkbox"
                    checked={formatConfig.apaPValues}
                    onChange={(e) => onChangeFormat({ apaPValues: e.target.checked })}
                    className="accent-[#1E40AF] w-3.5 h-3.5"
                  />
                </label>
                <label className="flex items-center justify-between text-xs cursor-pointer py-1">
                  <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                    {t.formattingMenu.thousands}
                  </span>
                  <input
                    type="checkbox"
                    checked={formatConfig.thousandsSep}
                    onChange={(e) => onChangeFormat({ thousandsSep: e.target.checked })}
                    className="accent-[#1E40AF] w-3.5 h-3.5"
                  />
                </label>
              </div>

              {numericColumns.length > 0 && (
                <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#1F2937] space-y-2">
                  <div className="text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    {t.formattingMenu.quickTransform}
                  </div>
                  <select
                    value={quickTransformCol}
                    onChange={(e) => setQuickTransformCol(e.target.value)}
                    className="w-full h-8 px-2 py-0 leading-normal text-xs rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC]"
                  >
                    {numericColumns.map((col) => (
                      <option key={col.key} value={col.key}>
                        {col.label}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-1">
                    {(['zscore', 'log10', 'minmax', 'rank'] as TransformType[]).map((tr) => (
                      <button
                        key={tr}
                        type="button"
                        onClick={() => {
                          if (quickTransformCol) {
                            onQuickTransform(quickTransformCol, tr);
                            setOpenMenu(null);
                          }
                        }}
                        className="px-2 py-1.5 text-[11px] text-left rounded border border-[#E2E8F0] dark:border-[#1F2937] hover:border-[#1E40AF] dark:hover:border-[#3B82F6] text-[#0F172A] dark:text-[#F8FAFC] truncate cursor-pointer"
                      >
                        {t.transforms[tr]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ANALYZE MENU */}
        <div className="relative">
          <button
            type="button"
            onClick={() => toggleMenu('analyze')}
            className={menuBtnClass(openMenu === 'analyze')}
            aria-expanded={openMenu === 'analyze'}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{t.menus.analyze}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
          {openMenu === 'analyze' && (
            <div className="absolute right-0 mt-1.5 w-72 rounded-md border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] shadow-lg py-1.5 z-50">
              {analyzeGroups.map((grp, idx) => (
                <div
                  key={grp.groupLabel}
                  className={
                    idx > 0
                      ? 'mt-1 pt-1 border-t border-[#E2E8F0] dark:border-[#1F2937]'
                      : ''
                  }
                >
                  <div className="px-3.5 py-1 text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                    {grp.groupLabel}
                  </div>
                  {grp.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectTest(item.id);
                        setOpenMenu(null);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                        activeTest === item.id
                          ? 'bg-[#F1F5F9] dark:bg-[#1E293B] text-[#1E40AF] dark:text-[#60A5FA] font-semibold'
                          : 'text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]'
                      }`}
                    >
                      <span>{item.label}</span>
                      {activeTest === item.id && <span className="font-mono-tabular">✓</span>}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RINGKASAN LAPORAN (.DOCX) */}
        <button
          type="button"
          onClick={() => {
            setOpenMenu(null);
            onOpenDocxReport();
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] hover:border-[#1E40AF] dark:hover:border-[#3B82F6] hover:text-[#1E40AF] dark:hover:text-[#60A5FA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>{t.menus.report}</span>
        </button>
      </nav>

      {/* Zone 3: Language Switcher (ID | EN) & Light/Dark Theme Switch */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="inline-flex items-center p-0.5 rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17]"
          role="group"
          aria-label="Language"
        >
          <button
            type="button"
            onClick={() => onToggleLanguage('id')}
            className={`px-2 py-1 text-[11px] font-mono-tabular font-semibold rounded-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              language === 'id'
                ? 'bg-[#0F172A] text-white dark:bg-[#3B82F6]'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
            }`}
          >
            ID
          </button>
          <button
            type="button"
            onClick={() => onToggleLanguage('en')}
            className={`px-2 py-1 text-[11px] font-mono-tabular font-semibold rounded-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              language === 'en'
                ? 'bg-[#0F172A] text-white dark:bg-[#3B82F6]'
                : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
            }`}
          >
            EN
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className="p-2 rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#334155] dark:text-[#E2E8F0] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] transition-colors cursor-pointer shrink-0"
        >
          {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
