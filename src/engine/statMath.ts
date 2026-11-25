import type {
  AnalysisConfig,
  AnovaResult,
  CellValue,
  ChiSquareResult,
  ColumnDef,
  CorrelationResult,
  DataRow,
  Dataset,
  DescriptiveStatRow,
  DescriptivesResult,
  GroupSummary,
  MeasurementScale,
  RegressionCoefRow,
  RegressionResult,
  StatResult,
  TransformTargetMode,
  TransformType,
  TTestIndResult,
  TTestPairedResult,
} from '../types/stats';

// Lanczos approximation for ln(Gamma(z))
function logGamma(z: number): number {
  const g = 7;
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = p[0];
  for (let i = 1; i < g + 2; i++) {
    x += p[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a: number, b: number, x: number): number {
  const MAXIT = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-30;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

// Regularized incomplete beta I_x(a, b)
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betacf(a, b, x)) / a;
  }
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

// Regularized upper incomplete gamma Q(a, x)
function gammq(a: number, x: number): number {
  if (x < 0 || a <= 0) return 1;
  if (x === 0) return 1;
  if (x < a + 1) {
    // Series representation for P(a, x)
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= 200; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 3e-12) break;
    }
    const p = sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
    return Math.max(0, Math.min(1, 1 - p));
  }
  // Continued fraction for Q(a, x)
  const FPMIN = 1e-30;
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return Math.max(0, Math.min(1, Math.exp(-x + a * Math.log(x) - logGamma(a)) * h));
}

export function tTwoTailedP(t: number, df: number): number {
  if (!Number.isFinite(t) || df <= 0) return 1;
  const x = df / (df + t * t);
  return Math.max(0, Math.min(1, betai(df / 2, 0.5, x)));
}

