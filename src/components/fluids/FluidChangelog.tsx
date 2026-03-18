import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { fluidsApi } from '../../lib/api';
import type { FluidChangelogEntry } from '../../types/fluid';

interface FluidChangelogProps {
  fluidReportId: string;
}

const TAB_LABEL_KEYS: Record<string, string> = {
  tab1: 'fluids.form.tabs.tab1',
  tab2: 'fluids.form.tabs.tab2',
  tab3: 'fluids.form.tabs.tab3',
  create: 'fluids.changelog.creation',
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function DiffSummary({ changes }: { changes: Record<string, unknown> }) {
  const { t } = useTranslation();
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 space-y-1">
      {entries.map(([key, value]) => {
        const v = value as Record<string, unknown>;

        // Sub-table diff (has added/removed/modified as arrays of names)
        if ('added' in v || 'removed' in v || 'modified' in v) {
          const added = v.added as string[] | undefined;
          const removed = v.removed as string[] | undefined;
          const modified = v.modified as string[] | undefined;
          const hasChanges = (added && added.length > 0) || (removed && removed.length > 0) || (modified && modified.length > 0);
          if (!hasChanges) return null;

          return (
            <div key={key} className="text-xs space-y-0.5">
              <span className="font-medium text-gray-700 dark:text-gray-300">{(v.label as string) || key}:</span>
              {added && added.length > 0 && (
                <div className="ml-3 text-green-600 dark:text-green-400">
                  + {t('fluids.changelog.added')}: {added.join(', ')}
                </div>
              )}
              {removed && removed.length > 0 && (
                <div className="ml-3 text-red-500 dark:text-red-400">
                  − {t('fluids.changelog.removed')}: {removed.join(', ')}
                </div>
              )}
              {modified && modified.length > 0 && (
                <div className="ml-3 text-amber-600 dark:text-amber-400">
                  ✎ {t('fluids.changelog.modified')}: {modified.join(', ')}
                </div>
              )}
            </div>
          );
        }

        // Header field diff (has old/new)
        if ('old' in v && 'new' in v) {
          const oldVal = v.old === null ? '—' : String(v.old);
          const newVal = v.new === null ? '—' : String(v.new);
          return (
            <div key={key} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
              <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>
              <span className="line-through text-red-400">{oldVal}</span>
              <span>→</span>
              <span className="text-green-600 dark:text-green-400">{newVal}</span>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export function FluidChangelog({ fluidReportId }: FluidChangelogProps) {
  const { t } = useTranslation();
  const { sessionToken } = useAuthStore();
  const [entries, setEntries] = useState<FluidChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionToken && fluidReportId) {
      loadChangelog();
    }
  }, [sessionToken, fluidReportId]);

  const loadChangelog = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const data = await fluidsApi.listChangelog(sessionToken, fluidReportId);
      setEntries(data);
    } catch (error) {
      console.error('Error loading changelog:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Pencil size={24} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">{t('fluids.changelog.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {t('fluids.changelog.title')}
      </h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-4">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const changesCount = Object.keys(entry.changesJson).length;
            const tabLabel = TAB_LABEL_KEYS[entry.tab] ? t(TAB_LABEL_KEYS[entry.tab]) : entry.tab;

            return (
              <div key={entry.id} className="relative pl-10">
                {/* Timeline dot */}
                <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-primary-500 border-2 border-white dark:border-gray-900" />

                <div
                  className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 ${changesCount > 0 ? 'cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 transition-colors' : ''}`}
                  onClick={() => changesCount > 0 && setExpandedId(isExpanded ? null : entry.id)}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {entry.changedByName || entry.changedBy}
                        </span>
                        <span className="inline-block px-1.5 py-0.5 text-xs rounded bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
                          {tabLabel}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(entry.changedAt)}
                        </span>
                      </div>

                      {/* Note */}
                      {entry.note && (
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 italic">
                          "{entry.note}"
                        </p>
                      )}
                    </div>

                    {/* Expand indicator */}
                    {changesCount > 0 && (
                      <span className="p-1 text-gray-400 shrink-0">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </span>
                    )}
                  </div>

                  {/* Changes summary (always visible) */}
                  {!isExpanded && changesCount > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {t('fluids.changelog.changesCount', { count: changesCount })}
                    </p>
                  )}

                  {/* Expanded diff */}
                  {isExpanded && (
                    <DiffSummary changes={entry.changesJson as Record<string, unknown>} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
