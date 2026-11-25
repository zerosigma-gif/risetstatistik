import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { formatNum, formatPValue, runStatisticalAnalysis } from '../engine/statMath';
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
import { buildApaReportBundle, type ApaReportBundle } from './apaAnalysis';
import {
  buildChartSvgString,
  getAvailableChartsForResult,
  svgStringToPngBytes,
} from './chartSvgBuilder';

export interface DocxReportOptions {
  reportTitle: string;
  researcherName: string;
  facultyProgram: string;
  alpha: number;
  selectedTests: AnalysisType[];
  selectedCharts: ChartSubType[];
  includeTableDiscussion: boolean;
  includeStrengthTable: boolean;
  includeInterpretation: boolean;
}

export interface RenderedChartItem {
  chartType: ChartSubType;
  label: string;
  svg: string;
  width: number;
  height: number;
}

export interface ReportSectionModel {
  testType: AnalysisType;
  testTitle: string;
  result: StatResult;
  apaBundle: ApaReportBundle | null;
  mainTable: {
    headers: string[];
    rows: string[][];
    numericColStart: number;
  } | null;
  tableDiscussion: string;
  charts: RenderedChartItem[];
}

export function resolveConfigForReportTest(
  testType: AnalysisType,
  dataset: Dataset,
  baseConfig: AnalysisConfig,
  alpha: number
): AnalysisConfig {
  if (testType === baseConfig.activeTest) {
    return { ...baseConfig, alpha };
  }

  const numericCols = dataset.columns
    .filter((c) => c.scale !== 'nominal')
    .map((c) => c.key);
  const categoricalCols = dataset.columns
    .filter((c) => c.scale === 'nominal' || c.scale === 'ordinal')
    .map((c) => c.key);

  const countLevels = (colKey: string) =>
    new Set(
      dataset.rows
        .map((r) => r[colKey])
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
        .map(String)
    ).size;

  const twoLevelGroup =
    categoricalCols.find((k) => countLevels(k) === 2) ?? baseConfig.groupingVar;
  const multiLevelGroup =
    categoricalCols.find((k) => countLevels(k) >= 2) ?? baseConfig.groupingVar;

  const catA = categoricalCols[0] ?? baseConfig.categoricalVarA;
  const catB =
    categoricalCols.find((k) => k !== catA) ?? baseConfig.categoricalVarB;

  if (testType === 'descriptives' || testType === 'correlation') {
    const validDep = baseConfig.dependentVars.filter((k) => numericCols.includes(k));
    const vars =
      validDep.length >= 2 ? validDep : numericCols.slice(0, Math.min(4, numericCols.length));
    return { ...baseConfig, activeTest: testType, dependentVars: vars, alpha };
  }

  if (testType === 'ttest_ind') {
    const dep = numericCols.includes(baseConfig.dependentVars[0])
      ? baseConfig.dependentVars[0]
      : numericCols[0] ?? '';
    return {
      ...baseConfig,
      activeTest: testType,
      dependentVars: dep ? [dep] : [],
      groupingVar: twoLevelGroup,
      alpha,
    };
  }

  if (testType === 'anova') {
    const dep = numericCols.includes(baseConfig.dependentVars[0])
      ? baseConfig.dependentVars[0]
      : numericCols[0] ?? '';
    return {
      ...baseConfig,
      activeTest: testType,
      dependentVars: dep ? [dep] : [],
      groupingVar: multiLevelGroup,
      alpha,
    };
  }

  if (testType === 'ttest_paired') {
    const varA = numericCols.includes(baseConfig.pairedVarA)
      ? baseConfig.pairedVarA
      : numericCols[0] ?? '';
    const varB =
      numericCols.includes(baseConfig.pairedVarB) && baseConfig.pairedVarB !== varA
        ? baseConfig.pairedVarB
        : numericCols.find((k) => k !== varA) ?? '';
    return {
      ...baseConfig,
      activeTest: testType,
      pairedVarA: varA,
      pairedVarB: varB,
      alpha,
    };
  }

  if (testType === 'regression') {
    const dep = numericCols.includes(baseConfig.dependentVars[0])
      ? baseConfig.dependentVars[0]
      : numericCols[0] ?? '';
    const validPreds = baseConfig.independentVars.filter(
      (k) => k !== dep && numericCols.includes(k)
    );
    const preds =
      validPreds.length > 0
        ? validPreds
        : numericCols.filter((k) => k !== dep).slice(0, 2);
    return {
      ...baseConfig,
      activeTest: testType,
      dependentVars: dep ? [dep] : [],
      independentVars: preds,
      alpha,
    };
  }

  // chisquare
  return {
    ...baseConfig,
    activeTest: 'chisquare',
    categoricalVarA: catA,
    categoricalVarB: catB,
    alpha,
  };
}

