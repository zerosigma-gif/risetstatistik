import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  MinusCircle,
  X,
} from 'lucide-react';
import { getT } from '../i18n/translations';
import type {
  AnalysisConfig,
  AnalysisType,
  ChartSubType,
  Dataset,
  FormatConfig,
  Language,
} from '../types/stats';
import {
  buildReportSections,
  generateDocxBlob,
  type DocxReportOptions,
} from '../utils/docxReportBuilder';

interface DocxReportModalProps {
  isOpen: boolean;
  dataset: Dataset;
  analysisConfig: AnalysisConfig;
  formatConfig: FormatConfig;
  language: Language;
  onClose: () => void;
  onChangeAlpha: (alpha: number) => void;
}

const ALL_TESTS: AnalysisType[] = [
  'descriptives',
  'ttest_ind',
  'ttest_paired',
  'anova',
  'correlation',
  'regression',
  'chisquare',
];

const ALL_CHARTS: ChartSubType[] = [
  'histogram',
  'boxplot',
  'means_ci',
  'scatter_reg',
  'corr_heatmap',
  'contingency_bar',
];

const ALPHA_OPTIONS = [0.01, 0.05, 0.1] as const;

export const DocxReportModal: React.FC<DocxReportModalProps> = ({
  isOpen,
  dataset,
  analysisConfig,
  formatConfig,
  language,
  onClose,
  onChangeAlpha,
}) => {
  const t = getT(language);

  const defaultTitle =
    language === 'id'
      ? `Laporan Analisis Statistik: ${dataset.nameId}`
      : `Statistical Analysis Report: ${dataset.name}`;

  const [reportTitle, setReportTitle] = useState<string>(defaultTitle);
  const [researcherName, setResearcherName] = useState<string>('');
  const [facultyProgram, setFacultyProgram] = useState<string>('');
  const [selectedTests, setSelectedTests] = useState<AnalysisType[]>([
    analysisConfig.activeTest,
  ]);
  const [selectedCharts, setSelectedCharts] = useState<ChartSubType[]>([
    'histogram',
    'means_ci',
    'scatter_reg',
    'corr_heatmap',
    'contingency_bar',
  ]);
  const [includeTableDiscussion, setIncludeTableDiscussion] = useState<boolean>(true);
  const [includeStrengthTable, setIncludeStrengthTable] = useState<boolean>(true);
  const [includeInterpretation, setIncludeInterpretation] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Sync active test into selection when modal opens if list was empty
  React.useEffect(() => {
    if (isOpen) {
      setSelectedTests((prev) =>
        prev.includes(analysisConfig.activeTest)
          ? prev
          : [analysisConfig.activeTest, ...prev]
      );
      setReportTitle((prev) => {
        const isGenericPrev =
          prev.startsWith('Laporan Analisis Statistik:') ||
          prev.startsWith('Statistical Analysis Report:');
        return isGenericPrev ? defaultTitle : prev;
      });
    }
  }, [isOpen, analysisConfig.activeTest, defaultTitle]);

  const options: DocxReportOptions = useMemo(
    () => ({
      reportTitle,
      researcherName,
      facultyProgram,
      alpha: analysisConfig.alpha,
      selectedTests,
      selectedCharts,
      includeTableDiscussion,
      includeStrengthTable,
      includeInterpretation,
    }),
    [
      reportTitle,
      researcherName,
      facultyProgram,
      analysisConfig.alpha,
      selectedTests,
      selectedCharts,
      includeTableDiscussion,
      includeStrengthTable,
      includeInterpretation,
    ]
  );

  const sections = useMemo(
    () =>
      isOpen
        ? buildReportSections(
            dataset,
            analysisConfig,
            formatConfig,
            language,
            options
          )
        : [],
    [isOpen, dataset, analysisConfig, formatConfig, language, options]
  );

  if (!isOpen) return null;

  const toggleTest = (test: AnalysisType) => {
    setSelectedTests((prev) =>
      prev.includes(test) ? prev.filter((x) => x !== test) : [...prev, test]
    );
  };

  const toggleChart = (chart: ChartSubType) => {
    setSelectedCharts((prev) =>
      prev.includes(chart) ? prev.filter((x) => x !== chart) : [...prev, chart]
    );
  };

  const handleDownloadDocx = async () => {
    if (selectedTests.length === 0 || isGenerating) return;
    setIsGenerating(true);
    try {
      const blob = await generateDocxBlob(
        dataset,
        analysisConfig,
        formatConfig,
        language,
        options
      );
      const safeName = (reportTitle.trim() || dataset.id)
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 60);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName || 'risetstatistik_report'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsGenerating(false);
    }
  };

  const confPct = Math.round((1 - analysisConfig.alpha) * 100);
  const dateLabel = new Date().toLocaleDateString(
    language === 'id' ? 'id-ID' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  let previewTableNum = 1;
  let previewFigureNum = 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 md:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="docx-report-title"
    >
      <div className="w-full max-w-6xl h-[90vh] rounded-md border border-[#E2DFD7] dark:border-[#262B36] bg-[#FFFFFF] dark:bg-[#13161B] shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="shrink-0 px-5 py-3.5 border-b border-[#E2DFD7] dark:border-[#262B36] flex items-center justify-between gap-4 bg-[#FAF9F6] dark:bg-[#0B0D10]">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-[#1D4ED8] dark:text-[#60A5FA] shrink-0" />
            <div className="min-w-0">
              <h2
                id="docx-report-title"
                className="font-display text-sm font-bold text-[#111315] dark:text-[#F3F4F6] truncate"
              >
                {t.docxModal.title}
              </h2>
              <p className="text-[11px] text-[#575B62] dark:text-[#9CA3AF] truncate">
                {t.docxModal.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.docxModal.closeBtn}
            className="p-1.5 rounded hover:bg-[#F2F1EC] dark:hover:bg-[#1B1F27] text-[#575B62] dark:text-[#9CA3AF] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Two-Column Body: Left Configuration + Right Document Preview */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT: Form & Options */}
          <aside className="w-full lg:w-[390px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#E2DFD7] dark:border-[#262B36] bg-[#FFFFFF] dark:bg-[#13161B] overflow-y-auto p-4 space-y-4 text-xs">
            {/* Identity Inputs */}
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-[#111315] dark:text-[#F3F4F6] mb-1">
                  {t.docxModal.reportTitleLabel}
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder={t.docxModal.reportTitlePlaceholder}
                  className="w-full h-9 px-2.5 rounded border border-[#E2DFD7] dark:border-[#262B36] bg-[#FAF9F6] dark:bg-[#0B0D10] text-xs leading-normal text-[#111315] dark:text-[#F3F4F6] focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111315] dark:text-[#F3F4F6] mb-1">
                  {t.docxModal.researcherLabel}
                </label>
                <input
                  type="text"
                  value={researcherName}
                  onChange={(e) => setResearcherName(e.target.value)}
                  placeholder={t.docxModal.researcherPlaceholder}
                  className="w-full h-9 px-2.5 rounded border border-[#E2DFD7] dark:border-[#262B36] bg-[#FAF9F6] dark:bg-[#0B0D10] text-xs leading-normal text-[#111315] dark:text-[#F3F4F6] focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#111315] dark:text-[#F3F4F6] mb-1">
                  {t.docxModal.facultyLabel}
                </label>
                <input
                  type="text"
                  value={facultyProgram}
                  onChange={(e) => setFacultyProgram(e.target.value)}
                  placeholder={t.docxModal.facultyPlaceholder}
                  className="w-full h-9 px-2.5 rounded border border-[#E2DFD7] dark:border-[#262B36] bg-[#FAF9F6] dark:bg-[#0B0D10] text-xs leading-normal text-[#111315] dark:text-[#F3F4F6] focus:outline-none focus:border-[#1D4ED8]"
                />
              </div>
            </div>

            {/* Alpha Significance */}
            <div className="pt-3 border-t border-[#E2DFD7] dark:border-[#262B36] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#111315] dark:text-[#F3F4F6]">
                  {t.docxModal.alphaSection}
                </span>
                <span className="font-mono-tabular text-[11px] text-[#575B62] dark:text-[#9CA3AF]">
                  {confPct}% CI
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 rounded bg-[#F2F1EC] dark:bg-[#0B0D10] border border-[#E2DFD7] dark:border-[#262B36]">
                {ALPHA_OPTIONS.map((a) => {
                  const active = Math.abs(analysisConfig.alpha - a) < 0.001;
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => onChangeAlpha(a)}
                      className={`py-1.5 rounded font-mono-tabular text-xs transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1D4ED8] text-white dark:bg-[#3B82F6] font-semibold'
                          : 'text-[#575B62] dark:text-[#9CA3AF] hover:text-[#111315] dark:hover:text-[#F3F4F6]'
                      }`}
                    >
                      α = {a.toFixed(2)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Statistical Tests Selection */}
            <div className="pt-3 border-t border-[#E2DFD7] dark:border-[#262B36] space-y-2">
              <div className="font-semibold text-[#111315] dark:text-[#F3F4F6]">
                {t.docxModal.testsSection}
              </div>
              <div className="space-y-1.5">
                {ALL_TESTS.map((testId) => {
                  const checked = selectedTests.includes(testId);
                  return (
                    <label
                      key={testId}
                      className="flex items-center justify-between gap-2 py-1 px-2 rounded hover:bg-[#FAF9F6] dark:hover:bg-[#1B1F27] cursor-pointer"
                    >
                      <span className="flex items-center gap-2 text-[#111315] dark:text-[#F3F4F6]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTest(testId)}
                          className="accent-[#1D4ED8] w-3.5 h-3.5"
                        />
                        <span>{t.tests[testId]}</span>
                      </span>
                      {analysisConfig.activeTest === testId && (
                        <span className="text-[10px] font-medium text-[#1D4ED8] dark:text-[#60A5FA]">
                          {language === 'id' ? 'Aktif' : 'Active'}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Chart Types Selection */}
            <div className="pt-3 border-t border-[#E2DFD7] dark:border-[#262B36] space-y-2">
              <div className="font-semibold text-[#111315] dark:text-[#F3F4F6]">
                {t.docxModal.chartsSection}
              </div>
              <div className="grid grid-cols-1 gap-1">
                {ALL_CHARTS.map((ct) => {
                  const checked = selectedCharts.includes(ct);
                  return (
                    <label
                      key={ct}
                      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#FAF9F6] dark:hover:bg-[#1B1F27] cursor-pointer text-[#111315] dark:text-[#F3F4F6]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleChart(ct)}
                        className="accent-[#1D4ED8] w-3.5 h-3.5"
                      />
                      <span>
                        {ct === 'means_ci'
                          ? language === 'id'
                            ? `Rata-Rata & ${confPct}% CI`
                            : `Group Means ± ${confPct}% CI`
                          : t.charts[ct]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Discussion & Interpretation Toggles */}
            <div className="pt-3 border-t border-[#E2DFD7] dark:border-[#262B36] space-y-2">
              <div className="font-semibold text-[#111315] dark:text-[#F3F4F6]">
                {t.docxModal.contentSection}
              </div>
              <label className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#FAF9F6] dark:hover:bg-[#1B1F27] cursor-pointer text-[#111315] dark:text-[#F3F4F6]">
                <input
                  type="checkbox"
                  checked={includeTableDiscussion}
                  onChange={(e) => setIncludeTableDiscussion(e.target.checked)}
                  className="accent-[#1D4ED8] w-3.5 h-3.5"
                />
                <span>{t.docxModal.includeTableDiscussion}</span>
              </label>
              <label className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#FAF9F6] dark:hover:bg-[#1B1F27] cursor-pointer text-[#111315] dark:text-[#F3F4F6]">
                <input
                  type="checkbox"
                  checked={includeStrengthTable}
                  onChange={(e) => setIncludeStrengthTable(e.target.checked)}
                  className="accent-[#1D4ED8] w-3.5 h-3.5"
                />
                <span>{t.docxModal.includeStrengthTable}</span>
              </label>
              <label className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#FAF9F6] dark:hover:bg-[#1B1F27] cursor-pointer text-[#111315] dark:text-[#F3F4F6]">
                <input
                  type="checkbox"
                  checked={includeInterpretation}
                  onChange={(e) => setIncludeInterpretation(e.target.checked)}
                  className="accent-[#1D4ED8] w-3.5 h-3.5"
                />
                <span>{t.docxModal.includeInterpretation}</span>
              </label>
            </div>
          </aside>

          {/* RIGHT: Live .docx Academic Paper Preview */}
          <div className="flex-1 min-w-0 bg-[#EAE7DF] dark:bg-[#0B0D10] overflow-y-auto p-4 md:p-6">
            <div className="max-w-[780px] mx-auto mb-2.5 flex items-center justify-between text-xs text-[#575B62] dark:text-[#9CA3AF]">
              <span className="font-semibold">{t.docxModal.previewTitle}</span>
              <span className="font-mono-tabular">
                APA 7th Edition · α = {analysisConfig.alpha.toFixed(2)}
              </span>
            </div>

            <article className="max-w-[780px] mx-auto bg-[#FFFFFF] text-[#111315] border border-[#D6D2C8] shadow-sm p-6 md:p-10 space-y-6">
              {/* Document Title & Metadata Block */}
              <header className="pb-4 border-b border-[#D6D2C8] space-y-2.5">
                <h1 className="font-display text-xl font-bold leading-snug text-[#111315]">
                  {reportTitle.trim() ||
                    (language === 'id'
                      ? 'Laporan Ringkasan Analisis Statistik'
                      : 'Statistical Analysis Summary Report')}
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs pt-1">
                  <div>
                    <span className="font-semibold text-[#575B62]">
                      {t.docxModal.researcherLabel}:{' '}
                    </span>
                    <span>
                      {researcherName.trim() || t.docxModal.notProvided}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#575B62]">
                      {t.docxModal.facultyLabel}:{' '}
                    </span>
                    <span>
                      {facultyProgram.trim() || t.docxModal.notProvided}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#575B62]">
                      {language === 'id' ? 'Dataset' : 'Dataset'}:{' '}
                    </span>
                    <span className="font-mono-tabular">
                      {language === 'id' ? dataset.nameId : dataset.name} ({dataset.rows.length}×{dataset.columns.length})
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#575B62]">
                      {t.docxModal.alphaSection}:{' '}
                    </span>
                    <span className="font-mono-tabular font-semibold text-[#1D4ED8]">
                      α = {analysisConfig.alpha.toFixed(2)} ({confPct}% {t.rightPane.confidenceLabel})
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#575B62]">
                      {language === 'id' ? 'Tanggal' : 'Date'}:{' '}
                    </span>
                    <span>{dateLabel}</span>
                  </div>
                </div>
              </header>

              {/* Selected Test Sections */}
              {sections.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#575B62]">
                  {t.docxModal.selectAtLeastOneTest}
                </div>
              ) : (
                sections.map((sec, idx) => (
                  <section
                    key={sec.testType}
                    className="space-y-4 pt-2 border-t first:border-t-0 first:pt-0 border-[#E2DFD7]"
                  >
                    <h2 className="font-display text-base font-bold text-[#1D4ED8]">
                      {idx + 1}. {sec.testTitle}
                    </h2>

                    {sec.result.kind === 'error' ? (
                      <div className="flex items-start gap-2 p-3 rounded border border-[#E2DFD7] bg-[#FAF9F6] text-xs text-[#B45309]">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          {t.errors[sec.result.messageKey as keyof typeof t.errors] ??
                            t.docxModal.testUnavailableNote}
                        </span>
                      </div>
                    ) : (
                      <>
                        {sec.apaBundle &&
                          sec.apaBundle.decisionVerdict !== 'descriptive' && (
                            <div className="text-xs space-y-1 text-[#111315]">
                              <p>
                                <span className="font-semibold">{t.apaGuide.h0Title}: </span>
                                {sec.apaBundle.h0Statement}
                              </p>
                              <p>
                                <span className="font-semibold">{t.apaGuide.h1Title}: </span>
                                {sec.apaBundle.h1Statement}
                              </p>
                            </div>
                          )}

                        {/* Main APA-7 Table */}
                        {sec.mainTable && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-bold text-[#111315]">
                              {t.docxModal.tablePrefix} {previewTableNum++}
                            </div>
                            <div className="text-xs italic text-[#575B62]">
                              {t.rightPane.apaOutput} — {sec.testTitle}
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px] border-collapse font-mono-tabular">
                                <thead>
                                  <tr className="border-y border-[#111315] text-left">
                                    {sec.mainTable.headers.map((h, hIdx) => (
                                      <th
                                        key={h}
                                        className={`py-1.5 px-2 font-sans font-semibold ${
                                          hIdx >= sec.mainTable!.numericColStart
                                            ? 'text-right'
                                            : 'text-left'
                                        }`}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {sec.mainTable.rows.map((row, rIdx) => (
                                    <tr
                                      key={rIdx}
                                      className={
                                        rIdx === sec.mainTable!.rows.length - 1
                                          ? 'border-b border-[#111315]'
                                          : ''
                                      }
                                    >
                                      {row.map((cell, cIdx) => (
                                        <td
                                          key={cIdx}
                                          className={`py-1.5 px-2 ${
                                            cIdx >= sec.mainTable!.numericColStart
                                              ? 'text-right'
                                              : 'text-left font-sans font-medium'
                                          }`}
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Table Discussion */}
                        {includeTableDiscussion && sec.tableDiscussion && (
                          <div className="space-y-1">
                            <h3 className="text-xs font-bold text-[#111315]">
                              {t.docxModal.tableDiscussionHeading}
                            </h3>
                            <p className="text-xs leading-relaxed text-[#111315]">
                              {sec.tableDiscussion}
                            </p>
                          </div>
                        )}

                        {/* Strength of Relationship Table */}
                        {includeStrengthTable &&
                          sec.apaBundle &&
                          sec.apaBundle.relationshipRows.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="text-xs font-bold text-[#111315]">
                                {t.docxModal.tablePrefix} {previewTableNum++}
                              </div>
                              <div className="text-xs italic text-[#575B62]">
                                {t.rightPane.strengthOutput} (α = {analysisConfig.alpha.toFixed(2)})
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-[11px] border-collapse font-mono-tabular">
                                  <thead>
                                    <tr className="border-y border-[#111315] text-left">
                                      <th className="py-1.5 pr-2 font-sans font-semibold">
                                        {t.apaGuide.pairCol}
                                      </th>
                                      <th className="py-1.5 px-2 font-sans font-semibold">
                                        {t.apaGuide.metricCol}
                                      </th>
                                      <th className="py-1.5 px-2 font-sans font-semibold">
                                        {t.apaGuide.strengthCol}
                                      </th>
                                      <th className="py-1.5 px-2 text-right font-sans font-semibold">
                                        <i>p</i>
                                      </th>
                                      <th className="py-1.5 pl-2 text-right font-sans font-semibold">
                                        {t.apaGuide.decisionCol}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sec.apaBundle.relationshipRows.map((row, rIdx) => (
                                      <tr
                                        key={row.id}
                                        className={
                                          rIdx === sec.apaBundle!.relationshipRows.length - 1
                                            ? 'border-b border-[#111315]'
                                            : ''
                                        }
                                      >
                                        <td className="py-1.5 pr-2 font-sans font-medium">
                                          {row.pairOrFactor}
                                        </td>
                                        <td className="py-1.5 px-2">
                                          {row.metricLabel}: {row.metricValue}
                                        </td>
                                        <td className="py-1.5 px-2 font-sans">
                                          {row.strengthTier}
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-semibold">
                                          {row.pValue}
                                        </td>
                                        <td
                                          className={`py-1.5 pl-2 text-right font-sans font-semibold whitespace-nowrap ${
                                            row.decision === 'rejected'
                                              ? 'text-[#15803D]'
                                              : 'text-[#B45309]'
                                          }`}
                                        >
                                          {row.decisionLabel}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                        {/* Embedded Chart Previews */}
                        {sec.charts.map((ch) => (
                          <figure key={ch.chartType} className="space-y-1.5 pt-1">
                            <div className="text-xs font-bold text-[#111315]">
                              {t.docxModal.figurePrefix} {previewFigureNum++}
                            </div>
                            <figcaption className="text-xs italic text-[#575B62]">
                              {ch.label} — {sec.testTitle}
                            </figcaption>
                            <div className="border border-[#E2DFD7] rounded p-2 bg-[#FFFFFF]">
                              <img
                                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ch.svg)}`}
                                alt={`${ch.label} - ${sec.testTitle}`}
                                className="w-full h-auto block"
                              />
                            </div>
                          </figure>
                        ))}

                        {/* Research Interpretation */}
                        {includeInterpretation && sec.apaBundle && (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold">
                              {sec.apaBundle.decisionVerdict === 'rejected' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D]" />
                              ) : sec.apaBundle.decisionVerdict === 'fail_to_reject' ? (
                                <MinusCircle className="w-3.5 h-3.5 text-[#B45309]" />
                              ) : null}
                              <span
                                className={
                                  sec.apaBundle.decisionVerdict === 'rejected'
                                    ? 'text-[#15803D]'
                                    : sec.apaBundle.decisionVerdict === 'fail_to_reject'
                                    ? 'text-[#B45309]'
                                    : 'text-[#111315]'
                                }
                              >
                                {sec.apaBundle.decisionVerdict !== 'descriptive' &&
                                sec.apaBundle.verdictLabel
                                  ? `${t.docxModal.interpretationHeading} (${sec.apaBundle.verdictLabel})`
                                  : t.docxModal.interpretationHeading}
                              </span>
                            </div>
                            <p className="text-xs leading-relaxed text-[#111315]">
                              {sec.apaBundle.researchInterpretation}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                ))
              )}
            </article>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 px-5 py-3 border-t border-[#E2DFD7] dark:border-[#262B36] bg-[#FAF9F6] dark:bg-[#0B0D10] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono-tabular text-[#575B62] dark:text-[#9CA3AF]">
            {sections.length} {language === 'id' ? 'pengujian' : 'tests'} ·{' '}
            {sections.reduce((acc, s) => acc + s.charts.length, 0)}{' '}
            {language === 'id' ? 'grafik' : 'charts'} · α = {analysisConfig.alpha.toFixed(2)}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium rounded border border-[#E2DFD7] dark:border-[#262B36] bg-[#FFFFFF] dark:bg-[#13161B] text-[#111315] dark:text-[#F3F4F6] hover:bg-[#F2F1EC] dark:hover:bg-[#1B1F27] cursor-pointer"
            >
              {t.docxModal.closeBtn}
            </button>
            <button
              type="button"
              disabled={selectedTests.length === 0 || isGenerating}
              onClick={handleDownloadDocx}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-[#1D4ED8] hover:bg-[#1E40AF] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.docxModal.generatingBtn}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.docxModal.downloadBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
