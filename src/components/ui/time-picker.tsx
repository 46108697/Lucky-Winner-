
'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TimePickerProps {
  value?: string;
  onChange: (value?: string) => void;
}

const hours12 = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const minutes = Array.from({ length: 60 / 5 }, (_, i) => (i * 5).toString().padStart(2, '0'));
const periods = ['AM', 'PM'];

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [hour, setHour] = React.useState<string | undefined>();
  const [minute, setMinute] = React.useState<string | undefined>();
  const [period, setPeriod] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(':');
      const hour24 = parseInt(h, 10);
      
      if (!isNaN(hour24)) {
        const newPeriod = hour24 >= 12 ? 'PM' : 'AM';
        let newHour12 = hour24 % 12;
        if (newHour12 === 0) newHour12 = 12; // 00 and 12 should be 12
        
        setHour(newHour12.toString().padStart(2, '0'));
        setMinute(m);
        setPeriod(newPeriod);
      }
    } else {
        setHour(undefined);
        setMinute(undefined);
        setPeriod(undefined);
    }
  }, [value]);

  React.useEffect(() => {
    if (hour && minute && period) {
      let hour24 = parseInt(hour, 10);
      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      }
      if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      onChange(`${hour24.toString().padStart(2, '0')}:${minute}`);
    } else {
      onChange(undefined);
    }
  }, [hour, minute, period, onChange]);

  return (
    <div className="flex items-center gap-2">
      <div className="grid gap-1 text-center">
        <Select value={hour} onValueChange={setHour}>
          <SelectTrigger className="w-[70px]">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent>
            {hours12.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <span>:</span>
      <div className="grid gap-1 text-center">
        <Select value={minute} onValueChange={setMinute}>
          <SelectTrigger className="w-[70px]">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent>
            {minutes.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
       <div className="grid gap-1 text-center">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[70px]">
            <SelectValue placeholder="AM/PM" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