export function fUpperP(f: number, df1: number, df2: number): number {
  if (!Number.isFinite(f) || f <= 0 || df1 <= 0 || df2 <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return Math.max(0, Math.min(1, betai(df2 / 2, df1 / 2, x)));
}

export function chiSquareUpperP(chi2: number, df: number): number {
  if (!Number.isFinite(chi2) || chi2 <= 0 || df <= 0) return 1;
  return gammq(df / 2, chi2 / 2);
}

// Inverse Student's t for two-tailed alpha (e.g. 0.01 -> 99% CI, 0.05 -> 95% CI, 0.10 -> 90% CI) using bisection
export function tCritical(df: number, alpha = 0.05): number {
  const safeAlpha = alpha > 0 && alpha < 1 ? alpha : 0.05;
  if (df <= 0) {
    if (safeAlpha <= 0.011) return 2.5758;
    if (safeAlpha >= 0.099) return 1.6449;
    return 1.96;
  }
  let lo = 0;
  let hi = 20;
  if (df < 2) hi = 120;
  else if (safeAlpha <= 0.01) hi = 40;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (tTwoTailedP(mid, df) > safeAlpha) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

export function tCritical95(df: number): number {
  return tCritical(df, 0.05);
}

export function normalPdf(x: number, mean: number, sd: number): number {
  if (sd <= 0) return 0;
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

export function toNumeric(val: CellValue): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const trimmed = String(val).trim();
  if (!trimmed) return null;
  const num = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(num) ? num : null;
}

export function extractNumericValues(rows: DataRow[], colKey: string): number[] {
  const nums: number[] = [];
  for (const r of rows) {
    const n = toNumeric(r[colKey]);
    if (n !== null) nums.push(n);
  }
  return nums;
}

export function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function sampleVariance(arr: number[], m?: number): number {
  if (arr.length < 2) return 0;
  const avg = m ?? mean(arr);
  let ss = 0;
  for (const v of arr) {
    const d = v - avg;
    ss += d * d;
  }
  return ss / (arr.length - 1);
}

export function computeDescriptiveRow(
  rows: DataRow[],
  colKey: string,
  alpha = 0.05
): DescriptiveStatRow {
  const values = extractNumericValues(rows, colKey);
  const n = values.length;
  const missing = rows.length - n;
  if (n === 0) {
    return {
      variable: colKey,
      n: 0,
      missing,
      mean: 0,
      sd: 0,
      variance: 0,
      median: 0,
      iqr: 0,
      q1: 0,
      q3: 0,
      min: 0,
      max: 0,
      skewness: 0,
      kurtosis: 0,
      ciLower: 0,
      ciUpper: 0,
      values: [],
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const m = mean(values);
  const v = sampleVariance(values, m);
  const sd = Math.sqrt(v);
  const q1 = quantile(sorted, 0.25);
  const med = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const se = sd / Math.sqrt(n);
  const tCrit = n > 1 ? tCritical(n - 1, alpha) : 0;

  let skewness = 0;
  let kurtosis = 0;
  if (n >= 3 && sd > 0) {
    const m3 = values.reduce((acc, x) => acc + Math.pow((x - m) / sd, 3), 0);
    skewness = (n / ((n - 1) * (n - 2))) * m3;
  }
  if (n >= 4 && sd > 0) {
    const m4 = values.reduce((acc, x) => acc + Math.pow((x - m) / sd, 4), 0);
    kurtosis =
      ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4 -
      (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  }

  return {
    variable: colKey,
    n,
    missing,
    mean: m,
    sd,
    variance: v,
    median: med,
    iqr: q3 - q1,
    q1,
    q3,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    skewness,
    kurtosis,
    ciLower: m - tCrit * se,
    ciUpper: m + tCrit * se,
    values,
  };
}

function summarizeGroup(group: string, values: number[], alpha = 0.05): GroupSummary {
  const sorted = [...values].sort((a, b) => a - b);
  const n = values.length;
  const m = mean(values);
  const sd = Math.sqrt(sampleVariance(values, m));
  const se = n > 0 ? sd / Math.sqrt(n) : 0;
  const tCrit = n > 1 ? tCritical(n - 1, alpha) : 0;
  return {
    group,
    n,
    mean: m,
    sd,
    se,
    ciLower: m - tCrit * se,
    ciUpper: m + tCrit * se,
    min: sorted[0] ?? 0,
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1] ?? 0,
    values,
  };
}

function computeDescriptives(dataset: Dataset, config: AnalysisConfig): StatResult {
  const numericCols = dataset.columns.filter((c) => c.scale !== 'nominal').map((c) => c.key);
  const activeVars = config.dependentVars.filter((v) => numericCols.includes(v));
  if (activeVars.length === 0) {
    return { kind: 'error', messageKey: 'needNumeric' };
  }
  const rows: DescriptiveStatRow[] = activeVars.map((k) =>
    computeDescriptiveRow(dataset.rows, k, config.alpha)
  );
  return { kind: 'descriptives', rows } satisfies DescriptivesResult;
}

function computeTTestInd(dataset: Dataset, config: AnalysisConfig): StatResult {
  const dep = config.dependentVars[0];
  const grp = config.groupingVar;
  if (!dep || !grp) {
    return { kind: 'error', messageKey: 'needTwoGroups' };
  }
  const buckets = new Map<string, number[]>();
  for (const row of dataset.rows) {
    const gVal = row[grp];
    const yVal = toNumeric(row[dep]);
    if (gVal !== null && gVal !== undefined && String(gVal).trim() !== '' && yVal !== null) {
      const key = String(gVal).trim();
      const arr = buckets.get(key) ?? [];
      arr.push(yVal);
      buckets.set(key, arr);
    }
  }
  const validGroups = Array.from(buckets.entries()).filter(([, vals]) => vals.length >= 2);
  if (validGroups.length !== 2) {
    return { kind: 'error', messageKey: 'needTwoGroups' };
  }

  const g1 = summarizeGroup(validGroups[0][0], validGroups[0][1], config.alpha);
  const g2 = summarizeGroup(validGroups[1][0], validGroups[1][1], config.alpha);
  const v1 = g1.sd * g1.sd;
  const v2 = g2.sd * g2.sd;
  const n1 = g1.n;
  const n2 = g2.n;

  const meanDiff = g1.mean - g2.mean;
  const pooledVar = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
  const seStudent = Math.sqrt(pooledVar * (1 / n1 + 1 / n2)) || 1e-12;
  const studentDf = n1 + n2 - 2;
  const studentT = meanDiff / seStudent;
  const studentP = tTwoTailedP(studentT, studentDf);

  const seWelch = Math.sqrt(v1 / n1 + v2 / n2) || 1e-12;
  const welchT = meanDiff / seWelch;
  const numDf = Math.pow(v1 / n1 + v2 / n2, 2);
  const denDf = Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1);
  const welchDf = denDf > 0 ? numDf / denDf : studentDf;
  const welchP = tTwoTailedP(welchT, welchDf);

  const tCrit = tCritical(studentDf, config.alpha);
  const cohensD = pooledVar > 0 ? meanDiff / Math.sqrt(pooledVar) : 0;

  // Levene's test (Brown-Forsythe median-centered)
  const dev1 = g1.values.map((x) => Math.abs(x - g1.median));
  const dev2 = g2.values.map((x) => Math.abs(x - g2.median));
  const mDev1 = mean(dev1);
  const mDev2 = mean(dev2);
  const mDevAll = (n1 * mDev1 + n2 * mDev2) / (n1 + n2);
  const ssBetweenLev = n1 * Math.pow(mDev1 - mDevAll, 2) + n2 * Math.pow(mDev2 - mDevAll, 2);
  const ssWithinLev =
    dev1.reduce((a, b) => a + Math.pow(b - mDev1, 2), 0) +
    dev2.reduce((a, b) => a + Math.pow(b - mDev2, 2), 0);
  const leveneF = ssWithinLev > 0 ? ssBetweenLev / (ssWithinLev / (n1 + n2 - 2)) : 0;
  const leveneP = fUpperP(leveneF, 1, n1 + n2 - 2);

  return {
    kind: 'ttest_ind',
    dependentVar: dep,
    groupingVar: grp,
    groups: [g1, g2],
    studentT,
    studentDf,
    studentP,
    welchT,
    welchDf,
    welchP,
    meanDiff,
    seDiff: seStudent,
    ciLower: meanDiff - tCrit * seStudent,
    ciUpper: meanDiff + tCrit * seStudent,
    cohensD,
    leveneF,
    leveneP,
  } satisfies TTestIndResult;
}

function computeTTestPaired(dataset: Dataset, config: AnalysisConfig): StatResult {
  const { pairedVarA, pairedVarB } = config;
  if (!pairedVarA || !pairedVarB || pairedVarA === pairedVarB) {
    return { kind: 'error', messageKey: 'insufficientPairs' };
  }
  const pairs: Array<{ a: number; b: number; diff: number }> = [];
  for (const row of dataset.rows) {
    const a = toNumeric(row[pairedVarA]);
    const b = toNumeric(row[pairedVarB]);
    if (a !== null && b !== null) {
      pairs.push({ a, b, diff: a - b });
    }
  }
  if (pairs.length < 3) {
    return { kind: 'error', messageKey: 'insufficientPairs' };
  }
  const n = pairs.length;
  const arrA = pairs.map((p) => p.a);
  const arrB = pairs.map((p) => p.b);
  const diffs = pairs.map((p) => p.diff);
  const meanA = mean(arrA);
  const sdA = Math.sqrt(sampleVariance(arrA, meanA));
  const meanB = mean(arrB);
  const sdB = Math.sqrt(sampleVariance(arrB, meanB));
  const meanDiff = mean(diffs);
  const sdDiff = Math.sqrt(sampleVariance(diffs, meanDiff));
  const seDiff = sdDiff / Math.sqrt(n) || 1e-12;
  const df = n - 1;
  const t = meanDiff / seDiff;
  const p = tTwoTailedP(t, df);
  const tCrit = tCritical(df, config.alpha);
  const cohensD = sdDiff > 0 ? meanDiff / sdDiff : 0;

  return {
    kind: 'ttest_paired',
    varA: pairedVarA,
    varB: pairedVarB,
    n,
    meanA,
    sdA,
    meanB,
    sdB,
    meanDiff,
    sdDiff,
    seDiff,
    t,
    df,
    p,
    ciLower: meanDiff - tCrit * seDiff,
    ciUpper: meanDiff + tCrit * seDiff,
    cohensD,
    pairs,
  } satisfies TTestPairedResult;
}

function computeAnova(dataset: Dataset, config: AnalysisConfig): StatResult {
  const dep = config.dependentVars[0];
  const grp = config.groupingVar;
  if (!dep || !grp) {
    return { kind: 'error', messageKey: 'needAnovaGroups' };
  }
  const buckets = new Map<string, number[]>();
  for (const row of dataset.rows) {
    const gVal = row[grp];
    const yVal = toNumeric(row[dep]);
    if (gVal !== null && gVal !== undefined && String(gVal).trim() !== '' && yVal !== null) {
      const k = String(gVal).trim();
      const arr = buckets.get(k) ?? [];
      arr.push(yVal);
      buckets.set(k, arr);
    }
  }
  const groups = Array.from(buckets.entries())
    .filter(([, vals]) => vals.length >= 2)
    .map(([g, vals]) => summarizeGroup(g, vals, config.alpha));

  if (groups.length < 2) {
    return { kind: 'error', messageKey: 'needAnovaGroups' };
  }

  const allValues = groups.flatMap((g) => g.values);
  const nTotal = allValues.length;
  const k = groups.length;
  if (nTotal <= k) {
    return { kind: 'error', messageKey: 'needAnovaGroups' };
  }

  const grandMean = mean(allValues);
  const ssBetween = groups.reduce((acc, g) => acc + g.n * Math.pow(g.mean - grandMean, 2), 0);
  const ssWithin = groups.reduce(
    (acc, g) => acc + g.values.reduce((s, x) => s + Math.pow(x - g.mean, 2), 0),
    0
  );
  const ssTotal = ssBetween + ssWithin;
  const dfBetween = k - 1;
  const dfWithin = nTotal - k;
  const dfTotal = nTotal - 1;
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  const f = msWithin > 0 ? msBetween / msWithin : 0;
  const p = fUpperP(f, dfBetween, dfWithin);
  const etaSquared = ssTotal > 0 ? ssBetween / ssTotal : 0;
  const omegaDenom = ssTotal + msWithin;
  const omegaSquared = omegaDenom > 0 ? Math.max(0, (ssBetween - dfBetween * msWithin) / omegaDenom) : 0;

  return {
    kind: 'anova',
    dependentVar: dep,
    groupingVar: grp,
    groups,
    ssBetween,
    dfBetween,
    msBetween,
    ssWithin,
    dfWithin,
    msWithin,
    ssTotal,
    dfTotal,
    f,
    p,
    etaSquared,
    omegaSquared,
  } satisfies AnovaResult;
}

export function rankArray(vals: number[]): number[] {
  const indexed = vals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(vals.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && indexed[j + 1].v === indexed[i].v) {
      j++;
    }
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      ranks[indexed[k].i] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

export function pearsonPair(xs: number[], ys: number[]): { r: number; p: number } {
  const n = xs.length;
  if (n < 3) return { r: 0, p: 1 };
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  if (denom === 0) return { r: 0, p: 1 };
  const r = Math.max(-1, Math.min(1, num / denom));
  if (Math.abs(r) >= 0.9999999) return { r, p: 0 };
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const p = tTwoTailedP(t, n - 2);
  return { r, p };
}

function computeCorrelation(dataset: Dataset, config: AnalysisConfig): StatResult {
  const numericCols = dataset.columns.filter((c) => c.scale !== 'nominal').map((c) => c.key);
  const vars = config.dependentVars.filter((v) => numericCols.includes(v));
  if (vars.length < 2) {
    return { kind: 'error', messageKey: 'needTwoNumeric' };
  }

  const matrix: CorrelationResult['matrix'] = {};
  for (const a of vars) {
    matrix[a] = {};
    for (const b of vars) {
      if (a === b) {
        const n = extractNumericValues(dataset.rows, a).length;
        matrix[a][b] = { r: 1, p: 0, n };
        continue;
      }
      const xs: number[] = [];
      const ys: number[] = [];
      for (const row of dataset.rows) {
        const va = toNumeric(row[a]);
        const vb = toNumeric(row[b]);
        if (va !== null && vb !== null) {
          xs.push(va);
          ys.push(vb);
        }
      }
      if (xs.length < 3) {
        matrix[a][b] = { r: 0, p: 1, n: xs.length };
      } else if (config.corMethod === 'spearman') {
        const rx = rankArray(xs);
        const ry = rankArray(ys);
        const res = pearsonPair(rx, ry);
        matrix[a][b] = { ...res, n: xs.length };
      } else {
        const res = pearsonPair(xs, ys);
        matrix[a][b] = { ...res, n: xs.length };
      }
    }
  }

  return {
    kind: 'correlation',
    method: config.corMethod,
    variables: vars,
    matrix,
  } satisfies CorrelationResult;
}

// Invert small symmetric matrix via Gauss-Jordan elimination
function invertMatrix(m: number[][]): number[][] | null {
  const n = m.length;
  const aug = m.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let maxVal = Math.abs(aug[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > maxVal) {
        maxVal = Math.abs(aug[r][col]);
        pivotRow = r;
      }
    }
    if (maxVal < 1e-11) return null;
    if (pivotRow !== col) {
      const tmp = aug[col];
      aug[col] = aug[pivotRow];
      aug[pivotRow] = tmp;
    }
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) {
      aug[col][j] /= pivot;
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = aug[r][col];
      for (let j = 0; j < 2 * n; j++) {
        aug[r][j] -= factor * aug[col][j];
      }
    }
  }
  return aug.map((row) => row.slice(n));
}

function computeRegression(dataset: Dataset, config: AnalysisConfig): StatResult {
  const numericCols = dataset.columns.filter((c) => c.scale !== 'nominal').map((c) => c.key);
  const dep = config.dependentVars[0];
  const predictors = config.independentVars.filter(
    (p) => p !== dep && numericCols.includes(p)
  );
  if (!dep || !numericCols.includes(dep) || predictors.length === 0) {
    return { kind: 'error', messageKey: 'needPredictor' };
  }

  const cleanRows: Array<{ y: number; xs: number[] }> = [];
  for (const row of dataset.rows) {
    const y = toNumeric(row[dep]);
    if (y === null) continue;
    const xs: number[] = [];
    let valid = true;
    for (const p of predictors) {
      const v = toNumeric(row[p]);
      if (v === null) {
        valid = false;
        break;
      }
      xs.push(v);
    }
    if (valid) cleanRows.push({ y, xs });
  }

  const n = cleanRows.length;
  const k = predictors.length;
  if (n <= k + 1) {
    return { kind: 'error', messageKey: 'needPredictor' };
  }

  // Design matrix X: [1, x1, x2, ...]
  const pCount = k + 1;
  const X = cleanRows.map((r) => [1, ...r.xs]);
  const Y = cleanRows.map((r) => r.y);

  // Compute X^T X and X^T Y
  const XtX: number[][] = Array.from({ length: pCount }, () => new Array<number>(pCount).fill(0));
  const XtY = new Array<number>(pCount).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < pCount; a++) {
      XtY[a] += X[i][a] * Y[i];
      for (let b = 0; b < pCount; b++) {
        XtX[a][b] += X[i][a] * X[i][b];
      }
    }
  }

  const invXtX = invertMatrix(XtX);
  if (!invXtX) {
    return { kind: 'error', messageKey: 'singularMatrix' };
  }

  const betas = new Array<number>(pCount).fill(0);
  for (let a = 0; a < pCount; a++) {
    for (let b = 0; b < pCount; b++) {
      betas[a] += invXtX[a][b] * XtY[b];
    }
  }

  const yMean = mean(Y);
  let ssTotal = 0;
  let ssRes = 0;
  const points: RegressionResult['points'] = [];
  for (let i = 0; i < n; i++) {
    let fitted = 0;
    for (let a = 0; a < pCount; a++) {
      fitted += betas[a] * X[i][a];
    }
    const residual = Y[i] - fitted;
    ssRes += residual * residual;
    ssTotal += (Y[i] - yMean) * (Y[i] - yMean);
    points.push({ x: cleanRows[i].xs[0], y: Y[i], fitted, residual });
  }

  const dfModel = k;
  const dfResidual = n - k - 1;
  const msRes = ssRes / dfResidual;
  const ssReg = Math.max(0, ssTotal - ssRes);
  const rSquared = ssTotal > 0 ? Math.max(0, Math.min(1, ssReg / ssTotal)) : 0;
  const adjRSquared = 1 - ((1 - rSquared) * (n - 1)) / dfResidual;
  const r = Math.sqrt(rSquared);
  const rmse = Math.sqrt(msRes);
  const f = msRes > 0 ? (ssReg / dfModel) / msRes : 0;
  const pModel = fUpperP(f, dfModel, dfResidual);

  const sdY = Math.sqrt(sampleVariance(Y, yMean));
  const coefficients: RegressionCoefRow[] = [];
  for (let a = 0; a < pCount; a++) {
    const se = Math.sqrt(Math.max(0, msRes * invXtX[a][a])) || 1e-12;
    const t = betas[a] / se;
    const p = tTwoTailedP(t, dfResidual);
    let stdBeta: number | null = null;
    if (a > 0 && sdY > 0) {
      const colVals = cleanRows.map((row) => row.xs[a - 1]);
      const sdX = Math.sqrt(sampleVariance(colVals));
      stdBeta = (betas[a] * sdX) / sdY;
    }
    coefficients.push({
      term: a === 0 ? 'Intercept' : predictors[a - 1],
      b: betas[a],
      se,
      beta: stdBeta,
      t,
      p,
    });
  }

  const predictorSeries = predictors.map((pred, predIdx) => ({
    predictor: pred,
    coef: coefficients[predIdx + 1],
    points: cleanRows.map((row, rowIdx) => ({
      x: row.xs[predIdx],
      y: Y[rowIdx],
      fitted: points[rowIdx].fitted,
      residual: points[rowIdx].residual,
    })),
  }));

  return {
    kind: 'regression',
    dependentVar: dep,
    independentVars: predictors,
    n,
    r,
    rSquared,
    adjRSquared,
    rmse,
    f,
    dfModel,
    dfResidual,
    pModel,
    coefficients,
    points,
    predictorSeries,
    primaryPredictor: predictors[0],
  } satisfies RegressionResult;
}

