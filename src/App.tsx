import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, GripVertical, Network, Sliders } from 'lucide-react';
import { ChartLabView } from './components/ChartLabView';
import { CsvImportModal } from './components/CsvImportModal';
import { DataTablePane } from './components/DataTablePane';
import { DocxReportModal } from './components/DocxReportModal';
import { InfiniteCanvasView } from './components/InfiniteCanvasView';
import { TopHeader } from './components/TopHeader';
import { VariableConfigStrip } from './components/VariableConfigStrip';
import {
  createClinicalDataset,
  SAMPLE_DATASET_FACTORIES,
} from './data/sampleDatasets';
import {
  applyColumnTransform,
  inferDefaultAnalysisForDataset,
  runStatisticalAnalysis,
  serializeDatasetToCsv,
} from './engine/statMath';
import { getT } from './i18n/translations';
import type {
  AnalysisConfig,
  AnalysisType,
  CanvasEdge,
  CanvasNode,
  CellValue,
  Dataset,
  FormatConfig,
  Language,
  MeasurementScale,
  RightViewMode,
  SplitPreset,
  ThemeMode,
  TransformTargetMode,
  TransformType,
} from './types/stats';

function buildInitialNodes(dataset: Dataset, activeTest: AnalysisType): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
} {
  const firstNumeric =
    dataset.columns.find((c) => c.scale !== 'nominal')?.key ??
    dataset.columns[0]?.key ??
    '';

  const nodes: CanvasNode[] = [
    {
      id: 'n_dataset',
      kind: 'dataset',
      title: 'Dataset Source',
      subtitle: dataset.name,
      x: 30,
      y: 60,
    },
    {
      id: 'n_transform',
      kind: 'transform',
      title: 'Column Transform',
      subtitle: 'Z-Score',
      x: 320,
      y: 190,
      transformType: 'zscore',
      targetCol: firstNumeric,
    },
    {
      id: 'n_test',
      kind: 'test',
      title: 'Statistical Test',
      subtitle: activeTest,
      x: 320,
      y: 20,
      testType: activeTest,
    },
    {
      id: 'n_chart',
      kind: 'chart',
      title: 'Chart Output',
      subtitle: 'Grafik Chart',
      x: 620,
      y: 60,
    },
  ];

  const edges: CanvasEdge[] = [
    { id: 'e_1', from: 'n_dataset', to: 'n_test' },
    { id: 'e_2', from: 'n_dataset', to: 'n_transform' },
    { id: 'e_3', from: 'n_test', to: 'n_chart' },
  ];

  return { nodes, edges };
}

