import { formatNum, formatPValue, normalPdf, tCritical } from '../engine/statMath';
import type {
  AnalysisConfig,
  ChartSubType,
  FormatConfig,
  Language,
  StatResult,
} from '../types/stats';

const SERIES_COLORS = [
  '#334155',
  '#5B7083',
  '#4A655D',
  '#736B60',
  '#475569',
  '#6B7280',
];

function escXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getAvailableChartsForResult(result: StatResult): ChartSubType[] {
  switch (result.kind) {
    case 'descriptives':
      return ['histogram', 'boxplot'];
    case 'ttest_ind':
    case 'ttest_paired':
    case 'anova':
      return ['means_ci', 'boxplot'];
    case 'correlation':
      return ['corr_heatmap'];
    case 'regression':
      return ['scatter_reg', 'histogram'];
    case 'chisquare':
      return ['contingency_bar'];
    default:
      return [];
  }
}

export function buildChartSvgString(
  result: StatResult,
  chartType: ChartSubType,
  config: AnalysisConfig,
  formatConfig: FormatConfig,
  language: Language
): { svg: string; width: number; height: number } | null {
  if (result.kind === 'error') return null;

  const fontSans = 'Public Sans, system-ui, -apple-system, sans-serif';
  const fontMono = 'IBM Plex Mono, ui-monospace, monospace';

  // 1. HISTOGRAM + NORMAL CURVE (Descriptives or Regression Residuals + Y + active Predictors)
  if (
    chartType === 'histogram' &&
    (result.kind === 'descriptives' || result.kind === 'regression')
  ) {
    const panels =
      result.kind === 'descriptives'
        ? result.rows.map((r, idx) => ({
            label: r.variable,
            vals: r.values,
            color: SERIES_COLORS[idx % SERIES_COLORS.length],
          }))
        : [
            {
              label:
                language === 'id'
                  ? `Residual (${result.dependentVar} ~ ${result.independentVars.join(' + ')})`
                  : `Residuals (${result.dependentVar} ~ ${result.independentVars.join(' + ')})`,
              vals: result.points.map((p) => p.residual),
              color: '#475569',
            },
            {
              label: `${result.dependentVar} (Y)`,
              vals: result.points.map((p) => p.y),
              color: SERIES_COLORS[0],
            },
            ...result.predictorSeries.map((s, idx) => ({
              label: `${s.predictor} (X)`,
              vals: s.points.map((p) => p.x),
              color: SERIES_COLORS[(idx + 1) % SERIES_COLORS.length],
            })),
          ];

    const validPanels = panels.filter((p) => p.vals.length > 0);
    if (validPanels.length === 0) return null;

    const cols = validPanels.length === 1 ? 1 : 2;
    const rowsCount = Math.ceil(validPanels.length / cols);
    const cellW = validPanels.length === 1 ? 720 : 370;
    const cellH = validPanels.length === 1 ? 310 : 230;
    const totalW = cols * cellW;
    const totalH = rowsCount * cellH;

    const innerParts: string[] = [];
    validPanels.forEach((panel, idx) => {
      const colIdx = idx % cols;
      const rowIdx = Math.floor(idx / cols);
      const ox = colIdx * cellW;
      const oy = rowIdx * cellH;

      const pL = 52;
      const pR = 20;
      const pT = 22;
      const pB = 46;
      const innerW = cellW - pL - pR;
      const innerH = cellH - pT - pB;

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

      let g = `<g transform="translate(${ox}, ${oy})">`;
      if (validPanels.length > 1) {
        g += `<rect x="4" y="4" width="${cellW - 8}" height="${cellH - 8}" rx="4" fill="#FFFFFF" stroke="#E2E2DC" />`;
      }

      for (const f of [0, 0.25, 0.5, 0.75, 1]) {
        const y = pT + innerH - f * innerH;
        g += `<line x1="${pL}" y1="${y}" x2="${cellW - pR}" y2="${y}" stroke="#E2E2DC" stroke-dasharray="3 3" />`;
        g += `<text x="${pL - 7}" y="${y + 4}" text-anchor="end" fill="#52525B" font-family="${fontMono}" font-size="10">${Math.round(f * maxCount)}</text>`;
      }

      counts.forEach((c, bIdx) => {
        const bw = innerW / bins;
        const x = pL + bIdx * bw + 2;
        const bh = (c / maxCount) * innerH;
        const y = pT + innerH - bh;
        g += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(4, bw - 4).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="${panel.color}" fill-opacity="0.82" />`;
      });

      const curvePts: string[] = [];
      for (let i = 0; i <= 50; i++) {
        const xVal = minV + (i / 50) * span;
        const density = normalPdf(xVal, meanVal, sdVal || 1);
        const expectedCount = density * vals.length * binWidth;
        const px = pL + (i / 50) * innerW;
        const py = pT + innerH - Math.min(1.15, expectedCount / maxCount) * innerH;
        curvePts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
      }
      g += `<polyline fill="none" stroke="#18181B" stroke-width="1.9" points="${curvePts.join(' ')}" />`;
      g += `<line x1="${pL}" y1="${pT + innerH}" x2="${cellW - pR}" y2="${pT + innerH}" stroke="#18181B" />`;
      g += `<text x="${pL}" y="${pT + innerH + 16}" fill="#52525B" font-family="${fontMono}" font-size="10">${formatNum(minV, formatConfig.decimals, false)}</text>`;
      g += `<text x="${cellW - pR}" y="${pT + innerH + 16}" text-anchor="end" fill="#52525B" font-family="${fontMono}" font-size="10">${formatNum(maxV, formatConfig.decimals, false)}</text>`;
      g += `<text x="${pL + innerW / 2}" y="${pT + innerH + 33}" text-anchor="middle" fill="#18181B" font-family="${fontSans}" font-size="11" font-weight="600">${escXml(panel.label)} (M = ${formatNum(meanVal, 2, false)}, SD = ${formatNum(sdVal, 2, false)})</text>`;
      g += '</g>';
      innerParts.push(g);
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}"><rect width="${totalW}" height="${totalH}" fill="#FFFFFF" />${innerParts.join('')}</svg>`;
    return { svg, width: totalW, height: totalH };
  }

  // 2. BOXPLOT OR MEANS +/- CI
  if (
    (chartType === 'boxplot' || chartType === 'means_ci') &&
    (result.kind === 'descriptives' ||
      result.kind === 'ttest_ind' ||
      result.kind === 'ttest_paired' ||
      result.kind === 'anova')
  ) {
    const W = 720;
    const H = 310;
    const padL = 62;
    const padR = 24;
    const padT = 24;
    const padB = 48;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

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

    if (series.length === 0) return null;
    const allVals = series.flatMap((s) => [s.min, s.max, s.ciLower, s.ciUpper]);
    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const padSpan = (rawMax - rawMin || 1) * 0.12;
    const yMin = rawMin - padSpan;
    const yMax = rawMax + padSpan;
    const yToPx = (v: number) => padT + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
    const slotW = plotW / Math.max(1, series.length);

    let body = '';
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const val = yMin + f * (yMax - yMin);
      const y = yToPx(val);
      body += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E2DFD7" stroke-dasharray="3 3" />`;
      body += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" fill="#575B62" font-family="${fontMono}" font-size="11">${formatNum(val, 1, false)}</text>`;
    }

    if (chartType === 'means_ci' && series.length > 1) {
      const linePts = series
        .map((s, idx) => `${(padL + slotW * (idx + 0.5)).toFixed(1)},${yToPx(s.mean).toFixed(1)}`)
        .join(' ');
      body += `<polyline fill="none" stroke="#475569" stroke-width="1.75" stroke-opacity="0.65" points="${linePts}" />`;
    }

    series.forEach((s, idx) => {
      const cx = padL + slotW * (idx + 0.5);
      const color = SERIES_COLORS[idx % SERIES_COLORS.length];
      const boxW = Math.min(54, slotW * 0.44);

      if (config.showJitter) {
        s.values.forEach((v, vIdx) => {
          const jitter = ((vIdx % 7) - 3) * (boxW * 0.12);
          body += `<circle cx="${(cx + jitter).toFixed(1)}" cy="${yToPx(v).toFixed(1)}" r="2.6" fill="${color}" fill-opacity="0.35" />`;
        });
      }

      if (chartType === 'boxplot') {
        body += `<line x1="${cx}" y1="${yToPx(s.max)}" x2="${cx}" y2="${yToPx(s.min)}" stroke="${color}" stroke-width="1.5" />`;
        body += `<line x1="${cx - boxW * 0.28}" y1="${yToPx(s.max)}" x2="${cx + boxW * 0.28}" y2="${yToPx(s.max)}" stroke="${color}" stroke-width="1.5" />`;
        body += `<line x1="${cx - boxW * 0.28}" y1="${yToPx(s.min)}" x2="${cx + boxW * 0.28}" y2="${yToPx(s.min)}" stroke="${color}" stroke-width="1.5" />`;
        body += `<rect x="${cx - boxW / 2}" y="${yToPx(s.q3)}" width="${boxW}" height="${Math.max(2, yToPx(s.q1) - yToPx(s.q3))}" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="1.8" rx="2" />`;
        body += `<line x1="${cx - boxW / 2}" y1="${yToPx(s.median)}" x2="${cx + boxW / 2}" y2="${yToPx(s.median)}" stroke="${color}" stroke-width="2.6" />`;
      } else {
        body += `<line x1="${cx}" y1="${yToPx(s.ciUpper)}" x2="${cx}" y2="${yToPx(s.ciLower)}" stroke="${color}" stroke-width="2" />`;
        body += `<line x1="${cx - 10}" y1="${yToPx(s.ciUpper)}" x2="${cx + 10}" y2="${yToPx(s.ciUpper)}" stroke="${color}" stroke-width="2" />`;
        body += `<line x1="${cx - 10}" y1="${yToPx(s.ciLower)}" x2="${cx + 10}" y2="${yToPx(s.ciLower)}" stroke="${color}" stroke-width="2" />`;
        body += `<circle cx="${cx}" cy="${yToPx(s.mean)}" r="5.5" fill="${color}" stroke="#FFFFFF" stroke-width="1.5" />`;
      }
      body += `<text x="${cx}" y="${padT + plotH + 22}" text-anchor="middle" fill="#111315" font-family="${fontSans}" font-size="12" font-weight="600">${escXml(s.label)}</text>`;
    });

    body += `<line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="#111315" />`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#FFFFFF" />${body}</svg>`;
    return { svg, width: W, height: H };
  }

  // 3. SCATTERPLOT & OLS REGRESSION LINE
  if (chartType === 'scatter_reg' && result.kind === 'regression') {
    const seriesList = result.predictorSeries;
    if (seriesList.length === 0) return null;

    const cols = seriesList.length === 1 ? 1 : 2;
    const rowsCount = Math.ceil(seriesList.length / cols);
    const cellW = seriesList.length === 1 ? 720 : 370;
    const cellH = seriesList.length === 1 ? 310 : 230;
    const totalW = cols * cellW;
    const totalH = rowsCount * cellH;

    const innerParts: string[] = [];
    seriesList.forEach((item, idx) => {
      const pts = item.points;
      if (pts.length === 0) return;

      const colIdx = idx % cols;
      const rowIdx = Math.floor(idx / cols);
      const ox = colIdx * cellW;
      const oy = rowIdx * cellH;

      const pL = 52;
      const pR = 20;
      const pT = 22;
      const pB = 46;
      const innerW = cellW - pL - pR;
      const innerH = cellH - pT - pB;

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
      const color = SERIES_COLORS[idx % SERIES_COLORS.length];

      let g = `<g transform="translate(${ox}, ${oy})">`;
      if (seriesList.length > 1) {
        g += `<rect x="4" y="4" width="${cellW - 8}" height="${cellH - 8}" rx="4" fill="#FFFFFF" stroke="#E2DFD7" />`;
      }

      for (const f of [0, 0.25, 0.5, 0.75, 1]) {
        const val = y0 + f * (y1 - y0);
        const y = yToPx(val);
        g += `<line x1="${pL}" y1="${y}" x2="${cellW - pR}" y2="${y}" stroke="#E2DFD7" stroke-dasharray="3 3" />`;
        g += `<text x="${pL - 7}" y="${y + 4}" text-anchor="end" fill="#575B62" font-family="${fontMono}" font-size="10">${formatNum(val, 1, false)}</text>`;
      }

      if (config.showRegCI) {
        const bandOffset = result.rmse * 1.96 * 0.35;
        const bandPoly = `${xToPx(minX)},${yToPx(lineY0 + bandOffset)} ${xToPx(maxX)},${yToPx(lineY1 + bandOffset)} ${xToPx(maxX)},${yToPx(lineY1 - bandOffset)} ${xToPx(minX)},${yToPx(lineY0 - bandOffset)}`;
        g += `<polygon points="${bandPoly}" fill="${color}" fill-opacity="0.12" />`;
      }

      g += `<line x1="${xToPx(minX)}" y1="${yToPx(lineY0)}" x2="${xToPx(maxX)}" y2="${yToPx(lineY1)}" stroke="${color}" stroke-width="2.2" />`;

      for (const p of pts) {
        g += `<circle cx="${xToPx(p.x).toFixed(1)}" cy="${yToPx(p.y).toFixed(1)}" r="3.8" fill="${color}" stroke="#FFFFFF" stroke-width="1.1" />`;
      }

      g += `<line x1="${pL}" y1="${pT + innerH}" x2="${cellW - pR}" y2="${pT + innerH}" stroke="#111315" />`;
      g += `<text x="${pL}" y="${pT + innerH + 16}" fill="#575B62" font-family="${fontMono}" font-size="10">${formatNum(minX, 1, false)}</text>`;
      g += `<text x="${cellW - pR}" y="${pT + innerH + 16}" text-anchor="end" fill="#575B62" font-family="${fontMono}" font-size="10">${formatNum(maxX, 1, false)}</text>`;
      g += `<text x="${pL + innerW / 2}" y="${pT + innerH + 34}" text-anchor="middle" fill="#111315" font-family="${fontSans}" font-size="11" font-weight="600">${escXml(item.predictor)} → ${escXml(result.dependentVar)} (B = ${formatNum(item.coef.b, formatConfig.decimals, false)}, p = ${formatPValue(item.coef.p, formatConfig.apaPValues, formatConfig.decimals)})</text>`;
      g += '</g>';
      innerParts.push(g);
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}"><rect width="${totalW}" height="${totalH}" fill="#FFFFFF" />${innerParts.join('')}</svg>`;
    return { svg, width: totalW, height: totalH };
  }

  // 4. CORRELATION HEATMAP
  if (chartType === 'corr_heatmap' && result.kind === 'correlation') {
    const vars = result.variables;
    const n = vars.length;
    const W = 720;
    const H = 310;
    const padL = 62;
    const padT = 20;
    const cellSize = Math.min(58, Math.floor(Math.min(W - 200, H - 70) / Math.max(1, n)));
    const startX = padL + 100;
    const startY = padT + 10;

    let body = '';
    vars.forEach((rowVar, rIdx) => {
      body += `<text x="${startX - 10}" y="${startY + rIdx * cellSize + cellSize / 2 + 4}" text-anchor="end" fill="#111315" font-family="${fontSans}" font-size="11" font-weight="600">${escXml(rowVar)}</text>`;
      vars.forEach((colVar, cIdx) => {
        const cell = result.matrix[rowVar][colVar];
        const absR = Math.abs(cell.r);
        const bg =
          cell.r >= 0
            ? `rgba(51, 65, 85, ${0.10 + absR * 0.72})`
            : `rgba(120, 96, 86, ${0.10 + absR * 0.72})`;
        const textFill = absR > 0.52 ? '#FFFFFF' : '#18181B';
        const rx = startX + cIdx * cellSize;
        const ry = startY + rIdx * cellSize;
        body += `<rect x="${rx}" y="${ry}" width="${cellSize - 2}" height="${cellSize - 2}" rx="3" fill="${bg}" />`;
        body += `<text x="${rx + (cellSize - 2) / 2}" y="${ry + (cellSize - 2) / 2 + 4}" text-anchor="middle" fill="${textFill}" font-family="${fontMono}" font-size="11" font-weight="600">${formatNum(cell.r, 2, false)}</text>`;
      });
      const shortLabel = rowVar.length > 11 ? `${rowVar.slice(0, 10)}…` : rowVar;
      body += `<text x="${startX + rIdx * cellSize + cellSize / 2}" y="${startY + n * cellSize + 18}" text-anchor="middle" fill="#575B62" font-family="${fontSans}" font-size="10" font-weight="600">${escXml(shortLabel)}</text>`;
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#FFFFFF" />${body}</svg>`;
    return { svg, width: W, height: H };
  }

  // 5. CONTINGENCY BAR CHART
  if (chartType === 'contingency_bar' && result.kind === 'chisquare') {
    const W = 720;
    const H = 310;
    const padL = 62;
    const padR = 24;
    const padT = 30;
    const padB = 46;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const { rowLevels, colLevels, observed } = result;
    const maxFreq = Math.max(...observed.flat(), 1);
    const groupSlot = plotW / Math.max(1, rowLevels.length);
    const barW = Math.min(34, (groupSlot * 0.7) / Math.max(1, colLevels.length));

    let body = '';
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const y = padT + plotH - f * plotH;
      body += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E2DFD7" stroke-dasharray="3 3" />`;
      body += `<text x="${padL - 8}" y="${y + 4}" text-anchor="end" fill="#575B62" font-family="${fontMono}" font-size="11">${Math.round(f * maxFreq)}</text>`;
    }

    rowLevels.forEach((rLabel, rIdx) => {
      const gx = padL + rIdx * groupSlot + groupSlot * 0.15;
      colLevels.forEach((_cLabel, cIdx) => {
        const count = observed[rIdx][cIdx];
        const bh = (count / maxFreq) * plotH;
        const bx = gx + cIdx * (barW + 4);
        const by = padT + plotH - bh;
        const color = SERIES_COLORS[cIdx % SERIES_COLORS.length];
        body += `<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="2" fill="${color}" />`;
      });
      body += `<text x="${padL + (rIdx + 0.5) * groupSlot}" y="${padT + plotH + 22}" text-anchor="middle" fill="#111315" font-family="${fontSans}" font-size="12" font-weight="600">${escXml(rLabel)}</text>`;
    });

    colLevels.forEach((cLabel, idx) => {
      const lx = padL + idx * 115;
      body += `<rect x="${lx}" y="10" width="10" height="10" rx="2" fill="${SERIES_COLORS[idx % SERIES_COLORS.length]}" />`;
      body += `<text x="${lx + 15}" y="19" fill="#575B62" font-family="${fontSans}" font-size="11">${escXml(cLabel)}</text>`;
    });

    body += `<line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="#111315" />`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#FFFFFF" />${body}</svg>`;
    return { svg, width: W, height: H };
  }

  return null;
}

export async function svgStringToPngBytes(
  svgString: string,
  width: number,
  height: number
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  return new Promise((resolve) => {
    try {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const buf = await blob.arrayBuffer();
          resolve({ bytes: new Uint8Array(buf), width, height });
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    } catch {
      resolve(null);
    }
  });
}