function computeChiSquare(dataset: Dataset, config: AnalysisConfig): StatResult {
  const { categoricalVarA, categoricalVarB } = config;
  if (!categoricalVarA || !categoricalVarB || categoricalVarA === categoricalVarB) {
    return { kind: 'error', messageKey: 'needTwoCategorical' };
  }

  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  const pairs: Array<[string, string]> = [];

  for (const row of dataset.rows) {
    const a = row[categoricalVarA];
    const b = row[categoricalVarB];
    if (
      a !== null &&
      a !== undefined &&
      String(a).trim() !== '' &&
      b !== null &&
      b !== undefined &&
      String(b).trim() !== ''
    ) {
      const sa = String(a).trim();
      const sb = String(b).trim();
      rowSet.add(sa);
      colSet.add(sb);
      pairs.push([sa, sb]);
    }
  }

  const rowLevels = Array.from(rowSet);
  const colLevels = Array.from(colSet);
  if (rowLevels.length < 2 || colLevels.length < 2) {
    return { kind: 'error', messageKey: 'needTwoCategorical' };
  }

  const observed: number[][] = Array.from({ length: rowLevels.length }, () =>
    new Array<number>(colLevels.length).fill(0)
  );
  for (const [a, b] of pairs) {
    observed[rowLevels.indexOf(a)][colLevels.indexOf(b)] += 1;
  }

  const rowTotals = observed.map((r) => r.reduce((acc, v) => acc + v, 0));
  const colTotals = colLevels.map((_, j) => observed.reduce((acc, r) => acc + r[j], 0));
  const grandTotal = rowTotals.reduce((acc, v) => acc + v, 0);
  if (grandTotal === 0) {
    return { kind: 'error', messageKey: 'needTwoCategorical' };
  }

  const expected: number[][] = Array.from({ length: rowLevels.length }, () =>
    new Array<number>(colLevels.length).fill(0)
  );
  let chi2 = 0;
  for (let i = 0; i < rowLevels.length; i++) {
    for (let j = 0; j < colLevels.length; j++) {
      const exp = (rowTotals[i] * colTotals[j]) / grandTotal;
      expected[i][j] = exp;
      if (exp > 0) {
        chi2 += Math.pow(observed[i][j] - exp, 2) / exp;
      }
    }
  }

  const df = (rowLevels.length - 1) * (colLevels.length - 1);
  const p = chiSquareUpperP(chi2, df);
  const minDim = Math.min(rowLevels.length - 1, colLevels.length - 1);
  const cramersV = minDim > 0 ? Math.sqrt(chi2 / (grandTotal * minDim)) : 0;

  return {
    kind: 'chisquare',
    varA: categoricalVarA,
    varB: categoricalVarB,
    rowLevels,
    colLevels,
    observed,
    expected,
    rowTotals,
    colTotals,
    grandTotal,
    chi2,
    df,
    p,
    cramersV,
  } satisfies ChiSquareResult;
}

