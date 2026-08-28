interface SealBadgeProps {
  value: number | null;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
}

const sizeMap = {
  sm: { outer: 'w-14 h-14', inner: 'w-11 h-11', text: 'text-base', sub: 'text-[8px]' },
  md: { outer: 'w-20 h-20', inner: 'w-16 h-16', text: 'text-2xl', sub: 'text-[9px]' },
  lg: { outer: 'w-28 h-28', inner: 'w-23 h-23', text: 'text-3xl', sub: 'text-[10px]' },
  xl: { outer: 'w-36 h-36', inner: 'w-30 h-30', text: 'text-5xl', sub: 'text-xs' },
};

function getGradeColor(score: number, max: number = 20): { text: string; label: string } {
  const normalized = (score / max) * 20;
  if (normalized >= 16) return { text: 'text-success-400', label: 'Excellent' };
  if (normalized >= 14) return { text: 'text-success-300', label: 'Très bien' };
  if (normalized >= 12) return { text: 'text-gold-400', label: 'Bien' };
  if (normalized >= 10) return { text: 'text-navy-300', label: 'Passable' };
  if (normalized >= 8) return { text: 'text-coral-300', label: 'Insuffisant' };
  return { text: 'text-coral-400', label: 'Critique' };
}

export function SealBadge({ value, max = 20, size = 'md', showLabel = false }: SealBadgeProps) {
  const sizes = sizeMap[size];
  const hasValue = value !== null;
  const displayValue = hasValue ? value!.toFixed(1) : '—';
  const colorInfo = hasValue ? getGradeColor(value!, max) : null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`relative ${sizes.outer} rounded-full seal-badge flex items-center justify-center`}>
        <div className={`seal-inner ${sizes.inner} flex-col`}>
          <span className={`font-heading font-bold ${sizes.text} text-navy-500 leading-none`}>
            {displayValue}
          </span>
          <span className={`${sizes.sub} font-medium text-navy-300 mt-0.5`}>/ {max}</span>
        </div>
      </div>
      {showLabel && colorInfo && (
        <span className={`text-xs font-medium ${colorInfo.text}`}>{colorInfo.label}</span>
      )}
    </div>
  );
}
