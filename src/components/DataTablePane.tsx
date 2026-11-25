import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart2,
  MoreVertical,
  Plus,
  Ruler,
  Search,
  Sigma,
  Tag,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { formatNum, toNumeric } from '../engine/statMath';
import { getT } from '../i18n/translations';
import type {
  CellValue,
  ColumnDef,
  Dataset,
  FormatConfig,
  Language,
  MeasurementScale,
  TransformTargetMode,
  TransformType,
} from '../types/stats';

interface DataTablePaneProps {
  dataset: Dataset;
  language: Language;
  formatConfig: FormatConfig;
  onUpdateCell: (rowIndex: number, colKey: string, value: CellValue) => void;
  onAddRow: () => void;
  onDeleteRow: (rowIndex: number) => void;
  onAddColumn: () => void;
  onRenameColumn: (colKey: string, newLabel: string) => void;
  onChangeScale: (colKey: string, scale: MeasurementScale) => void;
  onDeleteColumn: (colKey: string) => void;
  onTransformColumn: (
    colKey: string,
    transform: TransformType,
    mode: TransformTargetMode
  ) => void;
  onUndoTransform: () => void;
}

const ALL_TRANSFORMS: TransformType[] = [
  'zscore',
  'log10',
  'ln',
  'sqrt',
  'minmax',
  'rank',
  'center',
  'median_split',
];