export function runStatisticalAnalysis(dataset: Dataset, config: AnalysisConfig): StatResult {
  switch (config.activeTest) {
    case 'descriptives':
      return computeDescriptives(dataset, config);
    case 'ttest_ind':
      return computeTTestInd(dataset, config);
    case 'ttest_paired':
      return computeTTestPaired(dataset, config);
    case 'anova':
      return computeAnova(dataset, config);
    case 'correlation':
      return computeCorrelation(dataset, config);
    case 'regression':
      return computeRegression(dataset, config);
    case 'chisquare':
      return computeChiSquare(dataset, config);
  }
}

export function applyColumnTransform(
  dataset: Dataset,
  colKey: string,
  transform: TransformType,
  mode: TransformTargetMode
): Dataset {
  const sourceCol = dataset.columns.find((c) => c.key === colKey);
  if (!sourceCol) return dataset;

  const numericPairs = dataset.rows.map((r, idx) => ({ idx, val: toNumeric(r[colKey]) }));
  const validVals = numericPairs.filter((p): p is { idx: number; val: number } => p.val !== null).map((p) => p.val);
  if (validVals.length === 0) return dataset;

  const avg = mean(validVals);
  const sd = Math.sqrt(sampleVariance(validVals, avg));
  const minVal = Math.min(...validVals);
  const maxVal = Math.max(...validVals);
  const sorted = [...validVals].sort((a, b) => a - b);
  const med = quantile(sorted, 0.5);

  // Precompute ranks for valid indices
  const validIndices = numericPairs.filter((p) => p.val !== null);
  const ranks = rankArray(validIndices.map((p) => p.val as number));
  const rankMap = new Map<number, number>();
  validIndices.forEach((p, i) => rankMap.set(p.idx, ranks[i]));

  const shiftForLog = minVal <= 0 ? Math.abs(minVal) + 1 : 0;

  const transformSuffix: Record<TransformType, string> = {
    zscore: 'Z',
    log10: 'Log10',
    ln: 'Ln',
    sqrt: 'Sqrt',
    minmax: 'Norm',
    rank: 'Rank',
    center: 'Cent',
    median_split: 'MedGrp',
  };

  let targetKey = colKey;
  let newColumns = [...dataset.columns];

  if (mode === 'new_column') {
    const base = `${colKey}_${transformSuffix[transform]}`;
    let candidate = base;
    let counter = 2;
    while (newColumns.some((c) => c.key === candidate)) {
      candidate = `${base}_${counter++}`;
    }
    targetKey = candidate;
    const newScale: MeasurementScale = transform === 'median_split' ? 'nominal' : 'continuous';
    const sourceIdx = newColumns.findIndex((c) => c.key === colKey);
    const newCol: ColumnDef = {
      key: targetKey,
      label: targetKey,
      scale: newScale,
      transformOrigin: colKey,
      transformType: transform,
    };
    newColumns.splice(sourceIdx + 1, 0, newCol);
  } else {
    newColumns = newColumns.map((c) =>
      c.key === colKey
        ? {
            ...c,
            scale: transform === 'median_split' ? 'nominal' : 'continuous',
            transformOrigin: c.transformOrigin ?? colKey,
            transformType: transform,
          }
        : c
    );
  }

  const newRows = dataset.rows.map((row, idx) => {
    const val = toNumeric(row[colKey]);
    let transformed: CellValue = null;
    if (val !== null) {
      switch (transform) {
        case 'zscore':
          transformed = sd > 0 ? Number(((val - avg) / sd).toFixed(4)) : 0;
          break;
        case 'log10':
          transformed = Number(Math.log10(val + shiftForLog).toFixed(4));
          break;
        case 'ln':
          transformed = Number(Math.log(val + shiftForLog).toFixed(4));
          break;
        case 'sqrt': {
          const baseVal = minVal < 0 ? val - minVal : val;
          transformed = Number(Math.sqrt(Math.max(0, baseVal)).toFixed(4));
          break;
        }
        case 'minmax':
          transformed = maxVal > minVal ? Number(((val - minVal) / (maxVal - minVal)).toFixed(4)) : 0;
          break;
        case 'rank':
          transformed = rankMap.get(idx) ?? null;
          break;
        case 'center':
          transformed = Number((val - avg).toFixed(4));
          break;
        case 'median_split':
          transformed = val >= med ? 'High' : 'Low';
          break;
      }
    }
    return {
      ...row,
      [targetKey]: transformed,
    };
  });

  return {
    ...dataset,
    columns: newColumns,
    rows: newRows,
    undoStack: [
      ...dataset.undoStack.slice(-19),
      {
        columns: dataset.columns.map((c) => ({ ...c })),
        rows: dataset.rows.map((r) => ({ ...r })),
        description: `${transform} on ${colKey}`,
      },
    ],
  };
}