function buildMainTableAndDiscussion(
  result: StatResult,
  alpha: number,
  formatConfig: FormatConfig,
  lang: Language
): {
  mainTable: ReportSectionModel['mainTable'];
  tableDiscussion: string;
} {
  if (result.kind === 'error') {
    return { mainTable: null, tableDiscussion: '' };
  }

  const dec = formatConfig.decimals;
  const thSep = formatConfig.thousandsSep;
  const pFmt = (p: number) => formatPValue(p, formatConfig.apaPValues, dec);
  const confPct = Math.round((1 - alpha) * 100);

  if (result.kind === 'descriptives') {
    const headers = ['Variable', 'N', 'Mean', 'SD', 'Median', 'IQR', 'Min', 'Max'];
    const rows = result.rows.map((r) => [
      r.variable,
      String(r.n),
      formatNum(r.mean, dec, thSep),
      formatNum(r.sd, dec, thSep),
      formatNum(r.median, dec, thSep),
      formatNum(r.iqr, dec, thSep),
      formatNum(r.min, dec, thSep),
      formatNum(r.max, dec, thSep),
    ]);
    const detail = result.rows
      .map(
        (r) =>
          `${r.variable} (N = ${r.n}, M = ${formatNum(r.mean, dec, thSep)}, SD = ${formatNum(r.sd, dec, thSep)}, Median = ${formatNum(r.median, dec, thSep)}, IQR = ${formatNum(r.iqr, dec, thSep)}, rentang ${formatNum(r.min, dec, thSep)}–${formatNum(r.max, dec, thSep)})`
      )
      .join('; ');
    const tableDiscussion =
      lang === 'id'
        ? `Tabel di atas merangkum statistik pemusatan dan penyebaran data pada ${result.rows.length} variabel numerik terpilih: ${detail}. Nilai SD dan IQR menunjukkan sebaran observasi relatif terhadap nilai rata-rata dan median masing-masing variabel.`
        : `The table above summarizes central tendency and dispersion across ${result.rows.length} selected numeric variables: ${detail}. Standard deviation (SD) and interquartile range (IQR) quantify observation spread around the mean and median.`;
    return { mainTable: { headers, rows, numericColStart: 1 }, tableDiscussion };
  }

  if (result.kind === 'ttest_ind') {
    const [g1, g2] = result.groups;
    const headers = ['Test', 't', 'df', 'p', 'Mean Diff', `${confPct}% CI`, "Cohen's d"];
    const rows = [
      [
        "Student's t",
        formatNum(result.studentT, dec, thSep),
        String(result.studentDf),
        pFmt(result.studentP),
        formatNum(result.meanDiff, dec, thSep),
        `[${formatNum(result.ciLower, 2, false)}, ${formatNum(result.ciUpper, 2, false)}]`,
        formatNum(result.cohensD, dec, thSep),
      ],
      [
        "Welch's t",
        formatNum(result.welchT, dec, thSep),
        formatNum(result.welchDf, 1, false),
        pFmt(result.welchP),
        formatNum(result.meanDiff, dec, thSep),
        '—',
        formatNum(result.cohensD, dec, thSep),
      ],
    ];
    const tableDiscussion =
      lang === 'id'
        ? `Tabel Uji-T Independen membandingkan rata-rata ${result.dependentVar} antara kelompok ${g1.group} (n = ${g1.n}, M = ${formatNum(g1.mean, dec, false)}, SD = ${formatNum(g1.sd, dec, false)}) dan ${g2.group} (n = ${g2.n}, M = ${formatNum(g2.mean, dec, false)}, SD = ${formatNum(g2.sd, dec, false)}). Selisih rata-rata tercatat sebesar ${formatNum(result.meanDiff, dec, thSep)} (${confPct}% CI [${formatNum(result.ciLower, 2, false)}, ${formatNum(result.ciUpper, 2, false)}]) dengan Student's t(${result.studentDf}) = ${formatNum(result.studentT, dec, thSep)}, p = ${pFmt(result.studentP)}, serta Welch's t(${formatNum(result.welchDf, 1, false)}) = ${formatNum(result.welchT, dec, thSep)}, p = ${pFmt(result.welchP)}.`
        : `The Independent Samples T-Test table compares ${result.dependentVar} between ${g1.group} (n = ${g1.n}, M = ${formatNum(g1.mean, dec, false)}, SD = ${formatNum(g1.sd, dec, false)}) and ${g2.group} (n = ${g2.n}, M = ${formatNum(g2.mean, dec, false)}, SD = ${formatNum(g2.sd, dec, false)}). Mean difference is ${formatNum(result.meanDiff, dec, thSep)} (${confPct}% CI [${formatNum(result.ciLower, 2, false)}, ${formatNum(result.ciUpper, 2, false)}]), yielding Student's t(${result.studentDf}) = ${formatNum(result.studentT, dec, thSep)}, p = ${pFmt(result.studentP)}, and Welch's t(${formatNum(result.welchDf, 1, false)}) = ${formatNum(result.welchT, dec, thSep)}, p = ${pFmt(result.welchP)}.`;
    return { mainTable: { headers, rows, numericColStart: 1 }, tableDiscussion };
  }

  if (result.kind === 'ttest_paired') {
    const headers = ['Pair', 'N', 'Mean Diff', 'SE', 't', 'df', 'p', "Cohen's d"];
    const rows = [
      [
        `${result.varA} − ${result.varB}`,
        String(result.n),
        formatNum(result.meanDiff, dec, thSep),
        formatNum(result.seDiff, dec, thSep),
        formatNum(result.t, dec, thSep),
        String(result.df),
        pFmt(result.p),
        formatNum(result.cohensD, dec, thSep),
      ],
    ];
    const tableDiscussion =
      lang === 'id'
        ? `Tabel Uji-T Berpasangan mengevaluasi perbedaan antar pengukuran berulang ${result.varA} (M = ${formatNum(result.meanA, dec, false)}, SD = ${formatNum(result.sdA, dec, false)}) dan ${result.varB} (M = ${formatNum(result.meanB, dec, false)}, SD = ${formatNum(result.sdB, dec, false)}) pada N = ${result.n} pasangan. Selisih rata-rata sebesar ${formatNum(result.meanDiff, dec, thSep)} (SE = ${formatNum(result.seDiff, dec, thSep)}) menghasilkan t(${result.df}) = ${formatNum(result.t, dec, thSep)} dan p = ${pFmt(result.p)}.`
        : `The Paired Samples T-Test table evaluates repeated measurements ${result.varA} (M = ${formatNum(result.meanA, dec, false)}, SD = ${formatNum(result.sdA, dec, false)}) versus ${result.varB} (M = ${formatNum(result.meanB, dec, false)}, SD = ${formatNum(result.sdB, dec, false)}) across N = ${result.n} pairs, showing mean difference ${formatNum(result.meanDiff, dec, thSep)} (SE = ${formatNum(result.seDiff, dec, thSep)}), t(${result.df}) = ${formatNum(result.t, dec, thSep)}, p = ${pFmt(result.p)}.`;
    return { mainTable: { headers, rows, numericColStart: 1 }, tableDiscussion };
  }

  if (result.kind === 'anova') {
    const headers = ['Source', 'SS', 'df', 'MS', 'F', 'p', 'η²'];
    const rows = [
      [
        result.groupingVar,
        formatNum(result.ssBetween, dec, thSep),
        String(result.dfBetween),
        formatNum(result.msBetween, dec, thSep),
        formatNum(result.f, dec, thSep),
        pFmt(result.p),
        formatNum(result.etaSquared, dec, thSep),
      ],
      [
        'Residuals',
        formatNum(result.ssWithin, dec, thSep),
        String(result.dfWithin),
        formatNum(result.msWithin, dec, thSep),
        '—',
        '—',
        '—',
      ],
    ];
    const groupNotes = result.groups
      .map((g) => `${g.group}: n=${g.n}, M=${formatNum(g.mean, dec, false)}`)
      .join('; ');
    const tableDiscussion =
      lang === 'id'
        ? `Tabel ANOVA Satu Arah mempartisi varians ${result.dependentVar} menjadi sumber antar-kelompok ${result.groupingVar} (SS = ${formatNum(result.ssBetween, dec, thSep)}, df = ${result.dfBetween}, MS = ${formatNum(result.msBetween, dec, thSep)}) dan residual (SS = ${formatNum(result.ssWithin, dec, thSep)}, df = ${result.dfWithin}, MS = ${formatNum(result.msWithin, dec, thSep)}). Rasio F(${result.dfBetween}, ${result.dfWithin}) = ${formatNum(result.f, dec, thSep)} dengan p = ${pFmt(result.p)} (${groupNotes}).`
        : `The One-Way ANOVA table partitions variance in ${result.dependentVar} into between-group ${result.groupingVar} (SS = ${formatNum(result.ssBetween, dec, thSep)}, df = ${result.dfBetween}, MS = ${formatNum(result.msBetween, dec, thSep)}) and residual error (SS = ${formatNum(result.ssWithin, dec, thSep)}, df = ${result.dfWithin}, MS = ${formatNum(result.msWithin, dec, thSep)}), yielding F(${result.dfBetween}, ${result.dfWithin}) = ${formatNum(result.f, dec, thSep)}, p = ${pFmt(result.p)} (${groupNotes}).`;
    return { mainTable: { headers, rows, numericColStart: 1 }, tableDiscussion };
  }

  if (result.kind === 'correlation') {
    const headers = ['Variable', ...result.variables];
    const rows = result.variables.map((rv) => [
      rv,
      ...result.variables.map((cv) => {
        if (rv === cv) return '—';
        const c = result.matrix[rv][cv];
        return `${formatNum(c.r, dec, false)} (${pFmt(c.p)})`;
      }),
    ]);
    const methodLabel = result.method === 'pearson' ? 'Pearson r' : 'Spearman ρ';
    const tableDiscussion =
      lang === 'id'
        ? `Tabel Matriks Korelasi (${methodLabel}) menampilkan koefisien korelasi beserta nilai-p dalam tanda kurung untuk ${result.variables.length} variabel terpilih (${result.variables.join(', ')}). Nilai positif menandakan arah hubungan searah, sedangkan nilai negatif menandakan hubungan berlawanan arah.`
        : `The Correlation Matrix (${methodLabel}) reports correlation coefficients alongside exact p-values in parentheses across ${result.variables.length} selected variables (${result.variables.join(', ')}). Positive coefficients indicate direct linear/monotonic trends while negative values indicate inverse associations.`;
    return { mainTable: { headers, rows, numericColStart: 1 }, tableDiscussion };
  }

  if (result.kind === 'regression') {
    const headers = ['Predictor', 'Estimate (B)', 'SE', 'Std. β', 't', 'p'];
    const rows = result.coefficients.map((c) => [
      c.term,
      formatNum(c.b, dec, thSep),
      formatNum(c.se, dec, thSep),
      c.beta === null ? '—' : formatNum(c.beta, dec, false),
      formatNum(c.t, dec, false),
      pFmt(c.p),
    ]);
    const tableDiscussion =
      lang === 'id'
        ? `Tabel koefisien Regresi Linear (OLS) memprediksi ${result.dependentVar} dari ${result.independentVars.join(', ')} (N = ${result.n}). Secara simultan model memiliki R = ${formatNum(result.r, dec, false)}, R² = ${formatNum(result.rSquared, dec, false)}, Adjusted R² = ${formatNum(result.adjRSquared, dec, false)}, RMSE = ${formatNum(result.rmse, dec, thSep)}, serta F(${result.dfModel}, ${result.dfResidual}) = ${formatNum(result.f, dec, false)} (p = ${pFmt(result.pModel)}). Nilai B menunjukkan perubahan unit ${result.dependentVar} per satu unit perubahan prediktor, sedangkan Std. β memungkinkan perbandingan kontribusi relatif antar prediktor.`
        : `The OLS Linear Regression coefficients table predicts ${result.dependentVar} from ${result.independentVars.join(', ')} (N = ${result.n}). Model fit shows R = ${formatNum(result.r, dec, false)}, R² = ${formatNum(result.rSquared, dec, false)}, Adjusted R² = ${formatNum(result.adjRSquared, dec, false)}, RMSE = ${formatNum(result.rmse, dec, thSep)}, and F(${result.dfModel}, ${result.dfResidual}) = ${formatNum(result.f, dec, false)} (p = ${pFmt(result.pModel)}). Unstandardized B indicates expected change per predictor unit, while Std. β compares relative predictor weight.`;
    return { mainTable: { headers, rows, numericColStart: 1 }, tableDiscussion };
  }

  // chisquare
  const headers = [`${result.varA} \\ ${result.varB}`, ...result.colLevels, 'Total'];
  const rows = result.rowLevels.map((rLabel, i) => [
    rLabel,
    ...result.colLevels.map((_, j) => String(result.observed[i][j])),
    String(result.rowTotals[i]),
  ]);
  const tableDiscussion =
    lang === 'id'
      ? `Tabel kontingensi silang memetakan distribusi frekuensi observasi antara ${result.varA} dan ${result.varB} pada total sampel N = ${result.grandTotal}. Statistik uji independensi menghasilkan χ²(${result.df}) = ${formatNum(result.chi2, dec, false)} dengan p = ${pFmt(result.p)} dan Cramér's V = ${formatNum(result.cramersV, dec, false)}.`
      : `The contingency table cross-tabulates observed frequencies across ${result.varA} and ${result.varB} (N = ${result.grandTotal}), yielding χ²(${result.df}) = ${formatNum(result.chi2, dec, false)}, p = ${pFmt(result.p)}, and Cramér's V = ${formatNum(result.cramersV, dec, false)}.`;
  return { mainTable: { headers, rows, numericColStart: 1 }, tableDiscussion };
}

