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
          onChange={(e) => {
            // Create a new object instead of spreading potentially undefined dateRange
            const newDateRange = {
              start: e.target.value ? new Date(e.target.value) : undefined,
              end: dateRange?.end
            };
            onChange(newDateRange);
          }}
        />
      </div>
      <div>
        <Label htmlFor="end-date">To</Label>
        <Input
          id="end-date"
          type="date"
          value={dateRange?.end?.toISOString().split('T')[0] || ''}
          onChange={(e) => {
            // Create a new object instead of spreading potentially undefined dateRange
            const newDateRange = {
              start: dateRange?.start,
              end: e.target.value ? new Date(e.target.value) : undefined
            };
            onChange(newDateRange);
          }}
        />
      </div>
    </div>
  );
}