export function formatNum(
  val: number,
  decimals: number,
  thousandsSep: boolean
): string {
  if (!Number.isFinite(val)) return '—';
  const fixed = val.toFixed(decimals);
  if (!thousandsSep) return fixed;
  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}

export function formatPValue(p: number, apaFormat: boolean, decimals: number): string {
  if (!Number.isFinite(p)) return '—';
  if (apaFormat && p < 0.001) return '< .001';
  const str = p.toFixed(Math.max(3, decimals));
  return apaFormat ? str.replace(/^0\./, '.') : str;
}

export function parseCsvText(rawText: string, datasetName: string): Dataset | null {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  // Detect delimiter from first line
  const firstLine = lines[0];
  const counts: Array<{ sep: string; count: number }> = [
    { sep: ',', count: (firstLine.match(/,/g) ?? []).length },
    { sep: ';', count: (firstLine.match(/;/g) ?? []).length },
    { sep: '\t', count: (firstLine.match(/\t/g) ?? []).length },
  ];
  counts.sort((a, b) => b.count - a.count);
  const sep = counts[0].count > 0 ? counts[0].sep : ',';

  const splitRow = (line: string): string[] => {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === sep && !inQuotes) {
        out.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    out.push(current.trim());
    return out;
  };

  const rawHeaders = splitRow(lines[0]).map((h, i) => (h ? h.replace(/\s+/g, '_') : `Var_${i + 1}`));
  const uniqueHeaders: string[] = [];
  rawHeaders.forEach((h) => {
    let cand = h;
    let c = 2;
    while (uniqueHeaders.includes(cand)) {
      cand = `${h}_${c++}`;
    }
    uniqueHeaders.push(cand);
  });

  const parsedRows: DataRow[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = splitRow(lines[r]);
    const rowObj: DataRow = {};
    uniqueHeaders.forEach((key, idx) => {
      const raw = cells[idx] ?? '';
      if (raw === '') {
        rowObj[key] = null;
      } else {
        const num = Number(raw.replace(/,/g, ''));
        rowObj[key] = Number.isFinite(num) && raw !== '' ? num : raw;
      }
    });
    parsedRows.push(rowObj);
  }

  const columns: ColumnDef[] = uniqueHeaders.map((key) => {
    const nonNull = parsedRows.map((r) => r[key]).filter((v) => v !== null && v !== '');
    const numericCount = nonNull.filter((v) => typeof v === 'number').length;
    const isMostlyNumeric = nonNull.length > 0 && numericCount / nonNull.length >= 0.8;
    const uniqueVals = new Set(nonNull.map(String)).size;
    let scale: MeasurementScale = 'nominal';
    if (isMostlyNumeric) {
      scale = uniqueVals <= 6 && parsedRows.length >= 12 ? 'ordinal' : 'continuous';
    }
    return { key, label: key, scale };
  });

  return {
    id: `csv_${Date.now()}`,
    name: datasetName || 'Imported CSV Dataset',
    nameId: datasetName || 'Dataset CSV Impor',
    sourceType: 'csv',
    columns,
    rows: parsedRows,
    undoStack: [],
  };
}