export function buildReportSections(
  dataset: Dataset,
  baseConfig: AnalysisConfig,
  formatConfig: FormatConfig,
  language: Language,
  options: DocxReportOptions
): ReportSectionModel[] {
  const t = getT(language);

  return options.selectedTests.map((testType) => {
    const resolvedCfg = resolveConfigForReportTest(
      testType,
      dataset,
      baseConfig,
      options.alpha
    );
    const result = runStatisticalAnalysis(dataset, resolvedCfg);
    const apaBundle = buildApaReportBundle(
      result,
      dataset,
      resolvedCfg,
      formatConfig,
      language
    );
    const { mainTable, tableDiscussion } = buildMainTableAndDiscussion(
      result,
      options.alpha,
      formatConfig,
      language
    );

    const allowedCharts = getAvailableChartsForResult(result);
    const charts: RenderedChartItem[] = [];
    for (const ct of allowedCharts) {
      if (!options.selectedCharts.includes(ct)) continue;
      const built = buildChartSvgString(
        result,
        ct,
        resolvedCfg,
        formatConfig,
        language
      );
      if (built) {
        charts.push({
          chartType: ct,
          label:
            ct === 'means_ci'
              ? language === 'id'
                ? `Rata-Rata & ${Math.round((1 - options.alpha) * 100)}% CI`
                : `Group Means ± ${Math.round((1 - options.alpha) * 100)}% CI`
              : t.charts[ct],
          svg: built.svg,
          width: built.width,
          height: built.height,
        });
      }
    }

    return {
      testType,
      testTitle: t.tests[testType],
      result,
      apaBundle,
      mainTable,
      tableDiscussion,
      charts,
    };
  });
}

