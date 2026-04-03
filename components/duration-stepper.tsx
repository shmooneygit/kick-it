import { NumberStepper } from './number-stepper';

interface DurationStepperProps {
  label: string;
  value: number; // in seconds
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  compact?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function DurationStepper({
  label,
  value,
  min,
  max,
  step = 5,
  onChange,
  compact = false,
}: DurationStepperProps) {
  return (
    <NumberStepper
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={onChange}
      formatValue={formatDuration}
      compact={compact}
    />
  );
}