export const DataTablePane: React.FC<DataTablePaneProps> = ({
  dataset,
  language,
  formatConfig,
  onUpdateCell,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onRenameColumn,
  onChangeScale,
  onDeleteColumn,
  onTransformColumn,
  onUndoTransform,
}) => {
  const t = getT(language);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortState, setSortState] = useState<{
    colKey: string;
    dir: 'asc' | 'desc';
  } | null>(null);
  const [editingCell, setEditingCell] = useState<{
    rowIdx: number;
    colKey: string;
  } | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [activeColMenu, setActiveColMenu] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformTargetMode>('new_column');
  const [renamingCol, setRenamingCol] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // Quick transform bar state
  const numericCols = useMemo(
    () => dataset.columns.filter((c) => c.scale !== 'nominal'),
    [dataset.columns]
  );
  const [barCol, setBarCol] = useState<string>(numericCols[0]?.key ?? '');
  const [barTransform, setBarTransform] = useState<TransformType>('zscore');

  const effectiveBarCol = numericCols.some((c) => c.key === barCol)
    ? barCol
    : numericCols[0]?.key ?? '';

  // Compute visible row indices preserving original row index for live editing
  const indexedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = dataset.rows.map((row, originalIndex) => ({ row, originalIndex }));
    if (q) {
      list = list.filter(({ row }) =>
        dataset.columns.some((c) => {
          const val = row[c.key];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
        })
      );
    }
    if (sortState) {
      const { colKey, dir } = sortState;
      list = [...list].sort((a, b) => {
        const va = a.row[colKey];
        const vb = b.row[colKey];
        if (va === null || va === undefined || va === '') return 1;
        if (vb === null || vb === undefined || vb === '') return -1;
        const na = toNumeric(va);
        const nb = toNumeric(vb);
        if (na !== null && nb !== null) {
          return dir === 'asc' ? na - nb : nb - na;
        }
        return dir === 'asc'
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
    }
    return list;
  }, [dataset.rows, dataset.columns, searchQuery, sortState]);

  const startEdit = (originalIndex: number, colKey: string, val: CellValue) => {
    setEditingCell({ rowIdx: originalIndex, colKey });
    setDraftValue(val === null || val === undefined ? '' : String(val));
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const trimmed = draftValue.trim();
    if (trimmed === '') {
      onUpdateCell(editingCell.rowIdx, editingCell.colKey, null);
    } else {
      const col = dataset.columns.find((c) => c.key === editingCell.colKey);
      const num = Number(trimmed.replace(/,/g, ''));
      if (col && col.scale !== 'nominal' && Number.isFinite(num)) {
        onUpdateCell(editingCell.rowIdx, editingCell.colKey, num);
      } else if (Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
        onUpdateCell(editingCell.rowIdx, editingCell.colKey, num);
      } else {
        onUpdateCell(editingCell.rowIdx, editingCell.colKey, trimmed);
      }
    }
    setEditingCell(null);
  };

  const cycleScale = (col: ColumnDef) => {
    const order: MeasurementScale[] = ['continuous', 'ordinal', 'nominal'];
    const next = order[(order.indexOf(col.scale) + 1) % order.length];
    onChangeScale(col.key, next);
  };

  const renderScaleIcon = (scale: MeasurementScale) => {
    if (scale === 'continuous') {
      return <Ruler className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#60A5FA]" />;
    }
    if (scale === 'ordinal') {
      return <BarChart2 className="w-3.5 h-3.5 text-[#B45309] dark:text-[#F59E0B]" />;
    }
    return <Tag className="w-3.5 h-3.5 text-[#15803D] dark:text-[#4ADE80]" />;
  };

  const cellPadding = formatConfig.density === 'compact' ? 'py-1.5 px-2.5' : 'py-2.5 px-3';

  return (
    <section
      aria-label={t.table.title}
      className="h-full flex flex-col bg-[#FFFFFF] dark:bg-[#111827] overflow-hidden"
      onClick={() => {
        if (activeColMenu) setActiveColMenu(null);
      }}
    >
      {/* Top Spreadsheet Toolbar */}
      <div className="px-3.5 py-2.5 border-b border-[#E2E8F0] dark:border-[#1F2937] flex flex-wrap items-center justify-between gap-2 bg-[#F8FAFC] dark:bg-[#0B0F17]">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-display text-xs font-semibold tracking-tight text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap">
            {t.table.title}
          </h2>
          <span className="text-[11px] font-mono-tabular text-[#64748B] dark:text-[#94A3B8] whitespace-nowrap">
            {indexedRows.length} {t.table.rowsCount} · {dataset.columns.length} {t.table.colsCount}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] dark:text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.table.searchPlaceholder}
              className="h-8 pl-8 pr-6 text-xs leading-normal rounded border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] w-44 focus:outline-none focus:border-[#1E40AF] dark:focus:border-[#3B82F6]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] dark:hover:text-[#F8FAFC] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onAddRow}
            className="h-8 px-2.5 text-xs font-medium rounded border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.table.addRow}
          </button>

          <button
            type="button"
            onClick={onAddColumn}
            className="h-8 px-2.5 text-xs font-medium rounded border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.table.addCol}
          </button>

          {dataset.undoStack.length > 0 && (
            <button
              type="button"
              onClick={onUndoTransform}
              className="h-8 inline-flex items-center gap-1 px-2.5 text-xs font-medium rounded border border-[#1E40AF]/30 dark:border-[#3B82F6]/40 text-[#1E40AF] dark:text-[#60A5FA] hover:bg-[#1E40AF]/5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Undo2 className="w-3 h-3" />
              <span>
                {t.table.undo} ({dataset.undoStack.length})
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Column Transform Strip (pure mathematical Sigma icon, zero AI sparkles) */}
      {numericCols.length > 0 && (
        <div className="px-3.5 py-2 border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#F1F5F9]/70 dark:bg-[#161E2E] flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#334155] dark:text-[#CBD5E1] whitespace-nowrap">
            <Sigma className="w-3.5 h-3.5 text-[#1E40AF] dark:text-[#60A5FA]" />
            <span>{t.table.transformCol}:</span>
          </span>
          <select
            value={effectiveBarCol}
            onChange={(e) => setBarCol(e.target.value)}
            className="h-8 px-2.5 py-0 text-xs leading-normal rounded border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC]"
          >
            {numericCols.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={barTransform}
            onChange={(e) => setBarTransform(e.target.value as TransformType)}
            className="h-8 px-2.5 py-0 text-xs leading-normal rounded border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC]"
          >
            {ALL_TRANSFORMS.map((tr) => (
              <option key={tr} value={tr}>
                {t.transforms[tr]}
              </option>
            ))}
          </select>
          <div className="h-8 inline-flex items-center rounded border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] p-0.5">
            <button
              type="button"
              onClick={() => setTransformMode('new_column')}
              className={`h-full px-2.5 text-[11px] rounded-xs transition-colors cursor-pointer whitespace-nowrap ${
                transformMode === 'new_column'
                  ? 'bg-[#0F172A] text-white dark:bg-[#3B82F6]'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              {t.table.asNewCol}
            </button>
            <button
              type="button"
              onClick={() => setTransformMode('in_place')}
              className={`h-full px-2.5 text-[11px] rounded-xs transition-colors cursor-pointer whitespace-nowrap ${
                transformMode === 'in_place'
                  ? 'bg-[#0F172A] text-white dark:bg-[#3B82F6]'
                  : 'text-[#64748B] dark:text-[#94A3B8]'
              }`}
            >
              {t.table.inPlace}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (effectiveBarCol) {
                onTransformColumn(effectiveBarCol, barTransform, transformMode);
              }
            }}
            className="h-8 px-3 text-xs font-medium rounded bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] text-white whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            {t.canvas.runTransform}
          </button>
        </div>
      )}

      {/* Spreadsheet Grid */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-[#F8FAFC] dark:bg-[#161E2E] border-b border-[#E2E8F0] dark:border-[#1F2937]">
            <tr>
              <th className="w-11 py-2 px-2 text-center font-mono-tabular text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] border-r border-[#E2E8F0] dark:border-[#1F2937]">
                #
              </th>
              {dataset.columns.map((col) => {
                const isSorted = sortState?.colKey === col.key;
                const isMenuOpen = activeColMenu === col.key;
                return (
                  <th
                    key={col.key}
                    className="relative min-w-[128px] py-2 px-2.5 text-left font-medium border-r border-[#E2E8F0] dark:border-[#1F2937] select-none"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            cycleScale(col);
                          }}
                          title={`${t.table.changeScale}: ${t.scales[col.scale]}`}
                          className="p-0.5 rounded hover:bg-[#E2E8F0]/70 dark:hover:bg-[#1E293B] shrink-0 cursor-pointer"
                        >
                          {renderScaleIcon(col.scale)}
                        </button>
                        {renamingCol === col.key ? (
                          <input
                            type="text"
                            autoFocus
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => {
                              if (renameDraft.trim()) {
                                onRenameColumn(col.key, renameDraft.trim());
                              }
                              setRenamingCol(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (renameDraft.trim()) {
                                  onRenameColumn(col.key, renameDraft.trim());
                                }
                                setRenamingCol(null);
                              } else if (e.key === 'Escape') {
                                setRenamingCol(null);
                              }
                            }}
                            className="w-24 px-1.5 py-0.5 text-xs bg-[#FFFFFF] dark:bg-[#111827] border border-[#1E40AF] dark:border-[#3B82F6] rounded"
                          />
                        ) : (
                          <span
                            className="font-display font-semibold text-[#0F172A] dark:text-[#F8FAFC] truncate"
                            title={col.label}
                          >
                            {col.label}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSortState((prev) => {
                              if (!prev || prev.colKey !== col.key) {
                                return { colKey: col.key, dir: 'asc' };
                              }
                              if (prev.dir === 'asc') {
                                return { colKey: col.key, dir: 'desc' };
                              }
                              return null;
                            });
                          }}
                          className={`p-0.5 rounded hover:bg-[#E2E8F0]/70 dark:hover:bg-[#1E293B] cursor-pointer ${
                            isSorted
                              ? 'text-[#1E40AF] dark:text-[#60A5FA]'
                              : 'text-[#64748B] dark:text-[#94A3B8]'
                          }`}
                          title={t.table.sortAsc}
                        >
                          {isSorted && sortState?.dir === 'desc' ? (
                            <ArrowDown className="w-3 h-3" />
                          ) : (
                            <ArrowUp className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveColMenu(isMenuOpen ? null : col.key);
                          }}
                          className="p-0.5 rounded text-[#64748B] dark:text-[#94A3B8] hover:bg-[#E2E8F0]/70 dark:hover:bg-[#1E293B] cursor-pointer"
                          aria-label={`Column menu for ${col.label}`}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {col.transformOrigin && col.transformType && (
                      <div className="mt-0.5 text-[10px] font-mono-tabular text-[#1E40AF] dark:text-[#60A5FA] truncate">
                        ← {col.transformOrigin} ({col.transformType})
                      </div>
                    )}

                    {/* Column Action Dropdown */}
                    {isMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-1 top-full mt-1 w-56 rounded-md border border-[#E2E8F0] dark:border-[#334155] bg-[#FFFFFF] dark:bg-[#111827] shadow-lg py-1.5 z-40"
                      >
                        <div className="px-3 py-1 text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                          {t.table.changeScale}
                        </div>
                        <div className="px-2 pb-1.5 flex gap-1">
                          {(['continuous', 'ordinal', 'nominal'] as MeasurementScale[]).map(
                            (sc) => (
                              <button
                                key={sc}
                                type="button"
                                onClick={() => {
                                  onChangeScale(col.key, sc);
                                  setActiveColMenu(null);
                                }}
                                className={`flex-1 py-1 text-[10px] rounded border cursor-pointer ${
                                  col.scale === sc
                                    ? 'border-[#1E40AF] bg-[#1E40AF]/10 text-[#1E40AF] dark:border-[#3B82F6] dark:text-[#60A5FA] font-semibold'
                                    : 'border-[#E2E8F0] dark:border-[#1F2937] text-[#475569] dark:text-[#94A3B8]'
                                }`}
                              >
                                {sc === 'continuous'
                                  ? 'Cont'
                                  : sc === 'ordinal'
                                  ? 'Ord'
                                  : 'Nom'}
                              </button>
                            )
                          )}
                        </div>

                        {col.scale !== 'nominal' && (
                          <>
                            <div className="border-t border-[#E2E8F0] dark:border-[#1F2937] my-1" />
                            <div className="px-3 py-1 text-[10px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
                              {t.table.transformCol} ({transformMode === 'new_column' ? t.table.asNewCol : t.table.inPlace})
                            </div>
                            <div className="max-h-44 overflow-y-auto">
                              {ALL_TRANSFORMS.map((tr) => (
                                <button
                                  key={tr}
                                  type="button"
                                  onClick={() => {
                                    onTransformColumn(col.key, tr, transformMode);
                                    setActiveColMenu(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] cursor-pointer"
                                >
                                  {t.transforms[tr]}
                                </button>
                              ))}
                            </div>
                          </>
                        )}

                        <div className="border-t border-[#E2E8F0] dark:border-[#1F2937] my-1" />
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingCol(col.key);
                            setRenameDraft(col.label);
                            setActiveColMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] cursor-pointer"
                        >
                          {t.table.renameCol}
                        </button>
                        {dataset.columns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteColumn(col.key);
                              setActiveColMenu(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-[#DC2626] dark:text-[#F87171] hover:bg-[#DC2626]/10 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{t.table.deleteCol}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </th>
                );
              })}
              <th className="w-9 py-2 px-1 text-center">
                <button
                  type="button"
                  onClick={onAddColumn}
                  title={t.table.addCol}
                  className="p-1 rounded text-[#64748B] hover:text-[#1E40AF] dark:text-[#94A3B8] dark:hover:text-[#60A5FA] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {indexedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={dataset.columns.length + 2}
                  className="py-12 px-4 text-center text-xs text-[#64748B] dark:text-[#94A3B8]"
                >
                  <p className="mb-2">{t.table.emptyRows}</p>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-3 py-1.5 rounded border border-[#E2E8F0] dark:border-[#1F2937] text-[#1E40AF] dark:text-[#60A5FA] font-medium cursor-pointer"
                    >
                      {t.table.resetFilter}
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              indexedRows.map(({ row, originalIndex }, displayIdx) => (
                <tr
                  key={originalIndex}
                  className="group border-b border-[#E2E8F0]/80 dark:border-[#1F2937] hover:bg-[#F8FAFC] dark:hover:bg-[#161E2E]/70 transition-colors"
                >
                  <td className="py-1 px-2 text-center font-mono-tabular text-[11px] text-[#64748B] dark:text-[#94A3B8] border-r border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC]/80 dark:bg-[#0B0F17]/50">
                    {displayIdx + 1}
                  </td>
                  {dataset.columns.map((col) => {
                    const val = row[col.key];
                    const isEditing =
                      editingCell?.rowIdx === originalIndex &&
                      editingCell?.colKey === col.key;
                    const isNumericCell =
                      typeof val === 'number' && col.scale !== 'nominal';

                    return (
                      <td
                        key={col.key}
                        onClick={() => {
                          if (!isEditing) startEdit(originalIndex, col.key, val);
                        }}
                        className={`${cellPadding} border-r border-[#E2E8F0]/80 dark:border-[#1F2937] cursor-text ${
                          col.scale !== 'nominal'
                            ? 'text-right font-mono-tabular'
                            : 'text-left'
                        }`}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={draftValue}
                            onChange={(e) => setDraftValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            className="w-full px-1.5 py-0.5 text-xs font-mono-tabular bg-[#FFFFFF] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC] border border-[#1E40AF] dark:border-[#3B82F6] rounded focus:outline-none"
                          />
                        ) : val === null || val === undefined || val === '' ? (
                          <span className="text-[#94A3B8] dark:text-[#475569]">—</span>
                        ) : isNumericCell ? (
                          <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                            {Number.isInteger(val)
                              ? formatConfig.thousandsSep
                                ? val.toLocaleString()
                                : String(val)
                              : formatNum(
                                  val,
                                  formatConfig.decimals,
                                  formatConfig.thousandsSep
                                )}
                          </span>
                        ) : (
                          <span className="text-[#0F172A] dark:text-[#F8FAFC]">
                            {String(val)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-1 px-1 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRow(originalIndex)}
                      title={t.table.deleteRow}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-[#64748B] hover:text-[#DC2626] dark:text-[#94A3B8] dark:hover:text-[#F87171] transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