function buildApaWordTable(
  headers: string[],
  rows: string[][],
  numericColStart = 1
): Table {
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const topBottomRule = { style: BorderStyle.SINGLE, size: 12, color: '111315' };
  const headerRule = { style: BorderStyle.SINGLE, size: 6, color: '111315' };

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, idx) => {
      const isNum = idx >= numericColStart;
      return new TableCell({
        shading: { type: ShadingType.CLEAR, fill: 'FAF9F6' },
        borders: {
          top: topBottomRule,
          bottom: headerRule,
          left: noBorder,
          right: noBorder,
        },
        margins: { top: 90, bottom: 90, left: 100, right: 100 },
        children: [
          new Paragraph({
            alignment: isNum ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [
              new TextRun({
                text: h,
                bold: true,
                size: 19,
                font: 'Calibri',
                color: '111315',
              }),
            ],
          }),
        ],
      });
    }),
  });

  const dataRows = rows.map((r, rIdx) => {
    const isLast = rIdx === rows.length - 1;
    return new TableRow({
      children: r.map((cell, cIdx) => {
        const isNum = cIdx >= numericColStart;
        return new TableCell({
          borders: {
            top: noBorder,
            bottom: isLast ? topBottomRule : noBorder,
            left: noBorder,
            right: noBorder,
          },
          margins: { top: 75, bottom: 75, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: isNum ? AlignmentType.RIGHT : AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: cell,
                  size: 19,
                  font: isNum ? 'Consolas' : 'Calibri',
                  color: '111315',
                }),
              ],
            }),
          ],
        });
      }),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

