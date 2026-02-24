import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselSlide {
  /** Label shown in the tab/indicator */
  label: string;
  /** Content to render for this slide */
  content: ReactNode;
}

interface SectionCarouselProps {
  slides: CarouselSlide[];
  className?: string;
}

/**
 * Carousel for navigating between multiple data panels within a section.
 * If only one slide is provided, renders it directly without controls.
 */
export const SectionCarousel = ({ slides, className = '' }: SectionCarouselProps) => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Single slide — render directly, no controls
  if (slides.length <= 1) {
    return <div className={className}>{slides[0]?.content ?? null}</div>;
  }

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < slides.length - 1;

  return (
    <div className={className}>
      {/* Navigation bar */}
      <div className="flex items-center justify-between mb-4">
        {/* Slide tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {slides.map((slide, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${idx === activeIndex
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700'
                }
              `}
            >
              {slide.label}
            </button>
          ))}
        </div>

        {/* Prev / Next arrows */}
        <div className="flex items-center gap-1 shrink-0 ml-3">
          <button
            type="button"
            onClick={() => setActiveIndex((i) => i - 1)}
            disabled={!canPrev}
            className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums min-w-[3ch] text-center">
            {activeIndex + 1}/{slides.length}
          </span>
          <button
            type="button"
            onClick={() => setActiveIndex((i) => i + 1)}
            disabled={!canNext}
            className="p-1.5 rounded-md border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Active slide content */}
      <div>{slides[activeIndex].content}</div>
    </div>
  );
};
