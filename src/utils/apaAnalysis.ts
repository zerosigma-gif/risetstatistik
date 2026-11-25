import { formatNum, formatPValue, pearsonPair } from '../engine/statMath';
import type {
  AnalysisConfig,
  Dataset,
  FormatConfig,
  Language,
  StatResult,
} from '../types/stats';

export interface RelationshipStrengthRow {
  id: string;
  pairOrFactor: string;
  metricLabel: string;
  metricValue: string;
  strengthTier: string;
  pValue: string;
  pRaw: number | null;
  decision: 'rejected' | 'fail_to_reject' | 'descriptive';
  decisionLabel: string;
}

export interface StrengthBenchmarkRow {
  range: string;
  label: string;
  isCurrent: boolean;
}

export interface ApaReportBundle {
  confidencePct: number;
  primaryP: number | null;
  isSig: boolean;
  decisionVerdict: 'rejected' | 'fail_to_reject' | 'descriptive';
  verdictLabel: string;
  h0Statement: string;
  h1Statement: string;
  decisionRule: string;
  overallStrengthSummary: string;
  apaSentence: string;
  apaRules: string[];
  benchmarkTitle: string;
  benchmarks: StrengthBenchmarkRow[];
  relationshipRows: RelationshipStrengthRow[];
  researchInterpretation: string;
}

export type StrengthBucket = 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong';

export function classifyCorrelationR(
  r: number,
  lang: Language
): { bucket: StrengthBucket; tier: string; direction: string } {
  const absR = Math.abs(r);
  const direction =
    Math.abs(r) < 0.005
      ? lang === 'id'
        ? 'Netral'
        : 'Neutral'
      : r >= 0
      ? lang === 'id'
        ? 'Positif'
        : 'Positive'
      : lang === 'id'
      ? 'Negatif'
      : 'Negative';

  if (absR < 0.1) {
    return {
      bucket: 'very_weak',
      tier: lang === 'id' ? 'Sangat Lemah / Diabaikan' : 'Very Weak / Negligible',
      direction,
    };
  }
  if (absR < 0.3) {
    return {
      bucket: 'weak',
      tier: lang === 'id' ? `Lemah (${direction})` : `Weak (${direction})`,
      direction,
    };
  }
  if (absR < 0.5) {
    return {
      bucket: 'moderate',
      tier: lang === 'id' ? `Sedang (${direction})` : `Moderate (${direction})`,
      direction,
    };
  }
  if (absR < 0.7) {
    return {
      bucket: 'strong',
      tier: lang === 'id' ? `Kuat (${direction})` : `Strong (${direction})`,
      direction,
    };
  }
  return {
    bucket: 'very_strong',
    tier: lang === 'id' ? `Sangat Kuat (${direction})` : `Very Strong (${direction})`,
    direction,
  };
}

export function classifyCohensD(
  d: number,
  lang: Language
): { bucket: StrengthBucket; tier: string } {
  const absD = Math.abs(d);
  if (absD < 0.2) {
    return {
      bucket: 'very_weak',
      tier: lang === 'id' ? 'Sangat Kecil / Diabaikan' : 'Negligible',
    };
  }
  if (absD < 0.5) {
    return { bucket: 'weak', tier: lang === 'id' ? 'Kecil' : 'Small' };
  }
  if (absD < 0.8) {
    return { bucket: 'moderate', tier: lang === 'id' ? 'Sedang' : 'Medium' };
  }
  return { bucket: 'strong', tier: lang === 'id' ? 'Besar / Kuat' : 'Large' };
}

export function classifyEtaSquared(
  eta2: number,
  lang: Language
): { bucket: StrengthBucket; tier: string } {
  if (eta2 < 0.01) {
    return {
      bucket: 'very_weak',
      tier: lang === 'id' ? 'Sangat Kecil / Diabaikan' : 'Negligible',
    };
  }
  if (eta2 < 0.06) {
    return { bucket: 'weak', tier: lang === 'id' ? 'Kecil' : 'Small' };
  }
  if (eta2 < 0.14) {
    return { bucket: 'moderate', tier: lang === 'id' ? 'Sedang' : 'Medium' };
  }
  return { bucket: 'strong', tier: lang === 'id' ? 'Besar / Kuat' : 'Large' };
}

export function classifyRegressionF2(
  rSquared: number,
  lang: Language
): { f2: number; bucket: StrengthBucket; tier: string } {
  const clamped = Math.min(0.9999, Math.max(0, rSquared));
  const f2 = clamped / (1 - clamped);
  if (f2 < 0.02) {
    return {
      f2,
      bucket: 'very_weak',
      tier: lang === 'id' ? 'Sangat Lemah / Diabaikan' : 'Negligible',
    };
  }
  if (f2 < 0.15) {
    return { f2, bucket: 'weak', tier: lang === 'id' ? 'Kecil / Lemah' : 'Small' };
  }
  if (f2 < 0.35) {
    return { f2, bucket: 'moderate', tier: lang === 'id' ? 'Sedang' : 'Medium' };
  }
  return { f2, bucket: 'strong', tier: lang === 'id' ? 'Besar / Kuat' : 'Large' };
}

export function classifyCramersV(
  v: number,
  minDim: number,
  lang: Language
): { bucket: StrengthBucket; tier: string } {
  const dfStar = Math.max(1, minDim);
  const scale = dfStar === 1 ? [0.1, 0.3, 0.5] : dfStar === 2 ? [0.07, 0.21, 0.35] : [0.06, 0.17, 0.29];
  if (v < scale[0]) {
    return {
      bucket: 'very_weak',
      tier: lang === 'id' ? 'Sangat Lemah / Diabaikan' : 'Negligible',
    };
  }
  if (v < scale[1]) {
    return { bucket: 'weak', tier: lang === 'id' ? 'Lemah' : 'Weak' };
  }
  if (v < scale[2]) {
    return { bucket: 'moderate', tier: lang === 'id' ? 'Sedang' : 'Moderate' };
  }
  return { bucket: 'strong', tier: lang === 'id' ? 'Kuat' : 'Strong' };
}

