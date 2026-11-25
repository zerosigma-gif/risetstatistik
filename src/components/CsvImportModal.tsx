import React, { useMemo, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { parseCsvText } from '../engine/statMath';
import { getT } from '../i18n/translations';
import type { Dataset, Language } from '../types/stats';

interface CsvImportModalProps {
  isOpen: boolean;
  language: Language;
  onClose: () => void;
  onImport: (dataset: Dataset) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  language,
  onClose,
  onImport,
}) => {
  const t = getT(language);
  const [rawText, setRawText] = useState(
    'Subject,Group,Pre_Score,Post_Score\nS01,Control,64,66\nS02,Control,68,70\nS03,Control,61,63\nS04,Treatment,63,79\nS05,Treatment,66,83\nS06,Treatment,60,77'
  );
  const [datasetName, setDatasetName] = useState('Custom_Research_Data');

  const previewDataset = useMemo(
    () => parseCsvText(rawText, datasetName),
    [rawText, datasetName]
  );

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const baseName = file.name.replace(/\.(csv|tsv|txt)$/i, '');
    setDatasetName(baseName || 'Imported_CSV');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawText(reader.result);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-modal-title"
    >
      <div className="w-full max-w-xl rounded-md border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] shadow-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17] flex items-center justify-between">
          <div>
            <h3
              id="csv-modal-title"
              className="font-display text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC]"
            >
              {t.csvModal.title}
            </h3>
            <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] mt-0.5">
              {t.csvModal.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-[#64748B] hover:text-[#0F172A] dark:text-[#94A3B8] dark:hover:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
                {t.csvModal.datasetName}
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full h-9 px-3 py-0 leading-normal text-xs rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#1E40AF] dark:focus:border-[#3B82F6]"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="h-9 inline-flex items-center justify-center gap-2 px-3 text-xs font-medium rounded border border-dashed border-[#1E40AF] dark:border-[#3B82F6] text-[#1E40AF] dark:text-[#60A5FA] hover:bg-[#1E40AF]/5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{t.csvModal.chooseFile}</span>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] mb-1">
              {t.csvModal.pasteLabel}
            </label>
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono-tabular rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17] text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:border-[#1E40AF] dark:focus:border-[#3B82F6]"
            />
          </div>

          {previewDataset ? (
            <div className="p-3 rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#F8FAFC] dark:bg-[#0B0F17] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#0F172A] dark:text-[#F8FAFC]">
                  {t.csvModal.preview}
                </span>
                <span className="font-mono-tabular text-[#475569] dark:text-[#94A3B8]">
                  {previewDataset.rows.length} {t.table.rowsCount} ·{' '}
                  {previewDataset.columns.length} {t.table.colsCount}
                </span>
              </div>
              <div className="text-[11px] font-mono-tabular text-[#475569] dark:text-[#94A3B8] truncate">
                {previewDataset.columns
                  .map((c) => `${c.label} (${c.scale})`)
                  .join(' · ')}
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#DC2626] dark:text-[#F87171]">
              {t.csvModal.errorEmpty}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[#E2E8F0] dark:border-[#1F2937] flex items-center justify-end gap-2 bg-[#F8FAFC] dark:bg-[#0B0F17]">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 text-xs font-medium rounded border border-[#E2E8F0] dark:border-[#1F2937] bg-[#FFFFFF] dark:bg-[#111827] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] cursor-pointer"
          >
            {t.csvModal.cancel}
          </button>
          <button
            type="button"
            disabled={!previewDataset}
            onClick={() => {
              if (previewDataset) {
                onImport(previewDataset);
                onClose();
              }
            }}
            className="h-8 px-4 text-xs font-medium rounded bg-[#1E40AF] hover:bg-[#1E3A8A] dark:bg-[#3B82F6] dark:hover:bg-[#2563EB] disabled:opacity-40 text-white cursor-pointer"
          >
            {t.csvModal.loadBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
