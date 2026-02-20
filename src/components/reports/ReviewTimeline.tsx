import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, MessageSquare, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { reportReviewsApi, usersApi } from '../../lib/api';
import type { ReportReview, ReviewAction } from '../../types/report';
import { REVIEW_ACTION_LABELS } from '../../types/report';

interface ReviewTimelineProps {
  reportId: string;
  /** Bump to re-fetch reviews from parent */
  refreshKey?: number;
}

// Icon + color per action
const ACTION_CONFIG: Record<ReviewAction, {
  icon: React.ReactNode;
  dotColor: string;
}> = {
  approved: {
    icon: <CheckCircle size={16} />,
    dotColor: 'bg-green-500 text-white',
  },
  rejected: {
    icon: <XCircle size={16} />,
    dotColor: 'bg-red-500 text-white',
  },
  revision_requested: {
    icon: <AlertTriangle size={16} />,
    dotColor: 'bg-yellow-500 text-white',
  },
  comment: {
    icon: <MessageSquare size={16} />,
    dotColor: 'bg-blue-500 text-white',
  },
  resubmitted: {
    icon: <RotateCcw size={16} />,
    dotColor: 'bg-purple-500 text-white',
  },
};

function formatDateTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  } catch {
    return '-';
  }
}

export default function ReviewTimeline({ reportId, refreshKey }: ReviewTimelineProps) {
  const { sessionToken } = useAuthStore();
  const [reviews, setReviews] = useState<ReportReview[]>([]);
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [reportId, refreshKey]);

  const loadReviews = async () => {
    if (!sessionToken) return;
    setLoading(true);
    try {
      const data = await reportReviewsApi.list(sessionToken, reportId);
      setReviews(data);

      // Resolve unique reviewer names
      const uniqueIds = [...new Set(data.map((r) => r.reviewerId))];
      const names: Record<string, string> = {};
      await Promise.all(
        uniqueIds.map(async (uid) => {
          try {
            const u = await usersApi.get(sessionToken, uid);
            names[uid] = u.fullName || u.username;
          } catch {
            names[uid] = 'Usuario desconocido';
          }
        }),
      );
      setReviewerNames(names);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
        No hay historial de revisiones para este reporte.
      </p>
    );
  }

  return (
    <div className="relative">
      {reviews.map((review, idx) => {
        const config = ACTION_CONFIG[review.action] ?? ACTION_CONFIG.comment;
        const isLast = idx === reviews.length - 1;

        return (
          <div key={review.id} className="flex gap-3">
            {/* Dot + vertical line */}
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${config.dotColor}`}
              >
                {config.icon}
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 my-1" />
              )}
            </div>

            {/* Content */}
            <div className={`pb-6 ${isLast ? 'pb-0' : ''} flex-1 min-w-0`}>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {REVIEW_ACTION_LABELS[review.action] || review.action}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  por {reviewerNames[review.reviewerId] || 'Cargando...'}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatDateTime(review.createdAt)}
                </span>
              </div>
              {review.comment && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                  {review.comment}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
