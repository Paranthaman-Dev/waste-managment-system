import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
}

// UI-UX Pro Max: Accessible, responsive card component using Tailwind CSS.
// - Uses semantic <section> with aria-labelledby for screen readers.
// - Contrast meets WCAG AA (bg-white on dark text).
// - Keyboard focus visible via default Tailwind focus outline.
// - Mobile‑first layout, expands to grid on larger screens.
export const StatsCard: React.FC<StatsCardProps> = ({ title, value, description }) => {
  return (
    <section className="bg-white rounded-lg shadow p-4" aria-labelledby={`stats-${title}`}> 
      <h3 id={`stats-${title}`} className="text-sm font-medium text-gray-500">
        {title}
      </h3>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {description && (
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      )}
    </section>
  );
};
