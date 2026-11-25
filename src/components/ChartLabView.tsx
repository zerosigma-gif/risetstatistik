import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Download,
  MinusCircle,
} from 'lucide-react';
import { formatNum, formatPValue, normalPdf, tCritical } from '../engine/statMath';
import { getT } from '../i18n/translations';
import type {
  AnalysisConfig,
  AnalysisType,
  ChartSubType,
  Dataset,
  FormatConfig,
  Language,
  StatResult,
} from '../types/stats';
import { buildApaReportBundle } from '../utils/apaAnalysis';
import { ApaGuideDrawer } from './ApaGuideDrawer';

interface ChartLabViewProps {
  result: StatResult;
  dataset: Dataset;
  config: AnalysisConfig;
  formatConfig: FormatConfig;
  language: Language;
  onChangeConfig: (next: Partial<AnalysisConfig>) => void;
  onSelectTest?: (test: AnalysisType) => void;
}

const CHART_SERIES_COLORS = [
  '#1D4ED8',
  '#0F766E',
  '#B45309',
  '#6D28D9',
  '#BE123C',
  '#0369A1',
];

const ALPHA_OPTIONS = [0.01, 0.05, 0.1] as const;

export const ChartLabView: React.FC<ChartLabViewProps> = ({
  result,
  dataset,
  config,
  formatConfig,
  language,
  onChangeConfig,
  onSelectTest,
}) => {
  const t = getT(language);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverText, setHoverText] = useState<string | null>(null);
  const [isApaOpen, setIsApaOpen] = useState<boolean>(false);

  const availableCharts = useMemo((): ChartSubType[] => {
    switch (result.kind) {
      case 'descriptives':
        return ['histogram', 'boxplot'];
      case 'ttest_ind':
      case 'anova':
        return ['means_ci', 'boxplot'];
      case 'ttest_paired':
        return ['means_ci', 'boxplot'];
      case 'correlation':
        return ['corr_heatmap'];
      case 'regression':
        return ['scatter_reg', 'histogram'];
      case 'chisquare':
        return ['contingency_bar'];
      default:
        return ['histogram'];
    }
  }, [result.kind]);

  const [selectedChart, setSelectedChart] = useState<ChartSubType>(availableCharts[0]);
  const activeChart = availableCharts.includes(selectedChart)
    ? selectedChart
    : availableCharts[0];

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgRef.current);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risetstatistik_${result.kind}_${activeChart}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const apaBundle = useMemo(
    () => buildApaReportBundle(result, dataset, config, formatConfig, language),
    [result, dataset, config, formatConfig, language]
  );

  const confidencePct = Math.round((1 - config.alpha) * 100);

  const renderAlphaAndApaBar = () => (
    <div className="shrink-0 border-b border-[#E2DFD7] dark:border-[#262B36] bg-[#FAF9F6] dark:bg-[#0B0D10]">
      <div className="px-5 py-2 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-medium text-[#575B62] dark:text-[#9CA3AF] whitespace-nowrap">
            {t.rightPane.alphaLabel}:
          </span>
          <div
            className="inline-flex items-center rounded border border-[#E2DFD7] dark:border-[#262B36] bg-[#FFFFFF] dark:bg-[#13161B] p-0.5"
            role="group"
            aria-label={t.rightPane.alphaLabel}
          >
            {ALPHA_OPTIONS.map((a) => {
              const active = Math.abs(config.alpha - a) < 0.001;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => onChangeConfig({ alpha: a })}
                  className={`px-2 py-0.5 text-[11px] font-mono-tabular rounded transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#1D4ED8] text-white dark:bg-[#3B82F6] font-semibold'
                      : 'text-[#575B62] dark:text-[#9CA3AF] hover:text-[#111315] dark:hover:text-[#F3F4F6]'
                  }`}
                >
                  {a.toFixed(2)}
                </button>
              );
            })}
          </div>
          <span className="text-[11px] font-mono-tabular text-[#575B62] dark:text-[#9CA3AF] whitespace-nowrap">
            ({confidencePct}% {t.rightPane.confidenceLabel})
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsApaOpen((v) => !v)}
          aria-expanded={isApaOpen}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border transition-colors cursor-pointer whitespace-nowrap ${
            isApaOpen
              ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white dark:border-[#3B82F6] dark:bg-[#3B82F6]'
              : 'border-[#E2DFD7] dark:border-[#262B36] bg-[#FFFFFF] dark:bg-[#13161B] text-[#111315] dark:text-[#F3F4F6] hover:border-[#1D4ED8] dark:hover:border-[#3B82F6]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>{t.rightPane.apaSlideToggle}</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isApaOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {isApaOpen && apaBundle && (
        <ApaGuideDrawer
          bundle={apaBundle}
          alpha={config.alpha}
          language={language}
          testTitle={t.tests[config.activeTest]}
        />
      )}
    </div>
  );

  if (result.kind === 'error') {
    const errMsg =
      t.errors[result.messageKey as keyof typeof t.errors] ?? result.messageKey;
    return (
      <div className="h-full flex flex-col overflow-hidden bg-[#FFFFFF] dark:bg-[#13161B]">
        {renderAlphaAndApaBar()}
        <div className="shrink-0 px-5 py-3 border-b border-[#E2DFD7] dark:border-[#262B36] bg-[#FFFFFF] dark:bg-[#13161B]">
          <h3 className="font-display text-sm font-semibold text-[#111315] dark:text-[#F3F4F6]">
            {t.tests[config.activeTest]}
          </h3>
        </div>
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-[#B45309] dark:text-[#F59E0B] mb-3" />
          <p className="text-sm font-medium text-[#111315] dark:text-[#F3F4F6] max-w-md">
            {errMsg}
          </p>
        </div>
      </div>
    );
  }

  // Significance indicator derived from APA bundle (covers Correlation & Regression too)
  const primaryP = apaBundle?.primaryP ?? null;
  const isSig = apaBundle?.isSig ?? false;

  // Render SVG Chart content
  const renderSvgChart = () => {
    const W = 720;
    const H = 328;
    const padL = 62;
    const padR = 26;
    const padT = 26;
    const padB = 52;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    // 1. HISTOGRAM + NORMAL FIT (Descriptives multi-panel or Regression active variables + residuals)
    if (
      activeChart === 'histogram' &&
      (result.kind === 'descriptives' || result.kind === 'regression')
    ) {
      const panels =
        result.kind === 'descriptives'
          ? result.rows.map((r, idx) => ({
              label: r.variable,
              vals: r.values,
              color: CHART_SERIES_COLORS[idx % CHART_SERIES_COLORS.length],
            }))
          : [
              {
                label:
                  language === 'id'
                    ? `Residual (${result.dependentVar} ~ ${result.independentVars.join(' + ')})`
                    : `Residuals (${result.dependentVar} ~ ${result.independentVars.join(' + ')})`,
                vals: result.points.map((p) => p.residual),
                color: '#B45309',
              },
              {
                label: `${result.dependentVar} (Y)`,
                vals: result.points.map((p) => p.y),
                color: CHART_SERIES_COLORS[0],
              },
              ...result.predictorSeries.map((s, idx) => ({
                label: `${s.predictor} (X)`,
                vals: s.points.map((p) => p.x),
                color: CHART_SERIES_COLORS[(idx + 1) % CHART_SERIES_COLORS.length],
              })),
            ];

      const validPanels = panels.filter((p) => p.vals.length > 0);
      if (validPanels.length === 0) return null;

      const renderSingleHistogram = (
        panel: { label: string; vals: number[]; color: string },
        idx: number,
        isMulti: boolean
      ) => {
        const vals = panel.vals;
        const minV = Math.min(...vals);
        const maxV = Math.max(...vals);
        const span = maxV - minV || 1;
        const bins = Math.min(12, Math.max(5, Math.ceil(Math.sqrt(vals.length))));
        const binWidth = span / bins;
        const counts = new Array<number>(bins).fill(0);
        for (const v of vals) {
          const bIdx = Math.min(bins - 1, Math.floor((v - minV) / binWidth));
          counts[bIdx]++;
        }
        const maxCount = Math.max(...counts, 1);
        const meanVal = vals.reduce((a, b) => a + b, 0) / vals.length;
        const sdVal = Math.sqrt(
          vals.reduce((a, b) => a + (b - meanVal) ** 2, 0) / Math.max(1, vals.length - 1)
        );

        const pW = isMulti ? 460 : W;
        const pH = isMulti ? 260 : H;
        const pL = isMulti ? 48 : padL;
        const pR = isMulti ? 20 : padR;
        const pT = isMulti ? 26 : padT;
        const pB = isMulti ? 50 : padB;
        const innerW = pW - pL - pR;
        const innerH = pH - pT - pB;

        const curvePts: string[] = [];
        for (let i = 0; i <= 50; i++) {
          const xVal = minV + (i / 50) * span;
          const density = normalPdf(xVal, meanVal, sdVal || 1);
          const expectedCount = density * vals.length * binWidth;
          const px = pL + (i / 50) * innerW;
          const py = pT + innerH - Math.min(1.15, expectedCount / maxCount) * innerH;
          curvePts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
        }

        return (
          <div
            key={panel.label}
            className={
              isMulti
                ? 'border border-[#E2DFD7] dark:border-[#262B36] rounded bg-[#FFFFFF] dark:bg-[#13161B] p-2.5'
                : ''
            }
          >
            <svg
              ref={idx === 0 ? svgRef : undefined}
              viewBox={`0 0 ${pW} ${pH}`}
              className="w-full h-auto max-h-[320px]"
              onMouseLeave={() => setHoverText(null)}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                const y = pT + innerH - f * innerH;
                return (
                  <g key={f}>
                    <line
                      x1={pL}
                      y1={y}
                      x2={pW - pR}
                      y2={y}
                      stroke="currentColor"
                      className="text-[#E2DFD7] dark:text-[#262B36]"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={pL - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-[#575B62] dark:fill-[#9CA3AF] text-[11px] font-mono-tabular"
                    >
                      {Math.round(f * maxCount)}
                    </text>
                  </g>
                );
              })}

              {counts.map((c, bIdx) => {
                const bw = innerW / bins;
                const x = pL + bIdx * bw + 2;
                const bh = (c / maxCount) * innerH;
                const y = pT + innerH - bh;
                const lo = minV + bIdx * binWidth;
                const hi = lo + binWidth;
                return (
                  <rect
                    key={bIdx}
                    x={x}
                    y={y}
                    width={Math.max(4, bw - 4)}
                    height={bh}
                    rx={2}
                    fill={panel.color}
                    fillOpacity={0.82}
                    className="hover:opacity-100 transition-opacity cursor-crosshair"
                    onMouseEnter={() =>
                      setHoverText(
                        `${panel.label} [${formatNum(lo, 2, false)} – ${formatNum(hi, 2, false)}]: n = ${c}`
                      )
                    }
                  />
                );
              })}

              <polyline
                fill="none"
                stroke="#B45309"
                strokeWidth="2.1"
                points={curvePts.join(' ')}
              />

              <line
                x1={pL}
                y1={pT + innerH}
                x2={pW - pR}
                y2={pT + innerH}
                stroke="currentColor"
                className="text-[#111315] dark:text-[#9CA3AF]"
              />
              <text
                x={pL}
                y={pT + innerH + 17}
                className="fill-[#575B62] dark:fill-[#9CA3AF] text-[11px] font-mono-tabular"
              >
                {formatNum(minV, formatConfig.decimals, false)}
              </text>
              <text
                x={pL + innerW / 2}
                y={pT + innerH + 36}
                textAnchor="middle"
                className="fill-[#111315] dark:fill-[#F3F4F6] text-xs font-medium"
              >
                {panel.label} (M = {formatNum(meanVal, 2, false)}, SD = {formatNum(sdVal, 2, false)})
              </text>
              <text
                x={pW - pR}
                y={pT + innerH + 17}
                textAnchor="end"
                className="fill-[#575B62] dark:fill-[#9CA3AF] text-[11px] font-mono-tabular"
              >
                {formatNum(maxV, formatConfig.decimals, false)}
              </text>
            </svg>
          </div>
        );
      };

      if (validPanels.length === 1) {
        return renderSingleHistogram(validPanels[0], 0, false);
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {validPanels.map((panel, idx) => renderSingleHistogram(panel, idx, true))}
        </div>
      );
    }

    // 2. BOXPLOT OR MEANS +/- 95% CI (Descriptives, T-Test, ANOVA)
    if (
      (activeChart === 'boxplot' || activeChart === 'means_ci') &&
      (result.kind === 'descriptives' ||
        result.kind === 'ttest_ind' ||
        result.kind === 'ttest_paired' ||
        result.kind === 'anova')
    ) {
      const series =
        result.kind === 'descriptives'
          ? result.rows.map((r) => ({
              label: r.variable,
              mean: r.mean,
              ciLower: r.ciLower,
              ciUpper: r.ciUpper,
              min: r.min,
              q1: r.q1,
              median: r.median,
              q3: r.q3,
              max: r.max,
              values: r.values,
            }))
          : result.kind === 'ttest_paired'
          ? [
              (() => {
                const aVals = [...result.pairs.map((p) => p.a)].sort((x, y) => x - y);
                const tCrit = tCritical(Math.max(1, result.n - 1), config.alpha);
                return {
                  label: result.varA,
                  mean: result.meanA,
                  ciLower: result.meanA - (tCrit * result.sdA) / Math.sqrt(result.n),
                  ciUpper: result.meanA + (tCrit * result.sdA) / Math.sqrt(result.n),
                  min: aVals[0],
                  q1: aVals[Math.floor(aVals.length * 0.25)],
                  median: aVals[Math.floor(aVals.length * 0.5)],
                  q3: aVals[Math.floor(aVals.length * 0.75)],
                  max: aVals[aVals.length - 1],
                  values: result.pairs.map((p) => p.a),
                };
              })(),
              (() => {
                const bVals = [...result.pairs.map((p) => p.b)].sort((x, y) => x - y);
                const tCrit = tCritical(Math.max(1, result.n - 1), config.alpha);
                return {
                  label: result.varB,
                  mean: result.meanB,
                  ciLower: result.meanB - (tCrit * result.sdB) / Math.sqrt(result.n),
                  ciUpper: result.meanB + (tCrit * result.sdB) / Math.sqrt(result.n),
                  min: bVals[0],
                  q1: bVals[Math.floor(bVals.length * 0.25)],
                  median: bVals[Math.floor(bVals.length * 0.5)],
                  q3: bVals[Math.floor(bVals.length * 0.75)],
                  max: bVals[bVals.length - 1],
                  values: result.pairs.map((p) => p.b),
                };
              })(),
            ]
          : result.groups.map((g) => ({
              label: g.group,
              mean: g.mean,
              ciLower: g.ciLower,
              ciUpper: g.ciUpper,
              min: g.min,
              q1: g.q1,
              median: g.median,
              q3: g.q3,
              max: g.max,
              values: g.values,
            }));

      const allVals = series.flatMap((s) => [s.min, s.max, s.ciLower, s.ciUpper]);
      const rawMin = Math.min(...allVals);
      const rawMax = Math.max(...allVals);
      const padSpan = (rawMax - rawMin || 1) * 0.12;
      const yMin = rawMin - padSpan;
      const yMax = rawMax + padSpan;
      const yToPx = (v: number) =>
        padT + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;

      const slotW = plotW / Math.max(1, series.length);

      return (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto max-h-[340px]"
          onMouseLeave={() => setHoverText(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const val = yMin + f * (yMax - yMin);
            const y = yToPx(val);
            return (
              <g key={f}>
                <line
                  x1={padL}
                  y1={y}
                  x2={W - padR}
                  y2={y}
                  stroke="currentColor"
                  className="text-[#E2DFD7] dark:text-[#262B36]"
                  strokeDasharray="3 3"
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#575B62] dark:fill-[#9CA3AF] text-[11px] font-mono-tabular"
                >
                  {formatNum(val, 1, false)}
                </text>
              </g>
            );
          })}

          {/* Connect group means line for means_ci */}
          {activeChart === 'means_ci' && series.length > 1 && (
            <polyline
              fill="none"
              stroke="#1D4ED8"
              strokeWidth="1.75"
              strokeOpacity="0.6"
              points={series
                .map((s, idx) => `${(padL + slotW * (idx + 0.5)).toFixed(1)},${yToPx(s.mean).toFixed(1)}`)
                .join(' ')}
            />
          )}

          {series.map((s, idx) => {
            const cx = padL + slotW * (idx + 0.5);
            const color = CHART_SERIES_COLORS[idx % CHART_SERIES_COLORS.length];
            const boxW = Math.min(54, slotW * 0.44);

            return (
              <g
                key={s.label}
                className="cursor-crosshair"
                onMouseEnter={() =>
                  setHoverText(
                    `${s.label}: Mean = ${formatNum(s.mean, formatConfig.decimals, false)} · Median = ${formatNum(s.median, formatConfig.decimals, false)} · 95% CI [${formatNum(s.ciLower, 2, false)}, ${formatNum(s.ciUpper, 2, false)}]`
                  )
                }
              >
                {/* Jittered observations */}
                {config.showJitter &&
                  s.values.map((v, vIdx) => {
                    const offset = ((vIdx % 7) - 3) * (boxW * 0.14);
                    return (
                      <circle
                        key={vIdx}
                        cx={cx + offset}
                        cy={yToPx(v)}
                        r={2.8}
                        fill={color}
                        fillOpacity={0.35}
                      />
                    );
                  })}

                {activeChart === 'boxplot' ? (
                  <>
                    {/* Whisker line */}
                    <line
                      x1={cx}
                      y1={yToPx(s.max)}
                      x2={cx}
                      y2={yToPx(s.min)}
                      stroke={color}
                      strokeWidth="1.5"
                    />
                    <line
                      x1={cx - boxW * 0.28}
                      y1={yToPx(s.max)}
                      x2={cx + boxW * 0.28}
                      y2={yToPx(s.max)}
                      stroke={color}
                      strokeWidth="1.5"
                    />
                    <line
                      x1={cx - boxW * 0.28}
                      y1={yToPx(s.min)}
                      x2={cx + boxW * 0.28}
                      y2={yToPx(s.min)}
                      stroke={color}
                      strokeWidth="1.5"
                    />
                    {/* IQR Box */}
                    <rect
                      x={cx - boxW / 2}
                      y={yToPx(s.q3)}
                      width={boxW}
                      height={Math.max(2, yToPx(s.q1) - yToPx(s.q3))}
                      fill={color}
                      fillOpacity={0.22}
                      stroke={color}
                      strokeWidth="1.8"
                      rx={2}
                    />
                    {/* Median line */}
                    <line
                      x1={cx - boxW / 2}
                      y1={yToPx(s.median)}
                      x2={cx + boxW / 2}
                      y2={yToPx(s.median)}
                      stroke={color}
                      strokeWidth="2.6"
                    />
                  </>
                ) : (
                  <>
                    {/* 95% CI Error Bar */}
                    <line
                      x1={cx}
                      y1={yToPx(s.ciUpper)}
                      x2={cx}
                      y2={yToPx(s.ciLower)}
                      stroke={color}
                      strokeWidth="2"
                    />
                    <line
                      x1={cx - 10}
                      y1={yToPx(s.ciUpper)}
                      x2={cx + 10}
                      y2={yToPx(s.ciUpper)}
                      stroke={color}
                      strokeWidth="2"
                    />
                    <line
                      x1={cx - 10}
                      y1={yToPx(s.ciLower)}
                      x2={cx + 10}
                      y2={yToPx(s.ciLower)}
                      stroke={color}
                      strokeWidth="2"
                    />
                    <circle
                      cx={cx}
                      cy={yToPx(s.mean)}
                      r={5.5}
                      fill={color}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  </>
                )}

                <text
                  x={cx}
                  y={padT + plotH + 22}
                  textAnchor="middle"
                  className="fill-[#111315] dark:fill-[#F3F4F6] text-xs font-medium"
                >
                  {s.label}
                </text>
              </g>
            );
          })}

          <line
            x1={padL}
            y1={padT + plotH}
            x2={W - padR}
            y2={padT + plotH}
            stroke="currentColor"
            className="text-[#111315] dark:text-[#9CA3AF]"
          />
        </svg>
      );
    }

    // 3. SCATTERPLOT & OLS REGRESSION LINE (1 panel per lit-up predictor)
    if (activeChart === 'scatter_reg' && result.kind === 'regression') {
      const seriesList = result.predictorSeries;
      if (seriesList.length === 0) return null;

      const renderScatterPanel = (
        item: (typeof seriesList)[number],
        idx: number,
        isMulti: boolean
      ) => {
        const pts = item.points;
        if (pts.length === 0) return null;
        const xs = pts.map((p) => p.x);
        const ys = pts.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const padX = (maxX - minX || 1) * 0.08;
        const padY = (maxY - minY || 1) * 0.1;
        const x0 = minX - padX;
        const x1 = maxX + padX;
        const y0 = minY - padY;
        const y1 = maxY + padY;

        const pW = isMulti ? 460 : W;
        const pH = isMulti ? 260 : H;
        const pL = isMulti ? 50 : padL;
        const pR = isMulti ? 20 : padR;
        const pT = isMulti ? 24 : padT;
        const pB = isMulti ? 46 : padB;
        const innerW = pW - pL - pR;
        const innerH = pH - pT - pB;

        const xToPx = (v: number) => pL + ((v - x0) / (x1 - x0 || 1)) * innerW;
        const yToPx = (v: number) => pT + innerH - ((v - y0) / (y1 - y0 || 1)) * innerH;

        const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
        const my = ys.reduce((a, b) => a + b, 0) / ys.length;
        let num = 0;
        let den = 0;
        for (let i = 0; i < pts.length; i++) {
          num += (xs[i] - mx) * (ys[i] - my);
          den += (xs[i] - mx) ** 2;
        }
        const slope = den > 0 ? num / den : 0;
        const intercept = my - slope * mx;
        const lineY0 = intercept + slope * minX;
        const lineY1 = intercept + slope * maxX;

        const color = CHART_SERIES_COLORS[idx % CHART_SERIES_COLORS.length];
        const bandOffset = result.rmse * 1.96 * 0.35;
        const bandPoly = `${xToPx(minX)},${yToPx(lineY0 + bandOffset)} ${xToPx(maxX)},${yToPx(lineY1 + bandOffset)} ${xToPx(maxX)},${yToPx(lineY1 - bandOffset)} ${xToPx(minX)},${yToPx(lineY0 - bandOffset)}`;

        return (
          <div
            key={item.predictor}
            className={
              isMulti
                ? 'border border-[#E2DFD7] dark:border-[#262B36] rounded bg-[#FFFFFF] dark:bg-[#13161B] p-2.5'
                : ''
            }
          >
            <svg
              ref={idx === 0 ? svgRef : undefined}
              viewBox={`0 0 ${pW} ${pH}`}
              className="w-full h-auto max-h-[340px]"
              onMouseLeave={() => setHoverText(null)}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                const val = y0 + f * (y1 - y0);
                const y = yToPx(val);
                return (
                  <g key={f}>
                    <line
                      x1={pL}
                      y1={y}
                      x2={pW - pR}
                      y2={y}
                      stroke="currentColor"
                      className="text-[#E2DFD7] dark:text-[#262B36]"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={pL - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-[#575B62] dark:fill-[#9CA3AF] text-[11px] font-mono-tabular"
                    >
                      {formatNum(val, 1, false)}
                    </text>
                  </g>
                );
              })}

              {config.showRegCI && (
                <polygon points={bandPoly} fill={color} fillOpacity={0.12} />
              )}

              <line
                x1={xToPx(minX)}
                y1={yToPx(lineY0)}
                x2={xToPx(maxX)}
                y2={yToPx(lineY1)}
                stroke={color}
                strokeWidth="2.3"
              />

              {pts.map((p, pIdx) => (
                <circle
                  key={pIdx}
                  cx={xToPx(p.x)}
                  cy={yToPx(p.y)}
                  r={isMulti ? 3.8 : 4.2}
                  fill={color}
                  className="stroke-[#FFFFFF] dark:stroke-[#13161B] cursor-crosshair"
                  strokeWidth="1.2"
                  onMouseEnter={() =>
                    setHoverText(
                      `${item.predictor} = ${formatNum(p.x, 2, false)} · ${result.dependentVar} = ${formatNum(p.y, 2, false)} · Model Fitted = ${formatNum(p.fitted, 2, false)}`
                    )
                  }
                />
              ))}

              <line
                x1={pL}
                y1={pT + innerH}
                x2={pW - pR}
                y2={pT + innerH}
                stroke="currentColor"
                className="text-[#111315] dark:text-[#9CA3AF]"
              />
              <text
                x={pL}
                y={pT + innerH + 17}
                className="fill-[#575B62] dark:fill-[#9CA3AF] text-[10px] font-mono-tabular"
              >
                {formatNum(minX, 1, false)}
              </text>
              <text
                x={pL + innerW / 2}
                y={pT + innerH + 34}
                textAnchor="middle"
                className="fill-[#111315] dark:fill-[#F3F4F6] text-xs font-medium"
              >
                {item.predictor} → {result.dependentVar} (B = {formatNum(item.coef.b, formatConfig.decimals, false)}, p = {formatPValue(item.coef.p, formatConfig.apaPValues, formatConfig.decimals)})
              </text>
              <text
                x={pW - pR}
                y={pT + innerH + 17}
                textAnchor="end"
                className="fill-[#575B62] dark:fill-[#9CA3AF] text-[10px] font-mono-tabular"
              >
                {formatNum(maxX, 1, false)}
              </text>
            </svg>
          </div>
        );
      };

      if (seriesList.length === 1) {
        return renderScatterPanel(seriesList[0], 0, false);
      }

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {seriesList.map((item, idx) => renderScatterPanel(item, idx, true))}
        </div>
      );
    }

    // 4. CORRELATION MATRIX HEATMAP
    if (activeChart === 'corr_heatmap' && result.kind === 'correlation') {
      const vars = result.variables;
      const n = vars.length;
      const cellSize = Math.min(58, Math.floor(Math.min(plotW - 80, plotH - 20) / n));
      const startX = padL + 85;
      const startY = padT + 14;

      return (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto max-h-[340px]"
          onMouseLeave={() => setHoverText(null)}
        >
          {vars.map((rowVar, rIdx) => (
            <g key={rowVar}>
              <text
                x={startX - 10}
                y={startY + rIdx * cellSize + cellSize / 2 + 4}
                textAnchor="end"
                className="fill-[#111315] dark:fill-[#F3F4F6] text-[11px] font-medium"
              >
                {rowVar}
              </text>
              {vars.map((colVar, cIdx) => {
                const cell = result.matrix[rowVar][colVar];
                const absR = Math.abs(cell.r);
                const bg =
                  cell.r >= 0
                    ? `rgba(29, 78, 216, ${0.12 + absR * 0.72})`
                    : `rgba(185, 28, 28, ${0.12 + absR * 0.72})`;
                const textLight = absR > 0.55;
                return (
                  <g
                    key={colVar}
                    className="cursor-crosshair"
                    onMouseEnter={() =>
                      setHoverText(
                        `${rowVar} × ${colVar}: r = ${formatNum(cell.r, 3, false)}, p = ${formatPValue(cell.p, formatConfig.apaPValues, formatConfig.decimals)}, n = ${cell.n}`
                      )
                    }
                  >
                    <rect
                      x={startX + cIdx * cellSize}
                      y={startY + rIdx * cellSize}
                      width={cellSize - 2}
                      height={cellSize - 2}
                      rx={3}
                      fill={bg}
                    />
                    <text
                      x={startX + cIdx * cellSize + (cellSize - 2) / 2}
                      y={startY + rIdx * cellSize + (cellSize - 2) / 2 + 4}
                      textAnchor="middle"
                      className={`text-[11px] font-mono-tabular font-semibold ${
                        textLight ? 'fill-white' : 'fill-[#111315] dark:fill-[#F3F4F6]'
                      }`}
                    >
                      {formatNum(cell.r, 2, false)}
                    </text>
                  </g>
                );
              })}
              <text
                x={startX + rIdx * cellSize + cellSize / 2}
                y={startY + n * cellSize + 18}
                textAnchor="middle"
                className="fill-[#575B62] dark:fill-[#9CA3AF] text-[10px] font-medium"
              >
                {rowVar.length > 11 ? `${rowVar.slice(0, 10)}…` : rowVar}
              </text>
            </g>
          ))}
        </svg>
      );
    }

    // 5. CONTINGENCY GROUPED BAR CHART (Chi-Square)
    if (activeChart === 'contingency_bar' && result.kind === 'chisquare') {
      const { rowLevels, colLevels, observed } = result;
      const maxFreq = Math.max(...observed.flat(), 1);
      const groupSlot = plotW / Math.max(1, rowLevels.length);
      const barW = Math.min(34, (groupSlot * 0.7) / Math.max(1, colLevels.length));

      return (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto max-h-[340px]"
          onMouseLeave={() => setHoverText(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = padT + plotH - f * plotH;
            return (
              <g key={f}>
                <line
                  x1={padL}
                  y1={y}
                  x2={W - padR}
                  y2={y}
                  stroke="currentColor"
                  className="text-[#E2DFD7] dark:text-[#262B36]"
                  strokeDasharray="3 3"
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#575B62] dark:fill-[#9CA3AF] text-[11px] font-mono-tabular"
                >
                  {Math.round(f * maxFreq)}
                </text>
              </g>
            );
          })}

          {rowLevels.map((rLabel, rIdx) => {
            const gx = padL + rIdx * groupSlot + groupSlot * 0.15;
            return (
              <g key={rLabel}>
                {colLevels.map((cLabel, cIdx) => {
                  const count = observed[rIdx][cIdx];
                  const bh = (count / maxFreq) * plotH;
                  const bx = gx + cIdx * (barW + 4);
                  const by = padT + plotH - bh;
                  const color =
                    CHART_SERIES_COLORS[cIdx % CHART_SERIES_COLORS.length];
                  return (
                    <rect
                      key={cLabel}
                      x={bx}
                      y={by}
                      width={barW}
                      height={bh}
                      rx={2}
                      fill={color}
                      className="cursor-crosshair hover:opacity-85 transition-opacity"
                      onMouseEnter={() =>
                        setHoverText(
                          `${result.varA}=${rLabel} · ${result.varB}=${cLabel}: Observed = ${count} (Expected = ${formatNum(result.expected[rIdx][cIdx], 1, false)})`
                        )
                      }
                    />
                  );
                })}
                <text
                  x={padL + (rIdx + 0.5) * groupSlot}
                  y={padT + plotH + 22}
                  textAnchor="middle"
                  className="fill-[#111315] dark:fill-[#F3F4F6] text-xs font-medium"
                >
                  {rLabel}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          <g transform={`translate(${padL}, 12)`}>
            {colLevels.map((cLabel, idx) => (
              <g key={cLabel} transform={`translate(${idx * 110}, 0)`}>
                <rect
                  width="10"
                  height="10"
                  rx="2"
                  fill={CHART_SERIES_COLORS[idx % CHART_SERIES_COLORS.length]}
                />
                <text
                  x="15"
                  y="9"
                  className="fill-[#575B62] dark:fill-[#9CA3AF] text-[11px]"
                >
                  {cLabel}
                </text>
              </g>
            ))}
          </g>

          <line
            x1={padL}
            y1={padT + plotH}
            x2={W - padR}
            y2={padT + plotH}
            stroke="currentColor"
            className="text-[#111315] dark:text-[#9CA3AF]"
          />
        </svg>
      );
    }

    return null;
  };

  const dec = formatConfig.decimals;
  const thSep = formatConfig.thousandsSep;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#FFFFFF] dark:bg-[#13161B]">
      {/* Sedari Awal: Signifikansi Alpha Selector & Slide-Down APA-7 Edition Documentation */}
      {renderAlphaAndApaBar()}

      {/* Pinned Chart Header & Controls (never clipped on scroll) */}
      <div className="shrink-0 px-5 py-3 border-b border-[#E2DFD7] dark:border-[#262B36] flex flex-wrap items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#13161B]">
        <div>
          <h3 className="font-display text-sm font-semibold text-[#111315] dark:text-[#F3F4F6]">
            {t.tests[config.activeTest]}
          </h3>
          {primaryP !== null && apaBundle && (
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
              {isSig ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] dark:text-[#22C55E]" />
              ) : (
                <MinusCircle className="w-3.5 h-3.5 text-[#B45309] dark:text-[#FBBF24]" />
              )}
              <span
                className={
                  isSig
                    ? 'font-medium text-[#15803D] dark:text-[#4ADE80]'
                    : 'font-medium text-[#B45309] dark:text-[#FBBF24]'
                }
              >
                {apaBundle.verdictLabel}
              </span>
              <span className="text-[#575B62] dark:text-[#9CA3AF]">
                (p ={' '}
                <span className="font-mono-tabular">
                  {formatPValue(primaryP, formatConfig.apaPValues, dec)}
                </span>{' '}
                {isSig ? '<' : '≥'} α = {config.alpha.toFixed(2)})
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {availableCharts.length > 1 && (
            <div className="inline-flex rounded border border-[#E2DFD7] dark:border-[#262B36] bg-[#FAF9F6] dark:bg-[#0B0D10] p-0.5">
              {availableCharts.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() => setSelectedChart(ct)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer whitespace-nowrap ${
                    activeChart === ct
                      ? 'bg-[#FFFFFF] dark:bg-[#13161B] text-[#111315] dark:text-[#F3F4F6] font-medium shadow-xs'
                      : 'text-[#575B62] dark:text-[#9CA3AF]'
                  }`}
                >
                  {ct === 'means_ci'
                    ? language === 'id'
                      ? `Rata-Rata & ${confidencePct}% CI`
                      : `Group Means ± ${confidencePct}% CI`
                    : t.charts[ct]}
                </button>
              ))}
            </div>
          )}

          {(activeChart === 'boxplot' || activeChart === 'means_ci') && (
            <label className="inline-flex items-center gap-1.5 text-xs text-[#575B62] dark:text-[#9CA3AF] cursor-pointer">
              <input
                type="checkbox"
                checked={config.showJitter}
                onChange={(e) => onChangeConfig({ showJitter: e.target.checked })}
                className="accent-[#1D4ED8]"
              />
              <span>{t.rightPane.jitterToggle}</span>
            </label>
          )}

          {activeChart === 'scatter_reg' && (
            <label className="inline-flex items-center gap-1.5 text-xs text-[#575B62] dark:text-[#9CA3AF] cursor-pointer">
              <input
                type="checkbox"
                checked={config.showRegCI}
                onChange={(e) => onChangeConfig({ showRegCI: e.target.checked })}
                className="accent-[#1D4ED8]"
              />
              <span>
                {t.rightPane.regCiToggle} {confidencePct}%
              </span>
            </label>
          )}

          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-[#E2DFD7] dark:border-[#262B36] hover:bg-[#F2F1EC] dark:hover:bg-[#1B1F27] text-[#111315] dark:text-[#F3F4F6] cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t.rightPane.exportSvg}</span>
          </button>
        </div>
      </div>

      {/* Scrollable Chart + APA Tables Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Contextual Clarification for Multi-Variable Descriptives */}
        {result.kind === 'descriptives' && result.rows.length >= 2 && (
          <div className="px-3.5 py-2.5 rounded border border-[#E2DFD7] dark:border-[#262B36] bg-[#FAF9F6] dark:bg-[#0B0D10] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[#575B62] dark:text-[#9CA3AF]">
              {language === 'id'
                ? `Menampilkan distribusi terpisah untuk ${result.rows.length} variabel (bukan uji hubungan). Ingin melihat hubungan antar variabel ini?`
                : `Showing separate distributions for ${result.rows.length} selected variables (not an inter-variable relationship). Want to test relationships among them?`}
            </span>
            {onSelectTest && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectTest('correlation')}
                  className="px-2.5 py-1 rounded border border-[#1D4ED8]/40 dark:border-[#3B82F6]/40 text-[#1D4ED8] dark:text-[#60A5FA] hover:bg-[#1D4ED8]/10 font-medium cursor-pointer whitespace-nowrap"
                >
                  {t.tests.correlation}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTest('regression')}
                  className="px-2.5 py-1 rounded border border-[#E2DFD7] dark:border-[#262B36] text-[#111315] dark:text-[#F3F4F6] hover:bg-[#F2F1EC] dark:hover:bg-[#1B1F27] font-medium cursor-pointer whitespace-nowrap"
                >
                  {t.tests.regression}
                </button>
              </div>
            )}
          </div>
        )}

        {/* SVG Visualization Surface */}
        <div className="border border-[#E2DFD7] dark:border-[#262B36] rounded-md bg-[#FAF9F6]/60 dark:bg-[#0B0D10]/70 p-4">
          {renderSvgChart()}
          <div className="h-5 mt-1 text-xs font-mono-tabular text-[#575B62] dark:text-[#9CA3AF] truncate">
            {hoverText ?? '\u00A0'}
          </div>
        </div>

      {/* APA Statistical Output Tables */}
      <div className="space-y-3 pt-2 border-t border-[#E2DFD7] dark:border-[#262B36]">
        <h4 className="font-display text-xs font-semibold text-[#575B62] dark:text-[#9CA3AF]">
          {t.rightPane.apaOutput}
        </h4>

        <div className="overflow-x-auto">
          {result.kind === 'descriptives' && (
            <table className="w-full text-xs border-collapse font-mono-tabular">
              <thead>
                <tr className="border-y border-[#111315] dark:border-[#9CA3AF] text-left">
                  <th className="py-2 pr-3 font-sans font-semibold">Variable</th>
                  <th className="py-2 px-2 text-right">N</th>
                  <th className="py-2 px-2 text-right">Mean</th>
                  <th className="py-2 px-2 text-right">SD</th>
                  <th className="py-2 px-2 text-right">Median</th>
                  <th className="py-2 px-2 text-right">IQR</th>
                  <th className="py-2 px-2 text-right">Min</th>
                  <th className="py-2 pl-2 text-right">Max</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr
                    key={r.variable}
                    className="border-b border-[#E2DFD7] dark:border-[#262B36]"
                  >
                    <td className="py-2 pr-3 font-sans font-medium">{r.variable}</td>
                    <td className="py-2 px-2 text-right">{r.n}</td>
                    <td className="py-2 px-2 text-right">{formatNum(r.mean, dec, thSep)}</td>
                    <td className="py-2 px-2 text-right">{formatNum(r.sd, dec, thSep)}</td>
                    <td className="py-2 px-2 text-right">{formatNum(r.median, dec, thSep)}</td>
                    <td className="py-2 px-2 text-right">{formatNum(r.iqr, dec, thSep)}</td>
                    <td className="py-2 px-2 text-right">{formatNum(r.min, dec, thSep)}</td>
                    <td className="py-2 pl-2 text-right">{formatNum(r.max, dec, thSep)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {result.kind === 'ttest_ind' && (
            <table className="w-full text-xs border-collapse font-mono-tabular">
              <thead>
                <tr className="border-y border-[#111315] dark:border-[#9CA3AF] text-left">
                  <th className="py-2 pr-3 font-sans font-semibold">Test</th>
                  <th className="py-2 px-2 text-right">
                    Statistic (<i>t</i>)
                  </th>
                  <th className="py-2 px-2 text-right">
                    <i>df</i>
                  </th>
                  <th className="py-2 px-2 text-right">
                    <i>p</i>
                  </th>
                  <th className="py-2 px-2 text-right">Mean Diff</th>
                  <th className="py-2 px-2 text-right">{confidencePct}% CI</th>
                  <th className="py-2 pl-2 text-right">
                    Cohen's <i>d</i>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#E2DFD7] dark:border-[#262B36]">
                  <td className="py-2 pr-3 font-sans font-medium">Student's t</td>
                  <td className="py-2 px-2 text-right">{formatNum(result.studentT, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right">{result.studentDf}</td>
                  <td className="py-2 px-2 text-right font-semibold">
                    {formatPValue(result.studentP, formatConfig.apaPValues, dec)}
                  </td>
                  <td className="py-2 px-2 text-right">{formatNum(result.meanDiff, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right">
                    [{formatNum(result.ciLower, 2, false)}, {formatNum(result.ciUpper, 2, false)}]
                  </td>
                  <td className="py-2 pl-2 text-right">{formatNum(result.cohensD, dec, thSep)}</td>
                </tr>
                <tr className="border-b border-[#E2DFD7] dark:border-[#262B36]">
                  <td className="py-2 pr-3 font-sans font-medium">Welch's t</td>
                  <td className="py-2 px-2 text-right">{formatNum(result.welchT, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right">{formatNum(result.welchDf, 1, false)}</td>
                  <td className="py-2 px-2 text-right font-semibold">
                    {formatPValue(result.welchP, formatConfig.apaPValues, dec)}
                  </td>
                  <td className="py-2 px-2 text-right">{formatNum(result.meanDiff, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right">—</td>
                  <td className="py-2 pl-2 text-right">{formatNum(result.cohensD, dec, thSep)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {result.kind === 'ttest_paired' && (
            <table className="w-full text-xs border-collapse font-mono-tabular">
              <thead>
                <tr className="border-y border-[#111315] dark:border-[#9CA3AF] text-left">
                  <th className="py-2 pr-3 font-sans font-semibold">Pair</th>
                  <th className="py-2 px-2 text-right">N</th>
                  <th className="py-2 px-2 text-right">Mean Diff</th>
                  <th className="py-2 px-2 text-right">SE</th>
                  <th className="py-2 px-2 text-right">t</th>
                  <th className="py-2 px-2 text-right">df</th>
                  <th className="py-2 px-2 text-right">p</th>
                  <th className="py-2 pl-2 text-right">Cohen's d</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#E2DFD7] dark:border-[#262B36]">
                  <td className="py-2 pr-3 font-sans font-medium">
                    {result.varA} − {result.varB}
                  </td>
                  <td className="py-2 px-2 text-right">{result.n}</td>
                  <td className="py-2 px-2 text-right">{formatNum(result.meanDiff, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right">{formatNum(result.seDiff, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right">{formatNum(result.t, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right">{result.df}</td>
                  <td className="py-2 px-2 text-right font-semibold">
                    {formatPValue(result.p, formatConfig.apaPValues, dec)}
                  </td>
                  <td className="py-2 pl-2 text-right">{formatNum(result.cohensD, dec, thSep)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {result.kind === 'anova' && (
            <table className="w-full text-xs border-collapse font-mono-tabular">
              <thead>
                <tr className="border-y border-[#111315] dark:border-[#9CA3AF] text-left">
                  <th className="py-2 pr-3 font-sans font-semibold">Source</th>
                  <th className="py-2 px-2 text-right">SS</th>
                  <th className="py-2 px-2 text-right">df</th>
                  <th className="py-2 px-2 text-right">MS</th>
                  <th className="py-2 px-2 text-right">F</th>
                  <th className="py-2 px-2 text-right">p</th>
                  <th className="py-2 pl-2 text-right">η²</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#E2DFD7] dark:border-[#262B36]">
                  <td className="py-2 pr-3 font-sans font-medium">{result.groupingVar}</td>
                  <td className="py-2 px-2 text-right">{formatNum(result.ssBetween, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right">{result.dfBetween}</td>
                  <td className="py-2 px-2 text-right">{formatNum(result.msBetween, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right">{formatNum(result.f, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right font-semibold">
                    {formatPValue(result.p, formatConfig.apaPValues, dec)}
                  </td>
                  <td className="py-2 pl-2 text-right">{formatNum(result.etaSquared, dec, thSep)}</td>
                </tr>
                <tr className="border-b border-[#E2DFD7] dark:border-[#262B36]">
                  <td className="py-2 pr-3 font-sans text-[#575B62] dark:text-[#9CA3AF]">Residuals</td>
                  <td className="py-2 px-2 text-right">{formatNum(result.ssWithin, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right">{result.dfWithin}</td>
                  <td className="py-2 px-2 text-right">{formatNum(result.msWithin, dec, thSep)}</td>
                  <td className="py-2 px-2 text-right">—</td>
                  <td className="py-2 px-2 text-right">—</td>
                  <td className="py-2 pl-2 text-right">—</td>
                </tr>
              </tbody>
            </table>
          )}

          {result.kind === 'correlation' && (
            <table className="w-full text-xs border-collapse font-mono-tabular">
              <thead>
                <tr className="border-y border-[#111315] dark:border-[#9CA3AF] text-left">
                  <th className="py-2 pr-3 font-sans font-semibold">Variable</th>
                  {result.variables.map((v) => (
                    <th key={v} className="py-2 px-2 text-right font-sans font-semibold">
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.variables.map((rowVar) => (
                  <tr
                    key={rowVar}
                    className="border-b border-[#E2DFD7] dark:border-[#262B36]"
                  >
                    <td className="py-2 pr-3 font-sans font-medium">{rowVar}</td>
                    {result.variables.map((colVar) => {
                      const c = result.matrix[rowVar][colVar];
                      return (
                        <td key={colVar} className="py-2 px-2 text-right">
                          {rowVar === colVar ? (
                            <span className="text-[#575B62] dark:text-[#9CA3AF]">—</span>
                          ) : (
                            <span>
                              {formatNum(c.r, dec, false)}{' '}
                              <span className="text-[10px] text-[#575B62] dark:text-[#9CA3AF]">
                                ({formatPValue(c.p, formatConfig.apaPValues, dec)})
                              </span>
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {result.kind === 'regression' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-6 text-xs font-mono-tabular border-b border-[#E2DFD7] dark:border-[#262B36] pb-2.5">
                <span>R = {formatNum(result.r, dec, false)}</span>
                <span>R² = {formatNum(result.rSquared, dec, false)}</span>
                <span>Adj. R² = {formatNum(result.adjRSquared, dec, false)}</span>
                <span>RMSE = {formatNum(result.rmse, dec, thSep)}</span>
                <span>
                  F({result.dfModel}, {result.dfResidual}) = {formatNum(result.f, dec, false)}, p ={' '}
                  {formatPValue(result.pModel, formatConfig.apaPValues, dec)}
                </span>
              </div>

              <table className="w-full text-xs border-collapse font-mono-tabular">
                <thead>
                  <tr className="border-y border-[#111315] dark:border-[#9CA3AF] text-left">
                    <th className="py-2 pr-3 font-sans font-semibold">Predictor</th>
                    <th className="py-2 px-2 text-right">Estimate (B)</th>
                    <th className="py-2 px-2 text-right">SE</th>
                    <th className="py-2 px-2 text-right">Std. β</th>
                    <th className="py-2 px-2 text-right">t</th>
                    <th className="py-2 pl-2 text-right">p</th>
                  </tr>
                </thead>
                <tbody>
                  {result.coefficients.map((c) => (
                    <tr
                      key={c.term}
                      className="border-b border-[#E2DFD7] dark:border-[#262B36]"
                    >
                      <td className="py-2 pr-3 font-sans font-medium">{c.term}</td>
                      <td className="py-2 px-2 text-right">{formatNum(c.b, dec, thSep)}</td>
                      <td className="py-2 px-2 text-right">{formatNum(c.se, dec, thSep)}</td>
                      <td className="py-2 px-2 text-right">
                        {c.beta === null ? '—' : formatNum(c.beta, dec, false)}
                      </td>
                      <td className="py-2 px-2 text-right">{formatNum(c.t, dec, false)}</td>
                      <td className="py-2 pl-2 text-right font-semibold">
                        {formatPValue(c.p, formatConfig.apaPValues, dec)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.kind === 'chisquare' && (
            <table className="w-full text-xs border-collapse font-mono-tabular">
              <thead>
                <tr className="border-y border-[#111315] dark:border-[#9CA3AF] text-left">
                  <th className="py-2 pr-3 font-sans font-semibold">
                    {result.varA} \ {result.varB}
                  </th>
                  {result.colLevels.map((c) => (
                    <th key={c} className="py-2 px-2 text-right font-sans font-semibold">
                      {c}
                    </th>
                  ))}
                  <th className="py-2 pl-2 text-right font-sans font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {result.rowLevels.map((r, i) => (
                  <tr
                    key={r}
                    className="border-b border-[#E2DFD7] dark:border-[#262B36]"
                  >
                    <td className="py-2 pr-3 font-sans font-medium">{r}</td>
                    {result.colLevels.map((c, j) => (
                      <td key={c} className="py-2 px-2 text-right">
                        {result.observed[i][j]}
                      </td>
                    ))}
                    <td className="py-2 pl-2 text-right font-semibold">
                      {result.rowTotals[i]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Strength of Relationship & Hypothesis Decision Table (for 2+ Variables / Model) */}
      {apaBundle && apaBundle.relationshipRows.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-[#E2DFD7] dark:border-[#262B36]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-display text-xs font-semibold text-[#575B62] dark:text-[#9CA3AF]">
              {t.rightPane.strengthOutput}
            </h4>
            <span className="text-[11px] font-mono-tabular text-[#575B62] dark:text-[#9CA3AF]">
              α = {config.alpha.toFixed(2)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse font-mono-tabular">
              <thead>
                <tr className="border-y border-[#111315] dark:border-[#9CA3AF] text-left">
                  <th className="py-2 pr-3 font-sans font-semibold">{t.apaGuide.pairCol}</th>
                  <th className="py-2 px-2 font-sans font-semibold">{t.apaGuide.metricCol}</th>
                  <th className="py-2 px-2 font-sans font-semibold">{t.apaGuide.strengthCol}</th>
                  <th className="py-2 px-2 text-right font-sans font-semibold">
                    <i>p</i>
                  </th>
                  <th className="py-2 pl-2 text-right font-sans font-semibold">
                    {t.apaGuide.decisionCol}
                  </th>
                </tr>
              </thead>
              <tbody>
                {apaBundle.relationshipRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[#E2DFD7] dark:border-[#262B36]"
                  >
                    <td className="py-2 pr-3 font-sans font-medium text-[#111315] dark:text-[#F3F4F6]">
                      {row.pairOrFactor}
                    </td>
                    <td className="py-2 px-2 text-[#111315] dark:text-[#E5E7EB]">
                      <span className="font-sans text-[11px] text-[#575B62] dark:text-[#9CA3AF] mr-1.5">
                        {row.metricLabel}:
                      </span>
                      {row.metricValue}
                    </td>
                    <td className="py-2 px-2 font-sans text-[#111315] dark:text-[#E5E7EB]">
                      {row.strengthTier}
                    </td>
                    <td className="py-2 px-2 text-right font-semibold">{row.pValue}</td>
                    <td
                      className={`py-2 pl-2 text-right font-sans font-semibold whitespace-nowrap ${
                        row.decision === 'rejected'
                          ? 'text-[#15803D] dark:text-[#4ADE80]'
                          : 'text-[#B45309] dark:text-[#FBBF24]'
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

      {/* Plain-Language Research Interpretation (up to H0 Rejected / Failed to Reject) */}
      <div className="pt-2 border-t border-[#E2DFD7] dark:border-[#262B36] space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-display text-xs font-semibold text-[#575B62] dark:text-[#9CA3AF]">
            {t.rightPane.interpretation}
          </h4>
          {apaBundle &&
            apaBundle.decisionVerdict !== 'descriptive' &&
            apaBundle.verdictLabel && (
              <span
                className={`text-xs font-semibold ${
                  apaBundle.decisionVerdict === 'rejected'
                    ? 'text-[#15803D] dark:text-[#4ADE80]'
                    : 'text-[#B45309] dark:text-[#FBBF24]'
                }`}
              >
                {apaBundle.verdictLabel}
              </span>
            )}
        </div>
        <p className="text-[13px] leading-relaxed text-[#111315] dark:text-[#E5E7EB]">
          {apaBundle?.researchInterpretation}
        </p>
      </div>
      </div>
    </div>
  );
};
