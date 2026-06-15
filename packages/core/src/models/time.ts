export type Ticks = number;

export type ISODateString = string;

export interface Timebase {
  ticksPerSecond: number;
}

export interface Rational {
  numerator: number;
  denominator: number;
}

export interface TimeRange {
  start: Ticks;
  duration: Ticks;
}
