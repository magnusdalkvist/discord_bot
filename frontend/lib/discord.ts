export type LogEvent =
  | "PLAYED_SOUND"
  | "STOPPED_SOUND"
  | "JOINED_CHANNEL"
  | "MOVED_CHANNEL"
  | "LEFT_CHANNEL"
  | "STARTED_STREAMING"
  | "STOPPED_STREAMING"
  | "BOT_DOWN";

export interface Log {
  event: LogEvent;
  timestamp: number;
  user: {
    id: number;
    name: string;
    nick: string;
    is_on_mobile?: boolean;
  };
  channel: {
    id: number;
    name: string;
  };
  sound?: {
    filename: string;
    displayname: string;
  };
}

export interface TimeSeriesPoint {
  timestamp: number;
  activeCount: number | null;
  activeUsers: string[];
  botDown?: boolean;
}

export interface FilledTimeSeriesPoint extends TimeSeriesPoint {
  lastSeries?: TimeSeriesPoint;
}

export async function getLogs(): Promise<Log[]> {
  try {
    const response = await fetch("https://sarah.bils.space/api/logs", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to fetch logs");
    return response.json();
  } catch (error) {
    console.error("Error fetching logs:", error);
    return [];
  }
}

export function processUserActivity(
  logs: Log[],
  startTime?: number,
  endTime?: number,
  iterations?: number
): FilledTimeSeriesPoint[] {
  // Sort logs in chronological order.
  const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
  const activeUsers = new Map<number, string>();
  const timeSeries: TimeSeriesPoint[] = [];

  // Build raw time series from log events.
  for (const log of sortedLogs) {
    switch (log.event) {
      case "JOINED_CHANNEL":
      case "MOVED_CHANNEL":
      case "PLAYED_SOUND":
      case "STARTED_STREAMING":
        activeUsers.set(log.user.id, log.user.nick);
        break;
      case "LEFT_CHANNEL":
        activeUsers.delete(log.user.id);
        break;
      case "BOT_DOWN":
        activeUsers.clear();
        timeSeries.push({
          timestamp: log.timestamp,
          activeCount: 0,
          activeUsers: [],
          botDown: true,
        });
        continue; // Skip the standard push below.
    }
    timeSeries.push({
      timestamp: log.timestamp,
      activeCount: activeUsers.size,
      activeUsers: Array.from(activeUsers.values()),
    });
  }

  // If no interval parameters are provided, return the raw time series.
  if (startTime == null || endTime == null || iterations == null) {
    return timeSeries;
  }

  const interval = (endTime - startTime) / iterations;
  const filledTimeSeries: FilledTimeSeriesPoint[] = [];
  let currentTimestamp = startTime;
  const now = Date.now() / 1000;
  let index = 0; // Pointer for the timeSeries array.

  for (let i = 0; i < iterations; i++) {
    const intervalEnd = currentTimestamp + interval;
    const dataPoints: TimeSeriesPoint[] = [];

    // Advance pointer past any points before the current interval.
    while (index < timeSeries.length && timeSeries[index].timestamp < currentTimestamp) {
      index++;
    }
    // Collect points that fall within the current interval.
    let tempIndex = index;
    while (tempIndex < timeSeries.length && timeSeries[tempIndex].timestamp < intervalEnd) {
      dataPoints.push(timeSeries[tempIndex]);
      tempIndex++;
    }
    index = tempIndex; // Update pointer for the next iteration.

    // No data in this interval: carry forward last known state.
    if (dataPoints.length === 0 && currentTimestamp < now) {
      const lastEntry = filledTimeSeries[filledTimeSeries.length - 1];
      filledTimeSeries.push({
        timestamp: currentTimestamp,
        activeCount: lastEntry ? lastEntry.lastSeries?.activeCount ?? lastEntry.activeCount : null,
        activeUsers: lastEntry ? lastEntry.lastSeries?.activeUsers ?? lastEntry.activeUsers : [],
        lastSeries: lastEntry?.lastSeries,
        botDown: lastEntry ? lastEntry.lastSeries?.botDown ?? lastEntry.botDown : undefined,
      });
      currentTimestamp += interval;
      continue;
    }

    // Select the data point with the highest activeCount.
    let maxPoint: TimeSeriesPoint | null = null;
    for (const point of dataPoints) {
      // Note: 0 is a valid count so we explicitly check for null.
      if (
        point.activeCount !== null &&
        (maxPoint === null ||
          maxPoint.activeCount === null ||
          point.activeCount > maxPoint.activeCount)
      ) {
        maxPoint = point;
      }
    }

    // If any point in the interval indicates a bot down, mark the interval accordingly.
    if (dataPoints.some((pt) => pt.botDown)) {
      filledTimeSeries.push({
        timestamp: currentTimestamp,
        activeCount: maxPoint && maxPoint.activeCount === 0 ? 1 : maxPoint?.activeCount ?? null,
        activeUsers: maxPoint ? maxPoint.activeUsers : [],
        botDown: true,
      });
      currentTimestamp += interval;
      continue;
    }

    filledTimeSeries.push({
      timestamp: currentTimestamp,
      activeCount: maxPoint ? maxPoint.activeCount : null,
      activeUsers: maxPoint ? maxPoint.activeUsers : [],
      lastSeries: dataPoints[dataPoints.length - 1],
    });
    currentTimestamp += interval;
  }

  return filledTimeSeries;
}

export interface SoundEvent {
  timestamp: number;
  user: string;
  sound: {
    filename: string;
    displayname: string;
  };
}

export interface SoundInterval {
  timestamp: number;
  soundCount: number;
  soundEvents: SoundEvent[];
}

export function processSoundActivity(
  logs: Log[],
  startTime?: number,
  endTime?: number,
  iterations?: number
): SoundInterval[] {
  // Build raw sound events time series from logs.
  const soundTimeSeries: SoundInterval[] = logs
    .filter((log) => log.event === "PLAYED_SOUND" && log.sound)
    .map((log) => ({
      timestamp: log.timestamp,
      soundCount: 1,
      soundEvents: [
        {
          timestamp: log.timestamp,
          user: log.user.nick,
          sound: log.sound!,
        },
      ],
    }));

  // Sort the events chronologically.
  soundTimeSeries.sort((a, b) => a.timestamp - b.timestamp);

  // If no interval parameters are provided, return the raw events.
  if (startTime == null || endTime == null || iterations == null) {
    return soundTimeSeries;
  }

  const interval = (endTime - startTime) / iterations;
  const filledIntervals: SoundInterval[] = [];
  let index = 0;

  for (let i = 0; i < iterations; i++) {
    const currentTimestamp = startTime + i * interval;
    const intervalEnd = currentTimestamp + interval;
    const events: SoundEvent[] = [];

    // Skip events before the current interval.
    while (index < soundTimeSeries.length && soundTimeSeries[index].timestamp < currentTimestamp) {
      index++;
    }

    // Gather all events in the current interval.
    let tempIndex = index;
    while (
      tempIndex < soundTimeSeries.length &&
      soundTimeSeries[tempIndex].timestamp < intervalEnd
    ) {
      events.push(...soundTimeSeries[tempIndex].soundEvents);
      tempIndex++;
    }
    index = tempIndex;

    filledIntervals.push({
      timestamp: currentTimestamp,
      soundCount: events.length,
      soundEvents: events,
    });
  }

  return filledIntervals;
}
