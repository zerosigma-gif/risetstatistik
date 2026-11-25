export type Language = 'id' | 'en';
export type ThemeMode = 'light' | 'dark';

export type MeasurementScale = 'continuous' | 'ordinal' | 'nominal';

export type TransformType =
  | 'zscore'
  | 'log10'
  | 'ln'
  | 'sqrt'
  | 'minmax'
  | 'rank'
  | 'center'
  | 'median_split';

export type TransformTargetMode = 'new_column' | 'in_place';

export type AnalysisType =
  | 'descriptives'
  | 'ttest_ind'
  | 'ttest_paired'
  | 'anova'
  | 'correlation'
  | 'regression'
  | 'chisquare';

export type RightViewMode = 'chart' | 'canvas';

export type SplitPreset = '50-50' | '35-65' | '65-35' | 'table-only' | 'visual-only';

export type ChartSubType =
  | 'histogram'
  | 'boxplot'
  | 'means_ci'
  | 'scatter_reg'
  | 'corr_heatmap'
  | 'contingency_bar';

export type CellValue = string | number | null;

export interface ColumnDef {
  key: string;
  label: string;
  scale: MeasurementScale;
  transformOrigin?: string;
  transformType?: TransformType;
}

export type DataRow = Record<string, CellValue>;

export interface DatasetSnapshot {
  columns: ColumnDef[];
  rows: DataRow[];
  description: string;
}

export interface Dataset {
  id: string;
  name: string;
  nameId: string;
  sourceType: 'sample' | 'csv' | 'blank';
  columns: ColumnDef[];
  rows: DataRow[];
  undoStack: DatasetSnapshot[];
}

export interface FormatConfig {
  decimals: 2 | 3 | 4;
  density: 'compact' | 'comfortable';
  apaPValues: boolean;
  thousandsSep: boolean;
}

export interface AnalysisConfig {
  activeTest: AnalysisType;
  dependentVars: string[];
  groupingVar: string;
  pairedVarA: string;
  pairedVarB: string;
  independentVars: string[];
  categoricalVarA: string;
  categoricalVarB: string;
  corMethod: 'pearson' | 'spearman';
  alpha: number;
  showJitter: boolean;
  showRegCI: boolean;
}

export interface DescriptiveStatRow {
  variable: string;
  n: number;
  missing: number;
  mean: number;
  sd: number;
  variance: number;
  median: number;
  iqr: number;
  q1: number;
  q3: number;
  min: number;
  max: number;
  skewness: number;
  kurtosis: number;
  ciLower: number;
  ciUpper: number;
  values: number[];
}

export interface GroupSummary {
  group: string;
  n: number;
  mean: number;
  sd: number;
  se: number;
  ciLower: number;
  ciUpper: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  values: number[];
}

export interface TTestIndResult {
  kind: 'ttest_ind';
  dependentVar: string;
  groupingVar: string;
  groups: [GroupSummary, GroupSummary];
  studentT: number;
  studentDf: number;
  studentP: number;
  welchT: number;
  welchDf: number;
  welchP: number;
  meanDiff: number;
  seDiff: number;
  ciLower: number;
  ciUpper: number;
  cohensD: number;
  leveneF: number;
  leveneP: number;
}

export interface TTestPairedResult {
  kind: 'ttest_paired';
  varA: string;
  varB: string;
  n: number;
  meanA: number;
  sdA: number;
  meanB: number;
  sdB: number;
  meanDiff: number;
  sdDiff: number;
  seDiff: number;
  t: number;
  df: number;
  p: number;
  ciLower: number;
  ciUpper: number;
  cohensD: number;
  pairs: Array<{ a: number; b: number; diff: number }>;
}

export interface AnovaResult {
  kind: 'anova';
  dependentVar: string;
  groupingVar: string;
  groups: GroupSummary[];
  ssBetween: number;
  dfBetween: number;
  msBetween: number;
  ssWithin: number;
  dfWithin: number;
  msWithin: number;
  ssTotal: number;
  dfTotal: number;
  f: number;
  p: number;
  etaSquared: number;
  omegaSquared: number;
}

export interface CorrelationPair {
  varA: string;
  varB: string;
  r: number;
  p: number;
  n: number;
}

export interface CorrelationResult {
  kind: 'correlation';
  method: 'pearson' | 'spearman';
  variables: string[];
  matrix: Record<string, Record<string, { r: number; p: number; n: number }>>;
}

export interface RegressionCoefRow {
  term: string;
  b: number;
  se: number;
  beta: number | null;
  t: number;
  p: number;
}

export interface RegressionResult {
  kind: 'regression';
  dependentVar: string;
  independentVars: string[];
  n: number;
  r: number;
  rSquared: number;
  adjRSquared: number;
  rmse: number;
  f: number;
  dfModel: number;
  dfResidual: number;
  pModel: number;
  coefficients: RegressionCoefRow[];
  points: Array<{ x: number; y: number; fitted: number; residual: number }>;
  predictorSeries: Array<{
    predictor: string;
    coef: RegressionCoefRow;
    points: Array<{ x: number; y: number; fitted: number; residual: number }>;
  }>;
  primaryPredictor: string;
}

export interface ChiSquareResult {
  kind: 'chisquare';
  varA: string;
  varB: string;
  rowLevels: string[];
  colLevels: string[];
  observed: number[][];
  expected: number[][];
  rowTotals: number[];
  colTotals: number[];
  grandTotal: number;
  chi2: number;
  df: number;
  p: number;
  cramersV: number;
}

export interface DescriptivesResult {
  kind: 'descriptives';
  rows: DescriptiveStatRow[];
}

export interface StatErrorResult {
  kind: 'error';
  messageKey: string;
  detail?: string;
}

export type StatResult =
  | DescriptivesResult
  | TTestIndResult
  | TTestPairedResult
  | AnovaResult
  | CorrelationResult
  | RegressionResult
  | ChiSquareResult
  | StatErrorResult;

export type CanvasNodeKind = 'dataset' | 'transform' | 'test' | 'chart' | 'note';

export interface CanvasNode {
  id: string;
  kind: CanvasNodeKind;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  testType?: AnalysisType;
  transformType?: TransformType;
  targetCol?: string;
  chartType?: ChartSubType;
  noteText?: string;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
}