export async function generateDocxBlob(
  dataset: Dataset,
  baseConfig: AnalysisConfig,
  formatConfig: FormatConfig,
  language: Language,
  options: DocxReportOptions
): Promise<Blob> {
  const t = getT(language);
  const sections = buildReportSections(
    dataset,
    baseConfig,
    formatConfig,
    language,
    options
  );

  const confPct = Math.round((1 - options.alpha) * 100);
  const dateLabel = new Date().toLocaleDateString(
    language === 'id' ? 'id-ID' : 'en-US',
    { year: 'numeric', month: 'long', day: 'numeric' }
  );

  const children: Array<Paragraph | Table> = [];

  // Title & Researcher Metadata Header
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text:
            options.reportTitle.trim() ||
            (language === 'id'
              ? 'Laporan Ringkasan Analisis Statistik'
              : 'Statistical Analysis Summary Report'),
          bold: true,
          size: 32,
          font: 'Calibri',
          color: '111315',
        }),
      ],
    })
  );

  const metaLines: Array<[string, string]> = [
    [
      t.docxModal.researcherLabel,
      options.researcherName.trim() || t.docxModal.notProvided,
    ],
    [
      t.docxModal.facultyLabel,
      options.facultyProgram.trim() || t.docxModal.notProvided,
    ],
    [
      language === 'id' ? 'Dataset Penelitian' : 'Research Dataset',
      `${language === 'id' ? dataset.nameId : dataset.name} (${dataset.rows.length} × ${dataset.columns.length})`,
    ],
    [
      t.docxModal.alphaSection,
      `α = ${options.alpha.toFixed(2)} (${confPct}% ${t.rightPane.confidenceLabel})`,
    ],
    [language === 'id' ? 'Tanggal Penyusunan' : 'Report Date', dateLabel],
  ];

  for (const [k, v] of metaLines) {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: `${k}: `,
            bold: true,
            size: 21,
            font: 'Calibri',
            color: '575B62',
          }),
          new TextRun({
            text: v,
            size: 21,
            font: 'Calibri',
            color: '111315',
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 120, after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 8, color: 'D1CEC5' },
      },
      children: [],
    })
  );

  let tableCounter = 1;
  let figureCounter = 1;

  for (let sIdx = 0; sIdx < sections.length; sIdx++) {
    const sec = sections[sIdx];

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: sIdx === 0 ? 80 : 280, after: 100 },
        children: [
          new TextRun({
            text: `${sIdx + 1}. ${sec.testTitle}`,
            bold: true,
            size: 26,
            font: 'Calibri',
            color: '1D4ED8',
          }),
        ],
      })
    );

    if (sec.result.kind === 'error') {
      const msg =
        t.errors[sec.result.messageKey as keyof typeof t.errors] ??
        sec.result.messageKey;
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [
            new TextRun({
              text: msg,
              italics: true,
              size: 21,
              font: 'Calibri',
              color: 'B45309',
            }),
          ],
        })
      );
      continue;
    }

    if (sec.apaBundle && sec.apaBundle.decisionVerdict !== 'descriptive') {
      children.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: `${t.apaGuide.h0Title}: `,
              bold: true,
              size: 20,
              font: 'Calibri',
              color: '111315',
            }),
            new TextRun({
              text: sec.apaBundle.h0Statement,
              size: 20,
              font: 'Calibri',
              color: '111315',
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: `${t.apaGuide.h1Title}: `,
              bold: true,
              size: 20,
              font: 'Calibri',
              color: '111315',
            }),
            new TextRun({
              text: sec.apaBundle.h1Statement,
              size: 20,
              font: 'Calibri',
              color: '111315',
            }),
          ],
        })
      );
    }

    // Main APA-7 Statistical Results Table
    if (sec.mainTable) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 60 },
          children: [
            new TextRun({
              text: `${t.docxModal.tablePrefix} ${tableCounter++}`,
              bold: true,
              size: 21,
              font: 'Calibri',
              color: '111315',
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `${t.rightPane.apaOutput} — ${sec.testTitle}`,
              italics: true,
              size: 21,
              font: 'Calibri',
              color: '575B62',
            }),
          ],
        }),
        buildApaWordTable(
          sec.mainTable.headers,
          sec.mainTable.rows,
          sec.mainTable.numericColStart
        )
      );
    }

    // Pembahasan Tabel
    if (options.includeTableDiscussion && sec.tableDiscussion) {
      children.push(
        new Paragraph({
          spacing: { before: 140, after: 60 },
          children: [
            new TextRun({
              text: t.docxModal.tableDiscussionHeading,
              bold: true,
              size: 21,
              font: 'Calibri',
              color: '111315',
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 140 },
          children: [
            new TextRun({
              text: sec.tableDiscussion,
              size: 21,
              font: 'Calibri',
              color: '111315',
            }),
          ],
        })
      );
    }

    // Tahap Kekuatan Hubungan & Keputusan H0 Table
    if (
      options.includeStrengthTable &&
      sec.apaBundle &&
      sec.apaBundle.relationshipRows.length > 0
    ) {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 60 },
          children: [
            new TextRun({
              text: `${t.docxModal.tablePrefix} ${tableCounter++}`,
              bold: true,
              size: 21,
              font: 'Calibri',
              color: '111315',
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: `${t.rightPane.strengthOutput} (α = ${options.alpha.toFixed(2)})`,
              italics: true,
              size: 21,
              font: 'Calibri',
              color: '575B62',
            }),
          ],
        }),
        buildApaWordTable(
          [
            t.apaGuide.pairCol,
            t.apaGuide.metricCol,
            t.apaGuide.strengthCol,
            'p',
            t.apaGuide.decisionCol,
          ],
          sec.apaBundle.relationshipRows.map((r) => [
            r.pairOrFactor,
            `${r.metricLabel}: ${r.metricValue}`,
            r.strengthTier,
            r.pValue,
            r.decisionLabel,
          ]),
          3
        )
      );
    }

    // Embedded Charts (PNG from SVG)
    for (const ch of sec.charts) {
      const png = await svgStringToPngBytes(ch.svg, ch.width, ch.height);
      if (png) {
        const targetWidth = 540;
        const targetHeight = Math.round((png.height / png.width) * targetWidth);
        children.push(
          new Paragraph({
            spacing: { before: 160, after: 60 },
            children: [
              new TextRun({
                text: `${t.docxModal.figurePrefix} ${figureCounter++}`,
                bold: true,
                size: 21,
                font: 'Calibri',
                color: '111315',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `${ch.label} — ${sec.testTitle}`,
                italics: true,
                size: 20,
                font: 'Calibri',
                color: '575B62',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 140 },
            children: [
              new ImageRun({
                type: 'png',
                data: png.bytes,
                transformation: {
                  width: targetWidth,
                  height: targetHeight,
                },
              }),
            ],
          })
        );
      }
    }

    // Interpretasi Penelitian (up to H0 ditolak / H0 gagal ditolak)
    if (options.includeInterpretation && sec.apaBundle) {
      children.push(
        new Paragraph({
          spacing: { before: 140, after: 60 },
          children: [
            new TextRun({
              text:
                sec.apaBundle.decisionVerdict !== 'descriptive' &&
                sec.apaBundle.verdictLabel
                  ? `${t.docxModal.interpretationHeading} (${sec.apaBundle.verdictLabel})`
                  : t.docxModal.interpretationHeading,
              bold: true,
              size: 21,
              font: 'Calibri',
              color:
                sec.apaBundle.decisionVerdict === 'rejected'
                  ? '15803D'
                  : sec.apaBundle.decisionVerdict === 'fail_to_reject'
                  ? 'B45309'
                  : '111315',
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 180 },
          children: [
            new TextRun({
              text: sec.apaBundle.researchInterpretation,
              size: 21,
              font: 'Calibri',
              color: '111315',
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }, // ~2cm academic margins
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}
