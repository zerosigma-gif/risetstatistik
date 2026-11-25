import React, { useState } from 'react';
import { BookOpen, Check, CheckCircle2, Copy, MinusCircle } from 'lucide-react';
import { getT } from '../i18n/translations';
import type { Language } from '../types/stats';
import type { ApaReportBundle } from '../utils/apaAnalysis';

interface ApaGuideDrawerProps {
  bundle: ApaReportBundle;
  alpha: number;
  language: Language;
  testTitle: string;
}

export const ApaGuideDrawer: React.FC<ApaGuideDrawerProps> = ({
  bundle,
  alpha,
  language,
  testTitle,
}) => {
  const t = getT(language);
  const [copied, setCopied] = useState(false);

  const handleCopyApa = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(bundle.apaSentence);
      } else {
        const ta = document.createElement('textarea');
        ta.value = bundle.apaSentence;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked in sandboxed iframe; fallback silent
    }
  };

  return (
    <div className="animate-slide-down border-b border-[#E2DFD7] dark:border-[#262B36] bg-[#FAF9F6] dark:bg-[#0B0D10] px-5 py-4 space-y-4 text-xs max-h-[48vh] overflow-y-auto">
      {/* Drawer Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E2DFD7] dark:border-[#262B36]">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#1D4ED8] dark:text-[#60A5FA] shrink-0" />
          <span className="font-display text-xs font-semibold text-[#111315] dark:text-[#F3F4F6]">
            {t.apaGuide.sectionTitle}
          </span>
          <span aria-hidden="true" className="text-[#575B62] dark:text-[#9CA3AF]">
            ·
          </span>
          <span className="text-[#575B62] dark:text-[#9CA3AF]">{testTitle}</span>
        </div>

        <div className="flex items-center gap-2 font-mono-tabular text-[11px]">
          <span className="text-[#575B62] dark:text-[#9CA3AF]">
            α = {alpha.toFixed(2)} ({bundle.confidencePct}% CI)
          </span>
          {bundle.decisionVerdict !== 'descriptive' && bundle.verdictLabel && (
            <>
              <span aria-hidden="true" className="text-[#575B62] dark:text-[#9CA3AF]">
                ·
              </span>
              {bundle.decisionVerdict === 'rejected' ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[#15803D] dark:text-[#4ADE80]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{bundle.verdictLabel}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-[#B45309] dark:text-[#FBBF24]">
                  <MinusCircle className="w-3.5 h-3.5" />
                  <span>{bundle.verdictLabel}</span>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 1. Hypothesis Formulation & Decision Rule (Inferential tests only; hidden for Descriptives) */}
      {bundle.decisionVerdict !== 'descriptive' && (
        <div className="space-y-2">
          <h4 className="font-display text-xs font-semibold text-[#111315] dark:text-[#F3F4F6]">
            {t.apaGuide.hypothesisTitle}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-[12px] leading-relaxed">
            <div>
              <span className="font-semibold text-[#575B62] dark:text-[#9CA3AF]">
                {t.apaGuide.h0Title}:{' '}
              </span>
              <span className="text-[#111315] dark:text-[#E5E7EB]">{bundle.h0Statement}</span>
            </div>
            <div>
              <span className="font-semibold text-[#575B62] dark:text-[#9CA3AF]">
                {t.apaGuide.h1Title}:{' '}
              </span>
              <span className="text-[#111315] dark:text-[#E5E7EB]">{bundle.h1Statement}</span>
            </div>
            <div>
              <span className="font-semibold text-[#575B62] dark:text-[#9CA3AF]">
                {t.apaGuide.ruleTitle}:{' '}
              </span>
              <span className="text-[#111315] dark:text-[#E5E7EB]">{bundle.decisionRule}</span>
            </div>
            <div>
              <span className="font-semibold text-[#575B62] dark:text-[#9CA3AF]">
                {t.apaGuide.verdictTitle}:{' '}
              </span>
              <span
                className={`font-semibold ${
                  bundle.decisionVerdict === 'rejected'
                    ? 'text-[#15803D] dark:text-[#4ADE80]'
                    : 'text-[#B45309] dark:text-[#FBBF24]'
                }`}
              >
                {bundle.verdictLabel}
              </span>
              <span className="text-[#575B62] dark:text-[#9CA3AF]">
                {' '}
                — {bundle.overallStrengthSummary}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. APA 7th Edition Reporting Standards + Copyable Citation */}
      <div
        className={`${
          bundle.decisionVerdict !== 'descriptive'
            ? 'pt-3 border-t border-[#E2DFD7] dark:border-[#262B36]'
            : ''
        } space-y-2.5`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-display text-xs font-semibold text-[#111315] dark:text-[#F3F4F6]">
            {t.apaGuide.rulesTitle}
          </h4>
          <button
            type="button"
            onClick={handleCopyApa}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded border border-[#E2DFD7] dark:border-[#262B36] bg-[#FFFFFF] dark:bg-[#13161B] hover:border-[#1D4ED8] dark:hover:border-[#3B82F6] text-[#111315] dark:text-[#F3F4F6] cursor-pointer whitespace-nowrap"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-[#15803D] dark:text-[#4ADE80]" />
                <span>{t.apaGuide.copiedBtn}</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>{t.apaGuide.copyBtn}</span>
              </>
            )}
          </button>
        </div>

        <ul className="space-y-1 text-[12px] text-[#575B62] dark:text-[#9CA3AF] list-disc pl-4">
          {bundle.apaRules.map((rule, idx) => (
            <li key={idx} className="leading-relaxed">
              {rule}
            </li>
          ))}
        </ul>

        <div className="pt-1">
          <div className="text-[11px] font-semibold text-[#575B62] dark:text-[#9CA3AF] mb-1">
            {t.apaGuide.readyProseTitle}
          </div>
          <p className="p-2.5 rounded border border-[#E2DFD7] dark:border-[#262B36] bg-[#FFFFFF] dark:bg-[#13161B] text-[12px] leading-relaxed text-[#111315] dark:text-[#F3F4F6]">
            {bundle.apaSentence}
          </p>
        </div>
      </div>

      {/* 3. Relationship Strength Benchmarks & Active Variable Evaluation (Inferential tests only) */}
      {bundle.benchmarks.length > 0 && (
        <div className="pt-3 border-t border-[#E2DFD7] dark:border-[#262B36] space-y-2.5">
          <h4 className="font-display text-xs font-semibold text-[#111315] dark:text-[#F3F4F6]">
            {t.apaGuide.strengthTitle} —{' '}
            <span className="font-normal text-[#575B62] dark:text-[#9CA3AF]">
              {bundle.benchmarkTitle}
            </span>
          </h4>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Benchmark Rubric Table (APA-7 Horizontal Rules Only) */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="border-y border-[#111315] dark:border-[#9CA3AF] text-left">
                    <th className="py-1.5 pr-2 font-semibold">{t.apaGuide.thresholdCol}</th>
                    <th className="py-1.5 px-2 font-semibold">{t.apaGuide.categoryCol}</th>
                    <th className="py-1.5 pl-2 text-right font-semibold">{t.apaGuide.statusCol}</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.benchmarks.map((b) => (
                    <tr
                      key={b.range}
                      className={`border-b border-[#E2DFD7] dark:border-[#262B36] ${
                        b.isCurrent ? 'bg-[#1D4ED8]/8 dark:bg-[#3B82F6]/12 font-semibold' : ''
                      }`}
                    >
                      <td className="py-1.5 pr-2 font-mono-tabular">{b.range}</td>
                      <td className="py-1.5 px-2">{b.label}</td>
                      <td className="py-1.5 pl-2 text-right">
                        {b.isCurrent ? (
                          <span className="text-[#1D4ED8] dark:text-[#60A5FA]">
                            {t.apaGuide.currentMark}
                          </span>
                        ) : (
                          <span className="text-[#575B62] dark:text-[#9CA3AF]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Live Selected Variables Strength Summary */}
            {bundle.relationshipRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="border-y border-[#111315] dark:border-[#9CA3AF] text-left">
                      <th className="py-1.5 pr-2 font-semibold">{t.apaGuide.pairCol}</th>
                      <th className="py-1.5 px-2 font-semibold">{t.apaGuide.strengthCol}</th>
                      <th className="py-1.5 pl-2 text-right font-semibold">
                        {t.apaGuide.decisionCol}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.relationshipRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-[#E2DFD7] dark:border-[#262B36]"
                      >
                        <td className="py-1.5 pr-2 font-medium text-[#111315] dark:text-[#F3F4F6]">
                          {row.pairOrFactor}
                        </td>
                        <td className="py-1.5 px-2 text-[#575B62] dark:text-[#9CA3AF]">
                          {row.strengthTier}
                        </td>
                        <td
                          className={`py-1.5 pl-2 text-right font-semibold whitespace-nowrap ${
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};