export function serializeDatasetToCsv(dataset: Dataset): string {
  const escapeCell = (v: CellValue): string => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = dataset.columns.map((c) => escapeCell(c.label)).join(',');
  const body = dataset.rows
    .map((r) => dataset.columns.map((c) => escapeCell(r[c.key])).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

export function inferDefaultAnalysisForDataset(dataset: Dataset): AnalysisConfig {
  const numericCols = dataset.columns.filter((c) => c.scale !== 'nominal').map((c) => c.key);
  const nominalCols = dataset.columns.filter((c) => c.scale === 'nominal').map((c) => c.key);
  const groupingCol =
    nominalCols.find((k) => {
      const uniq = new Set(dataset.rows.map((r) => r[k]).filter((v) => v !== null && v !== ''));
      return uniq.size >= 2 && uniq.size <= 6;
    }) ?? nominalCols[0] ?? '';

  return {
    activeTest: numericCols.length >= 1 && groupingCol ? 'anova' : 'descriptives',
    dependentVars: numericCols.slice(0, 1),
    groupingVar: groupingCol,
    pairedVarA: numericCols[0] ?? '',
    pairedVarB: numericCols[1] ?? numericCols[0] ?? '',
    independentVars: numericCols.slice(1, 3),
    categoricalVarA: groupingCol,
    categoricalVarB: nominalCols.find((k) => k !== groupingCol) ?? groupingCol,
    corMethod: 'pearson',
    alpha: 0.05,
    showJitter: true,
    showRegCI: true,
  };
}
