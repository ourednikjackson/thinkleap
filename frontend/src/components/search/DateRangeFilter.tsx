// app/(protected)/search/components/DateRangeFilter.tsx
import { DateRange } from '@thinkleap/shared/types/search';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateRangeFilterProps {
  dateRange?: DateRange;
  onChange: (dateRange: DateRange) => void;
}

export function DateRangeFilter({ dateRange, onChange }: DateRangeFilterProps) {
  return (
    <div className="space-y-2">
      <div>
        <Label htmlFor="start-date">From</Label>
        <Input
          id="start-date"
          type="date"
          value={dateRange?.start?.toISOString().split('T')[0] || ''}
          onChange={(e) =>
            onChange({
              ...dateRange,
              start: e.target.value ? new Date(e.target.value) : undefined
            })
          }
        />
      </div>
      <div>
        <Label htmlFor="end-date">To</Label>
        <Input
          id="end-date"
          type="date"
          value={dateRange?.end?.toISOString().split('T')[0] || ''}
          onChange={(e) =>
            onChange({
              ...dateRange,
              end: e.target.value ? new Date(e.target.value) : undefined
            })
          }
        />
      </div>
    </div>
  );
}