import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Database,
  FileText,
  FlaskConical,
  Maximize2,
  Plus,
  Sigma,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { formatNum, formatPValue } from '../engine/statMath';
import { getT } from '../i18n/translations';
import type {
  AnalysisConfig,
  AnalysisType,
  CanvasEdge,
  CanvasNode,
  CanvasNodeKind,
  Dataset,
  FormatConfig,
  Language,
  StatResult,
  TransformTargetMode,
  TransformType,
} from '../types/stats';

interface InfiniteCanvasViewProps {
  dataset: Dataset;
  analysisConfig: AnalysisConfig;
  statResult: StatResult;
  formatConfig: FormatConfig;
  language: Language;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onUpdateNodes: (nodes: CanvasNode[]) => void;
  onUpdateEdges: (edges: CanvasEdge[]) => void;
  onSelectTest: (test: AnalysisType) => void;
  onTransformColumn: (
    colKey: string,
    transform: TransformType,
    mode: TransformTargetMode
  ) => void;
  onOpenChartView: () => void;
}

const NODE_W = 248;

export const InfiniteCanvasView: React.FC<InfiniteCanvasViewProps> = ({
  dataset,
  analysisConfig,
  statResult,
  formatConfig,
  language,
  nodes,
  edges,
  onUpdateNodes,
  onUpdateEdges,
  onSelectTest,
  onTransformColumn,
  onOpenChartView,
}) => {
  const t = getT(language);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pan, setPan] = useState({ x: 36, y: 42 });
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    nodes[2]?.id ?? nodes[0]?.id ?? null
  );
  const [pendingFromNode, setPendingFromNode] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const dragRef = useRef<{
    type: 'pan' | 'node';
    nodeId?: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const numericCols = dataset.columns.filter((c) => c.scale !== 'nominal');

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    setShowAddMenu(false);
    setPendingFromNode(null);
    dragRef.current = {
      type: 'pan',
      startX: e.clientX,
      startY: e.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleNodePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    node: CanvasNode
  ) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    dragRef.current = {
      type: 'node',
      nodeId: node.id,
      startX: e.clientX,
      startY: e.clientY,
      originX: node.x,
      originY: node.y,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (drag.type === 'pan') {
      setPan({ x: drag.originX + dx, y: drag.originY + dy });
    } else if (drag.type === 'node' && drag.nodeId) {
      const worldDx = dx / zoom;
      const worldDy = dy / zoom;
      onUpdateNodes(
        nodes.map((n) =>
          n.id === drag.nodeId
            ? {
                ...n,
                x: Math.round((drag.originX + worldDx) / 10) * 10,
                y: Math.round((drag.originY + worldDy) / 10) * 10,
              }
            : n
        )
      );
    }
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom((z) => Math.max(0.4, Math.min(1.8, Number((z + delta).toFixed(2)))));
    }
  };

  const addNode = (kind: CanvasNodeKind) => {
    const id = `node_${Date.now()}`;
    const offset = (nodes.length % 5) * 35;
    const newNode: CanvasNode = {
      id,
      kind,
      title: t.canvas.nodeTypes[kind],
      subtitle:
        kind === 'transform'
          ? 'Z-Score'
          : kind === 'test'
          ? t.tests[analysisConfig.activeTest]
          : kind === 'chart'
          ? t.rightPane.chartBtn
          : kind === 'note'
          ? 'Memo'
          : dataset.name,
      x: 180 + offset,
      y: 120 + offset,
      testType: kind === 'test' ? analysisConfig.activeTest : undefined,
      transformType: kind === 'transform' ? 'zscore' : undefined,
      targetCol: kind === 'transform' ? numericCols[0]?.key ?? '' : undefined,
      noteText:
        kind === 'note'
          ? language === 'id'
            ? 'Hipotesis H1: Terdapat perbedaan signifikan antar kelompok.'
            : 'Hypothesis H1: Significant difference exists across groups.'
          : undefined,
    };
    onUpdateNodes([...nodes, newNode]);
    setSelectedNodeId(id);
    setShowAddMenu(false);
  };

  const autoArrange = () => {
    const order: Record<CanvasNodeKind, number> = {
      dataset: 0,
      transform: 1,
      test: 2,
      chart: 3,
      note: 2,
    };
    const colBuckets = new Map<number, CanvasNode[]>();
    nodes.forEach((n) => {
      const col = order[n.kind];
      const list = colBuckets.get(col) ?? [];
      list.push(n);
      colBuckets.set(col, list);
    });
    const arranged = nodes.map((n) => {
      const col = order[n.kind];
      const bucket = colBuckets.get(col) ?? [n];
      const rowIdx = bucket.findIndex((b) => b.id === n.id);
      return {
        ...n,
        x: 40 + col * 300,
        y: 40 + rowIdx * 175,
      };
    });
    onUpdateNodes(arranged);
    setPan({ x: 24, y: 36 });
    setZoom(0.9);
  };

  const handlePortClick = (
    e: React.MouseEvent,
    nodeId: string,
    portType: 'out' | 'in'
  ) => {
    e.stopPropagation();
    if (portType === 'out') {
      setPendingFromNode((prev) => (prev === nodeId ? null : nodeId));
    } else if (portType === 'in' && pendingFromNode && pendingFromNode !== nodeId) {
      const exists = edges.some(
        (ed) => ed.from === pendingFromNode && ed.to === nodeId
      );
      if (!exists) {
        onUpdateEdges([
          ...edges,
          { id: `edge_${Date.now()}`, from: pendingFromNode, to: nodeId },
        ]);
      }
      setPendingFromNode(null);
    }
  };

  const getNodeAccent = (kind: CanvasNodeKind) => {
    switch (kind) {
      case 'dataset':
        return 'border-[#CBD5E1] dark:border-[#334155]';
      case 'transform':
        return 'border-[#CBD5E1] dark:border-[#334155]';
      case 'test':
        return 'border-[#1E40AF]/60 dark:border-[#3B82F6]/60';
      case 'chart':
        return 'border-[#CBD5E1] dark:border-[#334155]';
      case 'note':
        return 'border-[#CBD5E1] dark:border-[#334155]';
    }
  };

  const renderNodeIcon = (kind: CanvasNodeKind) => {
    switch (kind) {
      case 'dataset':
        return <Database className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#2DD4BF]" />;
      case 'transform':
        return <Sigma className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F59E0B]" />;
      case 'test':
        return <FlaskConical className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#60A5FA]" />;
      case 'chart':
        return <BarChart3 className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#60A5FA]" />;
      case 'note':
        return <FileText className="w-3.5 h-3.5 text-[#475569] dark:text-[#94A3B8]" />;
    }
  };

  // Summary KPI metric shown inside statistical test nodes
  const getStatSummaryLine = () => {
    const d = formatConfig.decimals;
    const pFmt = (p: number) => formatPValue(p, formatConfig.apaPValues, d);
    switch (statResult.kind) {
      case 'descriptives':
        return `${statResult.rows.length} vars · N=${statResult.rows[0]?.n ?? 0}`;
      case 'ttest_ind':
        return `t(${statResult.studentDf})=${formatNum(statResult.studentT, 2, false)} · p=${pFmt(statResult.studentP)}`;
      case 'ttest_paired':
        return `t(${statResult.df})=${formatNum(statResult.t, 2, false)} · p=${pFmt(statResult.p)}`;
      case 'anova':
        return `F=${formatNum(statResult.f, 2, false)} · p=${pFmt(statResult.p)} · η²=${formatNum(statResult.etaSquared, 2, false)}`;
      case 'correlation':
        return `${statResult.method} · ${statResult.variables.length} vars`;
      case 'regression':
        return `R²=${formatNum(statResult.rSquared, 3, false)} · p=${pFmt(statResult.pModel)}`;
      case 'chisquare':
        return `χ²=${formatNum(statResult.chi2, 2, false)} · p=${pFmt(statResult.p)}`;
      default:
        return '—';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] dark:bg-[#0B0F17] overflow-hidden relative">
      {/* Canvas Control Bar */}
      <div className="px-4 py-2 border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={() => setShowAddMenu((v) => !v)}
            className="h-8 inline-flex items-center gap-1.5 px-3 text-xs font-medium rounded bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] text-white cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.canvas.addNode.replace('+ ', '')}</span>
          </button>

          {showAddMenu && (
            <div className="absolute left-0 top-full mt-1 w-52 rounded-md border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] shadow-lg py-1 z-40">
              {(['transform', 'test', 'chart', 'note'] as CanvasNodeKind[]).map(
                (k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => addNode(k)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] flex items-center gap-2 text-[#0F172A] dark:text-[#F8FAFC] cursor-pointer"
                  >
                    {renderNodeIcon(k)}
                    <span>{t.canvas.nodeTypes[k]}</span>
                  </button>
                )
              )}
            </div>
          )}

          <button
            type="button"
            onClick={autoArrange}
            className="h-8 px-2.5 text-xs font-medium rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] cursor-pointer whitespace-nowrap"
          >
            {t.canvas.autoLayout}
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="hidden xl:inline text-[11px] text-[#64748B] dark:text-[#94A3B8] mr-2">
            {t.canvas.connectHint}
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
            title={t.canvas.zoomOut}
            className="h-8 w-8 inline-flex items-center justify-center rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8] cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono-tabular text-[11px] w-11 text-center text-[#0F172A] dark:text-[#F8FAFC]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}
            title={t.canvas.zoomIn}
            className="h-8 w-8 inline-flex items-center justify-center rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8] cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setPan({ x: 36, y: 42 });
              setZoom(1);
            }}
            title={t.canvas.fitView}
            className="h-8 w-8 inline-flex items-center justify-center rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] text-[#475569] dark:text-[#94A3B8] cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Infinite Pan & Zoom Viewport */}
      <div
        ref={containerRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(100, 116, 139, 0.25) 1px, transparent 1px)',
          backgroundSize: `${22 * zoom}px ${22 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* World Transform Layer */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute inset-0 pointer-events-none"
        >
          {/* SVG Wires Layer */}
          <svg
            width="4000"
            height="4000"
            className="absolute -left-[500px] -top-[500px] overflow-visible pointer-events-none"
          >
            {edges.map((edge) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              const x1 = fromNode.x + NODE_W + 500;
              const y1 = fromNode.y + 52 + 500;
              const x2 = toNode.x + 500;
              const y2 = toNode.y + 52 + 500;
              const cx = Math.max(48, Math.abs(x2 - x1) * 0.45);
              const path = `M ${x1} ${y1} C ${x1 + cx} ${y1}, ${x2 - cx} ${y2}, ${x2} ${y2}`;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={edge.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke="currentColor"
                    className="text-[#1E40AF]/55 dark:text-[#60A5FA]/65"
                    strokeWidth="2"
                  />
                  <circle
                    cx={midX}
                    cy={midY}
                    r={8}
                    className="fill-[#FFFFFF] dark:fill-[#111827] stroke-[#CBD5E1] dark:stroke-[#334155] pointer-events-auto cursor-pointer hover:stroke-[#DC2626]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateEdges(edges.filter((ed) => ed.id !== edge.id));
                    }}
                  />
                  <text
                    x={midX}
                    y={midY + 3.5}
                    textAnchor="middle"
                    className="fill-[#475569] dark:fill-[#94A3B8] text-[10px] pointer-events-none"
                  >
                    ×
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Draggable Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isWireSource = pendingFromNode === node.id;

            return (
              <div
                key={node.id}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${NODE_W}px`,
                }}
                className={`absolute pointer-events-auto rounded-md border bg-[#FFFFFF] dark:bg-[#111827] shadow-sm transition-shadow ${getNodeAccent(
                  node.kind
                )} ${isSelected ? 'ring-2 ring-[#1E40AF]/35 dark:ring-[#3B82F6]/40' : ''}`}
              >
                {/* Input Port (left) */}
                {node.kind !== 'dataset' && (
                  <button
                    type="button"
                    onClick={(e) => handlePortClick(e, node.id, 'in')}
                    title="Input Port"
                    className={`w-3.5 h-3.5 rounded-full border-2 border-[#FFFFFF] dark:border-[#111827] absolute -left-2 top-11 cursor-crosshair transition-transform ${
                      pendingFromNode && pendingFromNode !== node.id
                        ? 'bg-[#15803D] scale-125'
                        : 'bg-[#94A3B8] hover:bg-[#1E40AF]'
                    }`}
                  />
                )}

                {/* Output Port (right) */}
                <button
                  type="button"
                  onClick={(e) => handlePortClick(e, node.id, 'out')}
                  title="Output Port"
                  className={`w-3.5 h-3.5 rounded-full border-2 border-[#FFFFFF] dark:border-[#111827] absolute -right-2 top-11 cursor-crosshair transition-transform ${
                    isWireSource
                      ? 'bg-[#1E40AF] scale-125'
                      : 'bg-[#1E40AF]/80 dark:bg-[#3B82F6] hover:scale-110'
                  }`}
                />

                {/* Node Header */}
                <div className="px-3 py-2 border-b border-[#E2E8F0] dark:border-[#1F2937] flex items-center justify-between gap-2 bg-[#F8FAFC] dark:bg-[#161E2E] rounded-t-md cursor-move">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {renderNodeIcon(node.kind)}
                    <span className="font-display text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                      {t.canvas.nodeTypes[node.kind]}
                    </span>
                  </div>
                  {node.kind !== 'dataset' && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateNodes(nodes.filter((n) => n.id !== node.id));
                        onUpdateEdges(
                          edges.filter(
                            (ed) => ed.from !== node.id && ed.to !== node.id
                          )
                        );
                      }}
                      title={t.canvas.deleteNode}
                      className="text-[#64748B] hover:text-[#DC2626] dark:text-[#94A3B8] dark:hover:text-[#F87171] cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Node Body */}
                <div
                  className="p-3 text-xs space-y-2"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {node.kind === 'dataset' && (
                    <div className="space-y-1">
                      <div className="font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate">
                        {language === 'id' ? dataset.nameId : dataset.name}
                      </div>
                      <div className="font-mono-tabular text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                        {dataset.rows.length} {t.table.rowsCount} ·{' '}
                        {dataset.columns.length} {t.table.colsCount}
                      </div>
                    </div>
                  )}

                  {node.kind === 'transform' && (
                    <div className="space-y-2">
                      <select
                        value={node.targetCol || numericCols[0]?.key || ''}
                        onChange={(e) =>
                          onUpdateNodes(
                            nodes.map((n) =>
                              n.id === node.id ? { ...n, targetCol: e.target.value } : n
                            )
                          )
                        }
                        className="w-full h-8 px-2 py-0 leading-normal text-[11px] rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC]"
                      >
                        {numericCols.map((c) => (
                          <option key={c.key} value={c.key}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={node.transformType ?? 'zscore'}
                        onChange={(e) =>
                          onUpdateNodes(
                            nodes.map((n) =>
                              n.id === node.id
                                ? {
                                    ...n,
                                    transformType: e.target.value as TransformType,
                                  }
                                : n
                            )
                          )
                        }
                        className="w-full h-8 px-2 py-0 leading-normal text-[11px] rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC]"
                      >
                        {(
                          [
                            'zscore',
                            'log10',
                            'ln',
                            'sqrt',
                            'minmax',
                            'rank',
                            'center',
                            'median_split',
                          ] as TransformType[]
                        ).map((tr) => (
                          <option key={tr} value={tr}>
                            {t.transforms[tr]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const col = node.targetCol || numericCols[0]?.key;
                          if (col) {
                            onTransformColumn(
                              col,
                              node.transformType ?? 'zscore',
                              'new_column'
                            );
                          }
                        }}
                        className="w-full h-7 text-[11px] font-medium rounded bg-[#0F172A] hover:bg-[#1E293B] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] text-white cursor-pointer"
                      >
                        {t.canvas.runTransform}
                      </button>
                    </div>
                  )}

                  {node.kind === 'test' && (
                    <div className="space-y-2">
                      <select
                        value={node.testType ?? analysisConfig.activeTest}
                        onChange={(e) => {
                          const nextTest = e.target.value as AnalysisType;
                          onUpdateNodes(
                            nodes.map((n) =>
                              n.id === node.id ? { ...n, testType: nextTest } : n
                            )
                          );
                          onSelectTest(nextTest);
                        }}
                        className="w-full h-8 px-2 py-0 leading-normal text-[11px] rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC]"
                      >
                        {(Object.keys(t.tests) as AnalysisType[]).map((tid) => (
                          <option key={tid} value={tid}>
                            {t.tests[tid]}
                          </option>
                        ))}
                      </select>
                      <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1F2937] font-mono-tabular text-[11px] text-[#0F172A] dark:text-[#F8FAFC]">
                        {getStatSummaryLine()}
                      </div>
                    </div>
                  )}

                  {node.kind === 'chart' && (
                    <div className="space-y-2">
                      <div className="p-2 rounded bg-[#F8FAFC] dark:bg-[#0B0F17] border border-[#E2E8F0] dark:border-[#1F2937] space-y-1">
                        <div className="text-[11px] font-medium text-[#0F172A] dark:text-[#F8FAFC] truncate">
                          {t.tests[analysisConfig.activeTest]}
                        </div>
                        <div className="font-mono-tabular text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                          {getStatSummaryLine()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenChartView}
                        className="w-full h-7 inline-flex items-center justify-center gap-1 text-[11px] font-medium rounded bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] text-white cursor-pointer"
                      >
                        <span>{t.canvas.openChart}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {node.kind === 'note' && (
                    <textarea
                      rows={3}
                      value={node.noteText ?? ''}
                      onChange={(e) =>
                        onUpdateNodes(
                          nodes.map((n) =>
                            n.id === node.id ? { ...n, noteText: e.target.value } : n
                          )
                        )
                      }
                      placeholder={t.canvas.notePlaceholder}
                      className="w-full px-2 py-1.5 text-[11px] rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC] resize-none focus:outline-none focus:border-[#1E40AF] dark:focus:border-[#3B82F6]"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