export default function App() {
  const initialBundle = useMemo(() => createClinicalDataset(), []);

  const [language, setLanguage] = useState<Language>('id');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [dataset, setDataset] = useState<Dataset>(initialBundle.dataset);
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig>(
    initialBundle.defaultAnalysis
  );
  const [formatConfig, setFormatConfig] = useState<FormatConfig>({
    decimals: 3,
    density: 'compact',
    apaPValues: true,
    thousandsSep: false,
  });

  const [splitPreset, setSplitPreset] = useState<SplitPreset>('50-50');
  const [splitRatio, setSplitRatio] = useState<number>(48);
  const [rightViewMode, setRightViewMode] = useState<RightViewMode>('chart');
  const [showVarConfig, setShowVarConfig] = useState<boolean>(true);
  const [csvModalOpen, setCsvModalOpen] = useState<boolean>(false);
  const [docxModalOpen, setDocxModalOpen] = useState<boolean>(false);

  const initialGraph = useMemo(
    () =>
      buildInitialNodes(
        initialBundle.dataset,
        initialBundle.defaultAnalysis.activeTest
      ),
    [initialBundle]
  );
  const [canvasNodes, setCanvasNodes] = useState<CanvasNode[]>(initialGraph.nodes);
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdge[]>(initialGraph.edges);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef<boolean>(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.max(22, Math.min(78, pct));
      setSplitRatio(Math.round(clamped * 10) / 10);
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const t = getT(language);

  const handleSelectSplit = (preset: SplitPreset) => {
    setSplitPreset(preset);
    if (preset === '50-50') setSplitRatio(50);
    else if (preset === '35-65') setSplitRatio(35);
    else if (preset === '65-35') setSplitRatio(65);
  };

  const handleLoadSample = (sampleId: string) => {
    const factory = SAMPLE_DATASET_FACTORIES.find((s) => s.id === sampleId);
    if (!factory) return;
    const bundle = factory.create();
    setDataset(bundle.dataset);
    setAnalysisConfig(bundle.defaultAnalysis);
    const graph = buildInitialNodes(
      bundle.dataset,
      bundle.defaultAnalysis.activeTest
    );
    setCanvasNodes(graph.nodes);
    setCanvasEdges(graph.edges);
  };

  const handleImportCsv = (imported: Dataset) => {
    const inferred = inferDefaultAnalysisForDataset(imported);
    setDataset(imported);
    setAnalysisConfig(inferred);
    const graph = buildInitialNodes(imported, inferred.activeTest);
    setCanvasNodes(graph.nodes);
    setCanvasEdges(graph.edges);
  };

  const handleExportCsv = () => {
    const csv = serializeDatasetToCsv(dataset);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.id}_transformed.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateBlankDataset = () => {
    const blank: Dataset = {
      id: `blank_${Date.now()}`,
      name: 'Blank Research Sheet',
      nameId: 'Lembar Riset Kosong',
      sourceType: 'blank',
      undoStack: [],
      columns: [
        { key: 'Group', label: 'Group', scale: 'nominal' },
        { key: 'Score_A', label: 'Score_A', scale: 'continuous' },
        { key: 'Score_B', label: 'Score_B', scale: 'continuous' },
      ],
      rows: [
        { Group: 'A', Score_A: 12, Score_B: 18 },
        { Group: 'A', Score_A: 14, Score_B: 21 },
        { Group: 'A', Score_A: 15, Score_B: 22 },
        { Group: 'B', Score_A: 19, Score_B: 27 },
        { Group: 'B', Score_A: 21, Score_B: 30 },
        { Group: 'B', Score_A: 22, Score_B: 31 },
      ],
    };
    const inferred = inferDefaultAnalysisForDataset(blank);
    setDataset(blank);
    setAnalysisConfig(inferred);
    const graph = buildInitialNodes(blank, inferred.activeTest);
    setCanvasNodes(graph.nodes);
    setCanvasEdges(graph.edges);
  };

  const handleUpdateCell = (rowIndex: number, colKey: string, value: CellValue) => {
    setDataset((prev) => {
      const nextRows = prev.rows.map((r, idx) =>
        idx === rowIndex ? { ...r, [colKey]: value } : r
      );
      return { ...prev, rows: nextRows };
    });
  };

  const handleAddRow = () => {
    setDataset((prev) => {
      const blankRow: Record<string, CellValue> = {};
      prev.columns.forEach((c) => {
        blankRow[c.key] = null;
      });
      return { ...prev, rows: [...prev.rows, blankRow] };
    });
  };

  const handleDeleteRow = (rowIndex: number) => {
    setDataset((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, idx) => idx !== rowIndex),
    }));
  };

  const handleAddColumn = () => {
    setDataset((prev) => {
      let idx = prev.columns.length + 1;
      let key = `Var_${idx}`;
      while (prev.columns.some((c) => c.key === key)) {
        idx++;
        key = `Var_${idx}`;
      }
      const nextCols = [
        ...prev.columns,
        { key, label: key, scale: 'continuous' as MeasurementScale },
      ];
      const nextRows = prev.rows.map((r) => ({ ...r, [key]: 0 }));
      return { ...prev, columns: nextCols, rows: nextRows };
    });
  };

  const handleRenameColumn = (colKey: string, newLabel: string) => {
    setDataset((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.key === colKey ? { ...c, label: newLabel } : c
      ),
    }));
  };

  const handleChangeScale = (colKey: string, scale: MeasurementScale) => {
    setDataset((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.key === colKey ? { ...c, scale } : c
      ),
    }));
    if (scale === 'nominal') {
      setAnalysisConfig((prev) => ({
        ...prev,
        dependentVars: prev.dependentVars.filter((k) => k !== colKey),
        independentVars: prev.independentVars.filter((k) => k !== colKey),
      }));
    }
  };

  const handleDeleteColumn = (colKey: string) => {
    setDataset((prev) => {
      if (prev.columns.length <= 1) return prev;
      const nextCols = prev.columns.filter((c) => c.key !== colKey);
      const nextRows = prev.rows.map((r) => {
        const copy = { ...r };
        delete copy[colKey];
        return copy;
      });
      return { ...prev, columns: nextCols, rows: nextRows };
    });
    setAnalysisConfig((prev) => ({
      ...prev,
      dependentVars: prev.dependentVars.filter((k) => k !== colKey),
      independentVars: prev.independentVars.filter((k) => k !== colKey),
      groupingVar: prev.groupingVar === colKey ? '' : prev.groupingVar,
      pairedVarA: prev.pairedVarA === colKey ? '' : prev.pairedVarA,
      pairedVarB: prev.pairedVarB === colKey ? '' : prev.pairedVarB,
      categoricalVarA: prev.categoricalVarA === colKey ? '' : prev.categoricalVarA,
      categoricalVarB: prev.categoricalVarB === colKey ? '' : prev.categoricalVarB,
    }));
  };

  const handleTransformColumn = (
    colKey: string,
    transform: TransformType,
    mode: TransformTargetMode
  ) => {
    setDataset((prev) => applyColumnTransform(prev, colKey, transform, mode));
  };

  const handleUndoTransform = () => {
    setDataset((prev) => {
      if (prev.undoStack.length === 0) return prev;
      const last = prev.undoStack[prev.undoStack.length - 1];
      return {
        ...prev,
        columns: last.columns,
        rows: last.rows,
        undoStack: prev.undoStack.slice(0, -1),
      };
    });
  };

  const handleSelectTest = (test: AnalysisType) => {
    const validNumeric = dataset.columns
      .filter((c) => c.scale !== 'nominal')
      .map((c) => c.key);
    const validCategorical = dataset.columns
      .filter((c) => c.scale === 'nominal' || c.scale === 'ordinal')
      .map((c) => c.key);

    setAnalysisConfig((prev) => {
      if (test === 'regression') {
        if (prev.dependentVars.length >= 2) {
          const target = prev.dependentVars[prev.dependentVars.length - 1];
          const preds = prev.dependentVars.slice(0, -1);
          return {
            ...prev,
            activeTest: test,
            dependentVars: [target],
            independentVars: preds,
          };
        }
        const dep =
          prev.dependentVars[0] && validNumeric.includes(prev.dependentVars[0])
            ? prev.dependentVars[0]
            : validNumeric[0] ?? '';
        const cleanPreds = prev.independentVars.filter(
          (k) => k !== dep && validNumeric.includes(k)
        );
        return {
          ...prev,
          activeTest: test,
          dependentVars: dep ? [dep] : [],
          independentVars: cleanPreds,
        };
      }

      if (test === 'ttest_ind' || test === 'anova') {
        const dep =
          prev.dependentVars[0] && validNumeric.includes(prev.dependentVars[0])
            ? prev.dependentVars[0]
            : validNumeric[0] ?? '';
        const grp =
          prev.groupingVar &&
          dataset.columns.some((c) => c.key === prev.groupingVar)
            ? prev.groupingVar
            : validCategorical[0] ?? dataset.columns[0]?.key ?? '';
        return {
          ...prev,
          activeTest: test,
          dependentVars: dep ? [dep] : [],
          groupingVar: grp,
        };
      }

      return { ...prev, activeTest: test };
    });
    setCanvasNodes((prev) =>
      prev.map((n) => (n.kind === 'test' ? { ...n, testType: test } : n))
    );
    if (splitPreset === 'table-only') {
      setSplitPreset('50-50');
      setSplitRatio(50);
    }
  };

  const statResult = useMemo(
    () => runStatisticalAnalysis(dataset, analysisConfig),
    [dataset, analysisConfig]
  );

  const numericColumns = useMemo(
    () => dataset.columns.filter((c) => c.scale !== 'nominal'),
    [dataset.columns]
  );

  const showLeftPane = splitPreset !== 'visual-only';
  const showRightPane = splitPreset !== 'table-only';

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC]">
      <TopHeader
        language={language}
        onToggleLanguage={setLanguage}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        datasetName={language === 'id' ? dataset.nameId : dataset.name}
        rowCount={dataset.rows.length}
        colCount={dataset.columns.length}
        splitPreset={splitPreset}
        onSelectSplit={handleSelectSplit}
        onLoadSample={handleLoadSample}
        onOpenCsvImport={() => setCsvModalOpen(true)}
        onExportCsv={handleExportCsv}
        onCreateBlankDataset={handleCreateBlankDataset}
        onAddRow={handleAddRow}
        onAddColumn={handleAddColumn}
        formatConfig={formatConfig}
        onChangeFormat={(next) => setFormatConfig((p) => ({ ...p, ...next }))}
        numericColumns={numericColumns}
        onQuickTransform={(colKey, tr) =>
          handleTransformColumn(colKey, tr, 'new_column')
        }
        activeTest={analysisConfig.activeTest}
        onSelectTest={handleSelectTest}
        onOpenDocxReport={() => setDocxModalOpen(true)}
      />

      {/* Main Split Workspace */}
      <main
        ref={workspaceRef}
        className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden"
      >
        {/* LEFT PANE: Transformable Data Table */}
        {showLeftPane && (
          <div
            style={
              showRightPane
                ? { flexBasis: `${splitRatio}%`, flexShrink: 0, flexGrow: 0 }
                : { flexBasis: '100%', flexGrow: 1 }
            }
            className="min-w-0 min-h-[300px] lg:min-h-0 h-1/2 lg:h-full overflow-hidden border-b lg:border-b-0 border-[#E2E8F0] dark:border-[#1F2937]"
          >
            <DataTablePane
              dataset={dataset}
              language={language}
              formatConfig={formatConfig}
              onUpdateCell={handleUpdateCell}
              onAddRow={handleAddRow}
              onDeleteRow={handleDeleteRow}
              onAddColumn={handleAddColumn}
              onRenameColumn={handleRenameColumn}
              onChangeScale={handleChangeScale}
              onDeleteColumn={handleDeleteColumn}
              onTransformColumn={handleTransformColumn}
              onUndoTransform={handleUndoTransform}
            />
          </div>
        )}

        {/* Draggable Split Gutter */}
        {showLeftPane && showRightPane && (
          <div
            role="separator"
            aria-orientation="vertical"
            onMouseDown={() => {
              isResizingRef.current = true;
            }}
            className="hidden lg:flex w-1.5 shrink-0 items-center justify-center bg-[#F1F5F9] dark:bg-[#0B0F17] border-x border-[#E2E8F0] dark:border-[#1F2937] hover:bg-[#CBD5E1] dark:hover:bg-[#1E293B] cursor-col-resize transition-colors select-none"
          >
            <GripVertical className="w-3 h-3 text-[#64748B] dark:text-[#64748B]" />
          </div>
        )}

        {/* RIGHT PANE: Grafik Chart & Infinite Canvas Node Buttons + Active Lab */}
        {showRightPane && (
          <section className="flex-1 min-w-0 min-h-0 h-1/2 lg:h-full flex flex-col overflow-hidden bg-[#FFFFFF] dark:bg-[#111827]">
            {/* Right Pane View Mode Bar */}
            <div className="px-4 py-2 border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div
                className="inline-flex items-center gap-1 p-0.5 rounded-md border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F1F5F9] dark:bg-[#0B0F17]"
                role="tablist"
                aria-label="Right panel view mode"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={rightViewMode === 'chart'}
                  onClick={() => setRightViewMode('chart')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    rightViewMode === 'chart'
                      ? 'bg-[#0F172A] text-white dark:bg-[#3B82F6]'
                      : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{t.rightPane.chartBtn}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={rightViewMode === 'canvas'}
                  onClick={() => setRightViewMode('canvas')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    rightViewMode === 'canvas'
                      ? 'bg-[#0F172A] text-white dark:bg-[#3B82F6]'
                      : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>{t.rightPane.canvasBtn}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-medium text-[#475569] dark:text-[#94A3B8] whitespace-nowrap">
                  {t.tests[analysisConfig.activeTest]}
                </span>
                <button
                  type="button"
                  onClick={() => setShowVarConfig((v) => !v)}
                  className={`h-7 inline-flex items-center gap-1.5 px-2.5 text-xs font-medium rounded border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    showVarConfig
                      ? 'border-[#1E40AF] text-[#1E40AF] dark:border-[#3B82F6] dark:text-[#60A5FA] bg-[#1E40AF]/5 dark:bg-[#3B82F6]/10'
                      : 'border-[#E2E8F0] dark:border-[#1F2937] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B]'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>
                    {showVarConfig ? t.rightPane.hideVars : t.rightPane.showVars}
                  </span>
                </button>
              </div>
            </div>

            {/* Variable Assignment Strip */}
            {showVarConfig && (
              <VariableConfigStrip
                columns={dataset.columns}
                config={analysisConfig}
                language={language}
                onChange={(next) =>
                  setAnalysisConfig((prev) => ({ ...prev, ...next }))
                }
              />
            )}

            {/* Active Right Viewport */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {rightViewMode === 'chart' ? (
                <ChartLabView
                  result={statResult}
                  dataset={dataset}
                  config={analysisConfig}
                  formatConfig={formatConfig}
                  language={language}
                  onChangeConfig={(next) =>
                    setAnalysisConfig((prev) => ({ ...prev, ...next }))
                  }
                  onSelectTest={handleSelectTest}
                />
              ) : (
                <InfiniteCanvasView
                  dataset={dataset}
                  analysisConfig={analysisConfig}
                  statResult={statResult}
                  formatConfig={formatConfig}
                  language={language}
                  nodes={canvasNodes}
                  edges={canvasEdges}
                  onUpdateNodes={setCanvasNodes}
                  onUpdateEdges={setCanvasEdges}
                  onSelectTest={handleSelectTest}
                  onTransformColumn={handleTransformColumn}
                  onOpenChartView={() => setRightViewMode('chart')}
                />
              )}
            </div>
          </section>
        )}
      </main>

      <CsvImportModal
        isOpen={csvModalOpen}
        language={language}
        onClose={() => setCsvModalOpen(false)}
        onImport={handleImportCsv}
      />

      <DocxReportModal
        isOpen={docxModalOpen}
        dataset={dataset}
        analysisConfig={analysisConfig}
        formatConfig={formatConfig}
        language={language}
        onClose={() => setDocxModalOpen(false)}
        onChangeAlpha={(alpha) =>
          setAnalysisConfig((prev) => ({ ...prev, alpha }))
        }
      />
    </div>
  );
}
