import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { formatShortDate, formatTime } from '../utils/dateFormat';

interface DateCellProps {
  date: string | undefined;
  onDateChange: (date: string | undefined) => void;
  popoverOpen: boolean;
  onPopoverOpenChange: (open: boolean) => void;
}

export function DateCell({ date, onDateChange, popoverOpen, onPopoverOpenChange }: DateCellProps) {
  return (
    <Popover open={popoverOpen} onOpenChange={onPopoverOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onPopoverOpenChange(!popoverOpen);
          }}
          title={date ? formatTime(date) : ''}
        >
          {date ? formatShortDate(date) : '📅'}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 border-0 shadow-lg rounded-md" 
        align="start" 
        side="bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <Calendar
          mode="single"
          selected={date ? new Date(date) : undefined}
          onSelect={(selectedDate) => {
            onDateChange(selectedDate?.toISOString());
            onPopoverOpenChange(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}