function decisionForP(
  p: number,
  alpha: number,
  lang: Language
): { decision: 'rejected' | 'fail_to_reject'; label: string } {
  if (p < alpha) {
    return {
      decision: 'rejected',
      label: lang === 'id' ? 'H₀ ditolak' : 'Reject H₀',
    };
  }
  return {
    decision: 'fail_to_reject',
    label: lang === 'id' ? 'H₀ gagal ditolak' : 'Fail to reject H₀',
  };
}

function computePrimaryP(result: StatResult): number | null {
  if (result.kind === 'ttest_ind') return result.studentP;
  if (result.kind === 'ttest_paired') return result.p;
  if (result.kind === 'anova') return result.p;
  if (result.kind === 'regression') return result.pModel;
  if (result.kind === 'chisquare') return result.p;
  if (result.kind === 'correlation') {
    const vars = result.variables;
    let minP: number | null = null;
    for (let i = 0; i < vars.length; i++) {
      for (let j = i + 1; j < vars.length; j++) {
        const p = result.matrix[vars[i]][vars[j]].p;
        if (minP === null || p < minP) minP = p;
      }
    }
    return minP;
  }
  return null;
}

export function buildApaReportBundle(
  result: StatResult,
  dataset: Dataset,
  config: AnalysisConfig,
  formatConfig: FormatConfig,
  lang: Language
): ApaReportBundle | null {
  if (result.kind === 'error') return null;

  const alpha = config.alpha;
  const alphaStr = alpha.toFixed(2);
  const confidencePct = Math.round((1 - alpha) * 100);
  const dec = formatConfig.decimals;
  const pFmt = (p: number) => formatPValue(p, formatConfig.apaPValues, dec);
  const apaNoZero = (val: number) => {
    const s = formatNum(val, dec, false);
    return formatConfig.apaPValues ? s.replace(/^(-?)0\./, '$1.') : s;
  };

  const apaRules: string[] =
    lang === 'id'
      ? [
          'Simbol statistik huruf Latin dicetak miring (N, n, M, SD, t, F, r, R², p, d, B, β); simbol Yunani tegak (α, χ², η², ω², ρ).',
          'Nilai yang tidak dapat melampaui 1 (p, r, R², η²) ditulis tanpa angka nol di depan titik desimal sesuai APA-7 (mis. p = .012, r = .64).',
          'Laporkan nilai p eksak hingga 3 desimal; jika kurang dari .001, tuliskan p < .001.',
          'Tabel APA-7 hanya menggunakan garis horizontal (batas atas, bawah header, dan penutup bawah) tanpa garis vertikal.',
        ]
      : [
          'Italicize Latin statistical symbols (N, n, M, SD, t, F, r, R², p, d, B, β); keep Greek letters upright (α, χ², η², ω², ρ).',
          'Omit leading zeros for bounded statistics ≤ 1 (p, r, R², η²) per APA-7 (e.g., p = .012, r = .64).',
          'Report exact p-values to 3 decimal places; report values below .001 as p < .001.',
          'APA-7 tables use horizontal borders only (top, header divider, bottom rule) with zero vertical gridlines.',
        ];

  const decisionRule =
    lang === 'id'
      ? `Jika p < α (${alphaStr}) maka H₀ ditolak; jika p ≥ α (${alphaStr}) maka H₀ gagal ditolak.`
      : `If p < α (${alphaStr}), reject H₀; if p ≥ α (${alphaStr}), fail to reject H₀.`;

  // 1. DESCRIPTIVES (Purely descriptive univariate statistics — no H0 test, no correlation strength stage)
  if (result.kind === 'descriptives') {
    const decSummaries = result.rows
      .map(
        (r) =>
          `${r.variable} (N = ${r.n}, M = ${formatNum(r.mean, dec, formatConfig.thousandsSep)}, SD = ${formatNum(r.sd, dec, formatConfig.thousandsSep)}, Median = ${formatNum(r.median, dec, formatConfig.thousandsSep)}, IQR = ${formatNum(r.iqr, dec, formatConfig.thousandsSep)}, Min = ${formatNum(r.min, dec, formatConfig.thousandsSep)}, Max = ${formatNum(r.max, dec, formatConfig.thousandsSep)}, ${confidencePct}% CI [${formatNum(r.ciLower, dec, false)}, ${formatNum(r.ciUpper, dec, false)}])`
      )
      .join('; ');

    const apaSentence =
      result.rows.length === 1
        ? lang === 'id'
          ? `Statistik deskriptif untuk ${result.rows[0].variable} (N = ${result.rows[0].n}) menunjukkan rata-rata M = ${formatNum(result.rows[0].mean, dec, formatConfig.thousandsSep)} (SD = ${formatNum(result.rows[0].sd, dec, formatConfig.thousandsSep)}), median ${formatNum(result.rows[0].median, dec, formatConfig.thousandsSep)} (IQR = ${formatNum(result.rows[0].iqr, dec, formatConfig.thousandsSep)}), rentang ${formatNum(result.rows[0].min, dec, formatConfig.thousandsSep)}–${formatNum(result.rows[0].max, dec, formatConfig.thousandsSep)}, serta ${confidencePct}% CI [${formatNum(result.rows[0].ciLower, dec, false)}, ${formatNum(result.rows[0].ciUpper, dec, false)}] pada α = ${alphaStr}.`
          : `Descriptive statistics for ${result.rows[0].variable} (N = ${result.rows[0].n}) showed M = ${formatNum(result.rows[0].mean, dec, formatConfig.thousandsSep)} (SD = ${formatNum(result.rows[0].sd, dec, formatConfig.thousandsSep)}), median ${formatNum(result.rows[0].median, dec, formatConfig.thousandsSep)} (IQR = ${formatNum(result.rows[0].iqr, dec, formatConfig.thousandsSep)}), range ${formatNum(result.rows[0].min, dec, formatConfig.thousandsSep)}–${formatNum(result.rows[0].max, dec, formatConfig.thousandsSep)}, and ${confidencePct}% CI [${formatNum(result.rows[0].ciLower, dec, false)}, ${formatNum(result.rows[0].ciUpper, dec, false)}] at α = ${alphaStr}.`
        : lang === 'id'
        ? `Statistik deskriptif mencakup ${result.rows.length} variabel terpilih: ${decSummaries} (interval kepercayaan ${confidencePct}% pada α = ${alphaStr}).`
        : `Descriptive statistics across ${result.rows.length} selected variables: ${decSummaries} (${confidencePct}% confidence interval at α = ${alphaStr}).`;

    const researchInterpretation =
      result.rows.length === 1
        ? lang === 'id'
          ? `Variabel ${result.rows[0].variable} (N = ${result.rows[0].n}) memiliki nilai rata-rata M = ${formatNum(result.rows[0].mean, dec, true)} (SD = ${formatNum(result.rows[0].sd, dec, true)}) dan median ${formatNum(result.rows[0].median, dec, true)} (IQR = ${formatNum(result.rows[0].iqr, dec, true)}), dengan sebaran nilai antara ${formatNum(result.rows[0].min, dec, true)} hingga ${formatNum(result.rows[0].max, dec, true)} serta ${confidencePct}% CI [${formatNum(result.rows[0].ciLower, dec, false)}, ${formatNum(result.rows[0].ciUpper, dec, false)}].`
          : `Variable ${result.rows[0].variable} (N = ${result.rows[0].n}) has M = ${formatNum(result.rows[0].mean, dec, true)} (SD = ${formatNum(result.rows[0].sd, dec, true)}) and median ${formatNum(result.rows[0].median, dec, true)} (IQR = ${formatNum(result.rows[0].iqr, dec, true)}), spanning ${formatNum(result.rows[0].min, dec, true)} to ${formatNum(result.rows[0].max, dec, true)} with ${confidencePct}% CI [${formatNum(result.rows[0].ciLower, dec, false)}, ${formatNum(result.rows[0].ciUpper, dec, false)}].`
        : lang === 'id'
        ? `Ringkasan statistik deskriptif untuk ${result.rows.length} variabel terpilih meliputi ${decSummaries}. Angka-angka tersebut menggambarkan profil pemusatan dan penyebaran masing-masing variabel secara terpisah.`
        : `Descriptive summary across ${result.rows.length} selected variables: ${decSummaries}. These figures characterize the central tendency and dispersion of each selected variable independently.`;

    return {
      confidencePct,
      primaryP: null,
      isSig: false,
      decisionVerdict: 'descriptive',
      verdictLabel: '',
      h0Statement: '',
      h1Statement: '',
      decisionRule: '',
      overallStrengthSummary: '',
      apaSentence,
      apaRules,
      benchmarkTitle: '',
      benchmarks: [],
      relationshipRows: [],
      researchInterpretation,
    };
  }

  // 2. INDEPENDENT SAMPLES T-TEST
  if (result.kind === 'ttest_ind') {
    const [g1, g2] = result.groups;
    const p = result.studentP;
    const isSig = p < alpha;
    const decObj = decisionForP(p, alpha, lang);
    const dCls = classifyCohensD(result.cohensD, lang);
    const pointBiserialR =
      Math.abs(result.studentT) /
      Math.sqrt(result.studentT * result.studentT + result.studentDf);

    const benchmarks: StrengthBenchmarkRow[] = [
      {
        range: '|d| < 0.20',
        label: lang === 'id' ? 'Sangat Kecil / Diabaikan' : 'Negligible',
        isCurrent: dCls.bucket === 'very_weak',
      },
      {
        range: '0.20 ≤ |d| < 0.50',
        label: lang === 'id' ? 'Kecil' : 'Small',
        isCurrent: dCls.bucket === 'weak',
      },
      {
        range: '0.50 ≤ |d| < 0.80',
        label: lang === 'id' ? 'Sedang' : 'Medium',
        isCurrent: dCls.bucket === 'moderate',
      },
      {
        range: '|d| ≥ 0.80',
        label: lang === 'id' ? 'Besar / Kuat' : 'Large',
        isCurrent: dCls.bucket === 'strong',
      },
    ];

    const relationshipRows: RelationshipStrengthRow[] = [
      {
        id: 'ttest_ind_main',
        pairOrFactor: `${result.groupingVar} (${g1.group} vs ${g2.group}) → ${result.dependentVar}`,
        metricLabel: "Cohen's d / r_pb",
        metricValue: `d = ${formatNum(result.cohensD, dec, false)} (r_pb = ${apaNoZero(pointBiserialR)})`,
        strengthTier: dCls.tier,
        pValue: pFmt(p),
        pRaw: p,
        decision: decObj.decision,
        decisionLabel: decObj.label,
      },
    ];

    const h0Statement =
      lang === 'id'
        ? `H₀: μ(${g1.group}) = μ(${g2.group}) — Tidak ada perbedaan rata-rata ${result.dependentVar} yang signifikan antara kelompok ${g1.group} dan ${g2.group}.`
        : `H₀: μ(${g1.group}) = μ(${g2.group}) — No significant mean difference in ${result.dependentVar} between ${g1.group} and ${g2.group}.`;
    const h1Statement =
      lang === 'id'
        ? `H₁: μ(${g1.group}) ≠ μ(${g2.group}) — Terdapat perbedaan rata-rata ${result.dependentVar} antara kelompok ${g1.group} dan ${g2.group}.`
        : `H₁: μ(${g1.group}) ≠ μ(${g2.group}) — A significant mean difference exists in ${result.dependentVar} between ${g1.group} and ${g2.group}.`;

    const apaSentence =
      lang === 'id'
        ? `Uji-T sampel independen menunjukkan bahwa kelompok ${g1.group} (M = ${formatNum(g1.mean, dec, false)}, SD = ${formatNum(g1.sd, dec, false)}) dibandingkan kelompok ${g2.group} (M = ${formatNum(g2.mean, dec, false)}, SD = ${formatNum(g2.sd, dec, false)}) pada variabel ${result.dependentVar} menghasilkan t(${result.studentDf}) = ${formatNum(result.studentT, dec, false)}, p = ${pFmt(p)}, ${confidencePct}% CI [${formatNum(result.ciLower, dec, false)}, ${formatNum(result.ciUpper, dec, false)}], dengan ukuran efek Cohen's d = ${formatNum(result.cohensD, dec, false)} (${dCls.tier}). Pada α = ${alphaStr}, ${decObj.label}.`
        : `An independent-samples t-test comparing ${g1.group} (M = ${formatNum(g1.mean, dec, false)}, SD = ${formatNum(g1.sd, dec, false)}) and ${g2.group} (M = ${formatNum(g2.mean, dec, false)}, SD = ${formatNum(g2.sd, dec, false)}) on ${result.dependentVar} yielded t(${result.studentDf}) = ${formatNum(result.studentT, dec, false)}, p = ${pFmt(p)}, ${confidencePct}% CI [${formatNum(result.ciLower, dec, false)}, ${formatNum(result.ciUpper, dec, false)}], Cohen's d = ${formatNum(result.cohensD, dec, false)} (${dCls.tier}). At α = ${alphaStr}, ${decObj.label}.`;

    return {
      confidencePct,
      primaryP: p,
      isSig,
      decisionVerdict: decObj.decision,
      verdictLabel: decObj.label,
      h0Statement,
      h1Statement,
      decisionRule,
      overallStrengthSummary: `Cohen's d = ${formatNum(result.cohensD, dec, false)} (${dCls.tier})`,
      apaSentence,
      apaRules,
      benchmarkTitle:
        lang === 'id'
          ? "Kriteria Ukuran Efek & Kekuatan Perbedaan (Cohen's d)"
          : "Effect Size & Strength Benchmarks (Cohen's d)",
      benchmarks,
      relationshipRows,
      researchInterpretation: apaSentence,
    };
  }

  // 3. PAIRED SAMPLES T-TEST
  if (result.kind === 'ttest_paired') {
    const p = result.p;
    const isSig = p < alpha;
    const decObj = decisionForP(p, alpha, lang);
    const dCls = classifyCohensD(result.cohensD, lang);
    const pairedR = pearsonPair(
      result.pairs.map((x) => x.a),
      result.pairs.map((x) => x.b)
    );
    const rCls = classifyCorrelationR(pairedR.r, lang);
    const rDec = decisionForP(pairedR.p, alpha, lang);

    const benchmarks: StrengthBenchmarkRow[] = [
      {
        range: '|d| < 0.20',
        label: lang === 'id' ? 'Sangat Kecil / Diabaikan' : 'Negligible',
        isCurrent: dCls.bucket === 'very_weak',
      },
      {
        range: '0.20 ≤ |d| < 0.50',
        label: lang === 'id' ? 'Kecil' : 'Small',
        isCurrent: dCls.bucket === 'weak',
      },
      {
        range: '0.50 ≤ |d| < 0.80',
        label: lang === 'id' ? 'Sedang' : 'Medium',
        isCurrent: dCls.bucket === 'moderate',
      },
      {
        range: '|d| ≥ 0.80',
        label: lang === 'id' ? 'Besar / Kuat' : 'Large',
        isCurrent: dCls.bucket === 'strong',
      },
    ];

    const relationshipRows: RelationshipStrengthRow[] = [
      {
        id: 'paired_diff',
        pairOrFactor: `${result.varA} − ${result.varB} (Selisih Berpasangan)`,
        metricLabel: "Cohen's d",
        metricValue: formatNum(result.cohensD, dec, false),
        strengthTier: dCls.tier,
        pValue: pFmt(p),
        pRaw: p,
        decision: decObj.decision,
        decisionLabel: decObj.label,
      },
      {
        id: 'paired_corr',
        pairOrFactor: `${result.varA} × ${result.varB} (Korelasi Pasangan)`,
        metricLabel: 'Pearson r',
        metricValue: apaNoZero(pairedR.r),
        strengthTier: rCls.tier,
        pValue: pFmt(pairedR.p),
        pRaw: pairedR.p,
        decision: rDec.decision,
        decisionLabel: rDec.label,
      },
    ];

    const h0Statement =
      lang === 'id'
        ? `H₀: μ(${result.varA} − ${result.varB}) = 0 — Tidak ada perbedaan rata-rata yang signifikan antara ${result.varA} dan ${result.varB}.`
        : `H₀: μ(${result.varA} − ${result.varB}) = 0 — No significant paired difference between ${result.varA} and ${result.varB}.`;
    const h1Statement =
      lang === 'id'
        ? `H₁: μ(${result.varA} − ${result.varB}) ≠ 0 — Terdapat perubahan rata-rata yang signifikan antara ${result.varA} dan ${result.varB}.`
        : `H₁: μ(${result.varA} − ${result.varB}) ≠ 0 — A significant paired difference exists between ${result.varA} and ${result.varB}.`;

    const apaSentence =
      lang === 'id'
        ? `Uji-T berpasangan (N = ${result.n}) antara ${result.varA} (M = ${formatNum(result.meanA, dec, false)}, SD = ${formatNum(result.sdA, dec, false)}) dan ${result.varB} (M = ${formatNum(result.meanB, dec, false)}, SD = ${formatNum(result.sdB, dec, false)}) menunjukkan selisih rata-rata ${formatNum(result.meanDiff, dec, false)}, ${confidencePct}% CI [${formatNum(result.ciLower, dec, false)}, ${formatNum(result.ciUpper, dec, false)}], t(${result.df}) = ${formatNum(result.t, dec, false)}, p = ${pFmt(p)}, Cohen's d = ${formatNum(result.cohensD, dec, false)} (${dCls.tier}), serta korelasi pasangan r = ${apaNoZero(pairedR.r)} (${rCls.tier}). Pada α = ${alphaStr}, ${decObj.label}.`
        : `A paired-samples t-test (N = ${result.n}) comparing ${result.varA} (M = ${formatNum(result.meanA, dec, false)}, SD = ${formatNum(result.sdA, dec, false)}) and ${result.varB} (M = ${formatNum(result.meanB, dec, false)}, SD = ${formatNum(result.sdB, dec, false)}) showed mean difference ${formatNum(result.meanDiff, dec, false)}, ${confidencePct}% CI [${formatNum(result.ciLower, dec, false)}, ${formatNum(result.ciUpper, dec, false)}], t(${result.df}) = ${formatNum(result.t, dec, false)}, p = ${pFmt(p)}, Cohen's d = ${formatNum(result.cohensD, dec, false)} (${dCls.tier}), with paired correlation r = ${apaNoZero(pairedR.r)} (${rCls.tier}). At α = ${alphaStr}, ${decObj.label}.`;

    return {
      confidencePct,
      primaryP: p,
      isSig,
      decisionVerdict: decObj.decision,
      verdictLabel: decObj.label,
      h0Statement,
      h1Statement,
      decisionRule,
      overallStrengthSummary: `Cohen's d = ${formatNum(result.cohensD, dec, false)} (${dCls.tier}) · r = ${apaNoZero(pairedR.r)}`,
      apaSentence,
      apaRules,
      benchmarkTitle:
        lang === 'id'
          ? "Kriteria Ukuran Efek Uji Berpasangan (Cohen's d)"
          : "Paired-Samples Effect Size Benchmarks (Cohen's d)",
      benchmarks,
      relationshipRows,
      researchInterpretation: apaSentence,
    };
  }

  // 4. ONE-WAY ANOVA
  if (result.kind === 'anova') {
    const p = result.p;
    const isSig = p < alpha;
    const decObj = decisionForP(p, alpha, lang);
    const etaCls = classifyEtaSquared(result.etaSquared, lang);

    const benchmarks: StrengthBenchmarkRow[] = [
      {
        range: 'η² < .01',
        label: lang === 'id' ? 'Sangat Kecil / Diabaikan' : 'Negligible',
        isCurrent: etaCls.bucket === 'very_weak',
      },
      {
        range: '.01 ≤ η² < .06',
        label: lang === 'id' ? 'Kecil' : 'Small',
        isCurrent: etaCls.bucket === 'weak',
      },
      {
        range: '.06 ≤ η² < .14',
        label: lang === 'id' ? 'Sedang' : 'Medium',
        isCurrent: etaCls.bucket === 'moderate',
      },
      {
        range: 'η² ≥ .14',
        label: lang === 'id' ? 'Besar / Kuat' : 'Large',
        isCurrent: etaCls.bucket === 'strong',
      },
    ];

    const relationshipRows: RelationshipStrengthRow[] = [
      {
        id: 'anova_main',
        pairOrFactor: `${result.groupingVar} (${result.groups.length} kelompok) → ${result.dependentVar}`,
        metricLabel: 'η² / ω²',
        metricValue: `η² = ${apaNoZero(result.etaSquared)} (ω² = ${apaNoZero(result.omegaSquared)})`,
        strengthTier: etaCls.tier,
        pValue: pFmt(p),
        pRaw: p,
        decision: decObj.decision,
        decisionLabel: decObj.label,
      },
    ];

    const groupMeansDesc = result.groups
      .map(
        (g) =>
          `${g.group} (M = ${formatNum(g.mean, dec, false)}, SD = ${formatNum(g.sd, dec, false)})`
      )
      .join(', ');

    const h0Statement =
      lang === 'id'
        ? `H₀: μ₁ = μ₂ = … = μₖ — Semua kategori ${result.groupingVar} memiliki rata-rata ${result.dependentVar} yang sama.`
        : `H₀: μ₁ = μ₂ = … = μₖ — All ${result.groupingVar} categories share equal ${result.dependentVar} population means.`;
    const h1Statement =
      lang === 'id'
        ? `H₁: Minimal ada satu kategori ${result.groupingVar} yang memiliki rata-rata ${result.dependentVar} berbeda.`
        : `H₁: At least one ${result.groupingVar} group mean differs significantly on ${result.dependentVar}.`;

    const apaSentence =
      lang === 'id'
        ? `ANOVA satu arah pada ${result.dependentVar} berdasarkan ${result.groupingVar} [${groupMeansDesc}] menghasilkan F(${result.dfBetween}, ${result.dfWithin}) = ${formatNum(result.f, dec, false)}, p = ${pFmt(p)}, dengan kekuatan pengaruh η² = ${apaNoZero(result.etaSquared)} (${etaCls.tier}; ${(result.etaSquared * 100).toFixed(1)}% varians dijelaskan). Pada taraf α = ${alphaStr}, ${decObj.label}.`
        : `A one-way ANOVA evaluating ${result.groupingVar} on ${result.dependentVar} [${groupMeansDesc}] yielded F(${result.dfBetween}, ${result.dfWithin}) = ${formatNum(result.f, dec, false)}, p = ${pFmt(p)}, η² = ${apaNoZero(result.etaSquared)} (${etaCls.tier}; ${(result.etaSquared * 100).toFixed(1)}% variance explained). At α = ${alphaStr}, ${decObj.label}.`;

    return {
      confidencePct,
      primaryP: p,
      isSig,
      decisionVerdict: decObj.decision,
      verdictLabel: decObj.label,
      h0Statement,
      h1Statement,
      decisionRule,
      overallStrengthSummary: `η² = ${apaNoZero(result.etaSquared)} (${etaCls.tier})`,
      apaSentence,
      apaRules,
      benchmarkTitle:
        lang === 'id'
          ? 'Kriteria Kekuatan Pengaruh ANOVA (Eta Squared / η²)'
          : 'ANOVA Effect Size Benchmarks (Eta Squared / η²)',
      benchmarks,
      relationshipRows,
      researchInterpretation: apaSentence,
    };
  }

  // 5. CORRELATION MATRIX (2 or more variables)
  if (result.kind === 'correlation') {
    const vars = result.variables;
    const methodLabel = result.method === 'pearson' ? 'Pearson r' : 'Spearman ρ';
    const relationshipRows: RelationshipStrengthRow[] = [];

    for (let i = 0; i < vars.length; i++) {
      for (let j = i + 1; j < vars.length; j++) {
        const va = vars[i];
        const vb = vars[j];
        const cell = result.matrix[va][vb];
        const cls = classifyCorrelationR(cell.r, lang);
        const decObj = decisionForP(cell.p, alpha, lang);
        relationshipRows.push({
          id: `${va}__${vb}`,
          pairOrFactor: `${va} × ${vb} (n = ${cell.n})`,
          metricLabel: methodLabel,
          metricValue: `${apaNoZero(cell.r)} (R² = ${apaNoZero(cell.r * cell.r)})`,
          strengthTier: cls.tier,
          pValue: pFmt(cell.p),
          pRaw: cell.p,
          decision: decObj.decision,
          decisionLabel: decObj.label,
        });
      }
    }

    const strongest = relationshipRows.reduce((best, cur) => {
      const bestVal = Math.abs(parseFloat(best.metricValue) || 0);
      const curVal = Math.abs(parseFloat(cur.metricValue) || 0);
      return curVal > bestVal ? cur : best;
    }, relationshipRows[0]);

    const primaryP = computePrimaryP(result);
    const isSig = primaryP !== null && primaryP < alpha;
    const sigCount = relationshipRows.filter((r) => r.decision === 'rejected').length;

    const firstA = vars[0];
    const firstB = vars[1];
    const firstCell = result.matrix[firstA][firstB];
    const strongestCls = classifyCorrelationR(firstCell.r, lang);

    const benchmarks: StrengthBenchmarkRow[] = [
      {
        range: '|r| < .10',
        label: lang === 'id' ? 'Sangat Lemah / Diabaikan' : 'Very Weak / Negligible',
        isCurrent: strongestCls.bucket === 'very_weak',
      },
      {
        range: '.10 ≤ |r| < .30',
        label: lang === 'id' ? 'Lemah' : 'Weak',
        isCurrent: strongestCls.bucket === 'weak',
      },
      {
        range: '.30 ≤ |r| < .50',
        label: lang === 'id' ? 'Sedang' : 'Moderate',
        isCurrent: strongestCls.bucket === 'moderate',
      },
      {
        range: '.50 ≤ |r| < .70',
        label: lang === 'id' ? 'Kuat' : 'Strong',
        isCurrent: strongestCls.bucket === 'strong',
      },
      {
        range: '|r| ≥ .70',
        label: lang === 'id' ? 'Sangat Kuat' : 'Very Strong',
        isCurrent: strongestCls.bucket === 'very_strong',
      },
    ];

    const h0Statement =
      lang === 'id'
        ? `H₀: ρ = 0 — Tidak terdapat hubungan monotonik/linear yang signifikan antar variabel terpilih (${vars.join(', ')}).`
        : `H₀: ρ = 0 — No significant linear/monotonic association exists among (${vars.join(', ')}).`;
    const h1Statement =
      lang === 'id'
        ? `H₁: ρ ≠ 0 — Terdapat hubungan yang signifikan antara pasangan variabel terpilih.`
        : `H₁: ρ ≠ 0 — A statistically significant association exists between selected variable pairs.`;

    const pairSummaryText = relationshipRows
      .map(
        (r) =>
          `${r.pairOrFactor}: r = ${r.metricValue.split(' ')[0]}, p = ${r.pValue} [${r.strengthTier}, ${r.decisionLabel}]`
      )
      .join('; ');

    const apaSentence =
      relationshipRows.length === 1
        ? lang === 'id'
          ? `Uji korelasi ${result.method === 'pearson' ? 'Pearson' : 'Spearman'} antara ${firstA} dan ${firstB} (n = ${firstCell.n}) menunjukkan hubungan ${strongestCls.tier}, r(${Math.max(1, firstCell.n - 2)}) = ${apaNoZero(firstCell.r)}, p = ${pFmt(firstCell.p)}. Pada taraf α = ${alphaStr}, ${decisionForP(firstCell.p, alpha, lang).label}.`
          : `A ${result.method === 'pearson' ? 'Pearson' : 'Spearman'} correlation between ${firstA} and ${firstB} (n = ${firstCell.n}) showed a ${strongestCls.tier} relationship, r(${Math.max(1, firstCell.n - 2)}) = ${apaNoZero(firstCell.r)}, p = ${pFmt(firstCell.p)}. At α = ${alphaStr}, ${decisionForP(firstCell.p, alpha, lang).label}.`
        : lang === 'id'
        ? `Matriks korelasi ${result.method === 'pearson' ? 'Pearson' : 'Spearman'} pada ${vars.length} variabel (${vars.join(', ')}) menguji ${relationshipRows.length} pasangan, dengan ${sigCount} pasangan signifikan pada α = ${alphaStr}. Hubungan terkuat ditemukan pada ${strongest.pairOrFactor} (${strongest.strengthTier}, p = ${strongest.pValue}; ${strongest.decisionLabel}). Rincian: ${pairSummaryText}.`
        : `A ${result.method === 'pearson' ? 'Pearson' : 'Spearman'} correlation matrix across ${vars.length} variables (${vars.join(', ')}) tested ${relationshipRows.length} pairs, with ${sigCount} significant at α = ${alphaStr}. Strongest pair: ${strongest.pairOrFactor} (${strongest.strengthTier}, p = ${strongest.pValue}; ${strongest.decisionLabel}).`;

    const verdictOverall =
      sigCount > 0
        ? lang === 'id'
          ? `H₀ ditolak (${sigCount}/${relationshipRows.length} pasangan)`
          : `Reject H₀ (${sigCount}/${relationshipRows.length} pairs)`
        : lang === 'id'
        ? 'H₀ gagal ditolak'
        : 'Fail to reject H₀';

    return {
      confidencePct,
      primaryP,
      isSig,
      decisionVerdict: isSig ? 'rejected' : 'fail_to_reject',
      verdictLabel: verdictOverall,
      h0Statement,
      h1Statement,
      decisionRule,
      overallStrengthSummary: `${strongest.pairOrFactor}: ${strongest.strengthTier}`,
      apaSentence,
      apaRules,
      benchmarkTitle:
        lang === 'id'
          ? `Kriteria Kekuatan Hubungan (${methodLabel})`
          : `Relationship Strength Benchmarks (${methodLabel})`,
      benchmarks,
      relationshipRows,
      researchInterpretation: apaSentence,
    };
  }

  // 6. LINEAR REGRESSION (OLS)
  if (result.kind === 'regression') {
    const p = result.pModel;
    const isSig = p < alpha;
    const modelDec = decisionForP(p, alpha, lang);
    const f2Cls = classifyRegressionF2(result.rSquared, lang);
    const multiRCls = classifyCorrelationR(result.r, lang);

    const benchmarks: StrengthBenchmarkRow[] = [
      {
        range: 'f² < 0.02',
        label: lang === 'id' ? 'Sangat Lemah / Diabaikan' : 'Negligible',
        isCurrent: f2Cls.bucket === 'very_weak',
      },
      {
        range: '0.02 ≤ f² < 0.15',
        label: lang === 'id' ? 'Kecil / Lemah' : 'Small',
        isCurrent: f2Cls.bucket === 'weak',
      },
      {
        range: '0.15 ≤ f² < 0.35',
        label: lang === 'id' ? 'Sedang' : 'Medium',
        isCurrent: f2Cls.bucket === 'moderate',
      },
      {
        range: 'f² ≥ 0.35',
        label: lang === 'id' ? 'Besar / Kuat' : 'Large',
        isCurrent: f2Cls.bucket === 'strong',
      },
    ];

    const relationshipRows: RelationshipStrengthRow[] = [
      {
        id: 'reg_omnibus',
        pairOrFactor:
          lang === 'id'
            ? `Model Simultan (${result.independentVars.join(' + ')}) → ${result.dependentVar}`
            : `Simultaneous Model (${result.independentVars.join(' + ')}) → ${result.dependentVar}`,
        metricLabel: 'R / R² / f²',
        metricValue: `R = ${apaNoZero(result.r)}, R² = ${apaNoZero(result.rSquared)} (f² = ${formatNum(f2Cls.f2, dec, false)})`,
        strengthTier:
          lang === 'id'
            ? `${f2Cls.tier} (${(result.rSquared * 100).toFixed(1)}% varians)`
            : `${f2Cls.tier} (${(result.rSquared * 100).toFixed(1)}% variance)`,
        pValue: pFmt(p),
        pRaw: p,
        decision: modelDec.decision,
        decisionLabel: modelDec.label,
      },
      ...result.predictorSeries.map((s) => {
        const betaVal = s.coef.beta ?? 0;
        const betaCls = classifyCorrelationR(betaVal, lang);
        const predDec = decisionForP(s.coef.p, alpha, lang);
        return {
          id: `pred_${s.predictor}`,
          pairOrFactor: `${s.predictor} → ${result.dependentVar}`,
          metricLabel: 'B / Std. β',
          metricValue: `B = ${formatNum(s.coef.b, dec, false)} (β = ${apaNoZero(betaVal)})`,
          strengthTier: betaCls.tier,
          pValue: pFmt(s.coef.p),
          pRaw: s.coef.p,
          decision: predDec.decision,
          decisionLabel: predDec.label,
        };
      }),
    ];

    const h0Statement =
      lang === 'id'
        ? `H₀: R² = 0 (seluruh βᵢ = 0) — Prediktor (${result.independentVars.join(', ')}) secara simultan tidak berpengaruh signifikan terhadap ${result.dependentVar}.`
        : `H₀: R² = 0 (all βᵢ = 0) — Predictors (${result.independentVars.join(', ')}) do not significantly predict ${result.dependentVar}.`;
    const h1Statement =
      lang === 'id'
        ? `H₁: R² > 0 (minimal satu βᵢ ≠ 0) — Minimal satu prediktor berpengaruh signifikan terhadap ${result.dependentVar}.`
        : `H₁: R² > 0 (at least one βᵢ ≠ 0) — At least one predictor significantly predicts ${result.dependentVar}.`;

    const predSummary = result.predictorSeries
      .map((s) => {
        const pd = decisionForP(s.coef.p, alpha, lang);
        return `${s.predictor} (B = ${formatNum(s.coef.b, dec, false)}, β = ${s.coef.beta === null ? '—' : apaNoZero(s.coef.beta)}, t = ${formatNum(s.coef.t, dec, false)}, p = ${pFmt(s.coef.p)}, ${pd.label})`;
      })
      .join('; ');

    const apaSentence =
      lang === 'id'
        ? `Regresi linear OLS (N = ${result.n}) menguji pengaruh ${result.independentVars.join(' dan ')} terhadap ${result.dependentVar}. Model secara simultan signifikan dengan kekuatan hubungan ${multiRCls.tier.toLowerCase()} / efek model ${f2Cls.tier.toLowerCase()}, R = ${apaNoZero(result.r)}, R² = ${apaNoZero(result.rSquared)} (Adjusted R² = ${apaNoZero(result.adjRSquared)}, f² = ${formatNum(f2Cls.f2, dec, false)}), F(${result.dfModel}, ${result.dfResidual}) = ${formatNum(result.f, dec, false)}, p = ${pFmt(p)}. Pada taraf α = ${alphaStr}, ${modelDec.label}. Kontribusi parsial prediktor: ${predSummary}.`
        : `An OLS linear regression (N = ${result.n}) predicted ${result.dependentVar} from ${result.independentVars.join(' and ')}. The overall model yielded R = ${apaNoZero(result.r)}, R² = ${apaNoZero(result.rSquared)} (Adjusted R² = ${apaNoZero(result.adjRSquared)}, Cohen's f² = ${formatNum(f2Cls.f2, dec, false)}, ${f2Cls.tier}), F(${result.dfModel}, ${result.dfResidual}) = ${formatNum(result.f, dec, false)}, p = ${pFmt(p)}. At α = ${alphaStr}, ${modelDec.label}. Predictor coefficients: ${predSummary}.`;

    return {
      confidencePct,
      primaryP: p,
      isSig,
      decisionVerdict: modelDec.decision,
      verdictLabel: modelDec.label,
      h0Statement,
      h1Statement,
      decisionRule,
      overallStrengthSummary: `R = ${apaNoZero(result.r)}, R² = ${apaNoZero(result.rSquared)}, f² = ${formatNum(f2Cls.f2, dec, false)} (${f2Cls.tier})`,
      apaSentence,
      apaRules,
      benchmarkTitle:
        lang === 'id'
          ? "Kriteria Kekuatan Pengaruh Model Regresi (Cohen's f²)"
          : "Regression Effect Size Benchmarks (Cohen's f²)",
      benchmarks,
      relationshipRows,
      researchInterpretation: apaSentence,
    };
  }

  // 7. CHI-SQUARE TEST OF INDEPENDENCE
  if (result.kind === 'chisquare') {
    const p = result.p;
    const isSig = p < alpha;
    const decObj = decisionForP(p, alpha, lang);
    const minDim = Math.min(result.rowLevels.length - 1, result.colLevels.length - 1);
    const vCls = classifyCramersV(result.cramersV, minDim, lang);

    const benchmarks: StrengthBenchmarkRow[] = [
      {
        range: 'V < .10',
        label: lang === 'id' ? 'Sangat Lemah / Diabaikan' : 'Negligible',
        isCurrent: vCls.bucket === 'very_weak',
      },
      {
        range: '.10 ≤ V < .30',
        label: lang === 'id' ? 'Lemah' : 'Weak',
        isCurrent: vCls.bucket === 'weak',
      },
      {
        range: '.30 ≤ V < .50',
        label: lang === 'id' ? 'Sedang' : 'Moderate',
        isCurrent: vCls.bucket === 'moderate',
      },
      {
        range: 'V ≥ .50',
        label: lang === 'id' ? 'Kuat' : 'Strong',
        isCurrent: vCls.bucket === 'strong',
      },
    ];

    const relationshipRows: RelationshipStrengthRow[] = [
      {
        id: 'chisquare_main',
        pairOrFactor: `${result.varA} × ${result.varB} (N = ${result.grandTotal})`,
        metricLabel: "Cramér's V",
        metricValue: apaNoZero(result.cramersV),
        strengthTier: vCls.tier,
        pValue: pFmt(p),
        pRaw: p,
        decision: decObj.decision,
        decisionLabel: decObj.label,
      },
    ];

    const h0Statement =
      lang === 'id'
        ? `H₀: Variabel ${result.varA} dan ${result.varB} saling independen (tidak ada asosiasi kategori).`
        : `H₀: ${result.varA} and ${result.varB} are independent (no categorical association).`;
    const h1Statement =
      lang === 'id'
        ? `H₁: Terdapat hubungan atau asosiasi yang signifikan antara ${result.varA} dan ${result.varB}.`
        : `H₁: A statistically significant association exists between ${result.varA} and ${result.varB}.`;

    const apaSentence =
      lang === 'id'
        ? `Uji Chi-Square Independensi antara ${result.varA} dan ${result.varB} (N = ${result.grandTotal}) menghasilkan χ²(${result.df}, N = ${result.grandTotal}) = ${formatNum(result.chi2, dec, false)}, p = ${pFmt(p)}, dengan kekuatan asosiasi Cramér's V = ${apaNoZero(result.cramersV)} (${vCls.tier}). Pada taraf α = ${alphaStr}, ${decObj.label}.`
        : `A Chi-Square test of independence between ${result.varA} and ${result.varB} (N = ${result.grandTotal}) revealed χ²(${result.df}, N = ${result.grandTotal}) = ${formatNum(result.chi2, dec, false)}, p = ${pFmt(p)}, Cramér's V = ${apaNoZero(result.cramersV)} (${vCls.tier}). At α = ${alphaStr}, ${decObj.label}.`;

    return {
      confidencePct,
      primaryP: p,
      isSig,
      decisionVerdict: decObj.decision,
      verdictLabel: decObj.label,
      h0Statement,
      h1Statement,
      decisionRule,
      overallStrengthSummary: `Cramér's V = ${apaNoZero(result.cramersV)} (${vCls.tier})`,
      apaSentence,
      apaRules,
      benchmarkTitle:
        lang === 'id'
          ? "Kriteria Kekuatan Asosiasi Chi-Square (Cramér's V)"
          : "Chi-Square Association Benchmarks (Cramér's V)",
      benchmarks,
      relationshipRows,
      researchInterpretation: apaSentence,
    };
  }

  return null;
}
