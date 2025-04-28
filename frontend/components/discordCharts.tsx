"use client";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useEffect, useState } from "react";
import {
  FilledTimeSeriesPoint,
  getLogs,
  processSoundActivity,
  processUserActivity,
  SoundInterval,
} from "@/lib/discord";
import { DatePickerWithRange } from "./ui/daterange";
import { DateRange } from "react-day-picker";
import { NameType, Payload, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const chartConfig = {
  activeCount: {
    label: "Active Users",
    color: "hsl(var(--chart-1))",
  },
  soundCount: {
    label: "Sounds Played",
    color: "hsl(var(--chart-2))",
  },
  botDown: {
    label: "Bot Down",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

const getLabel = (i: Payload<ValueType, NameType>[], differenceHours: number) => {
  return `${
    differenceHours / 24 > 5
      ? new Date(i[0].payload.timestamp * 1000).toLocaleDateString("en-GB", {
          month: "short",
          day: "numeric",
        })
      : new Date(i[0].payload.timestamp * 1000).toLocaleTimeString("en-GB", {
          hour: "numeric",
          minute: "numeric",
        })
  } ${i[0].payload.botDown ? "(Bot Down)" : ""}`;
};

export function UserActivityChart() {
  const [chartData, setChartData] = useState<FilledTimeSeriesPoint[]>([]);
  const [selection, setSelection] = useState<string>("");
  const [voiceChannels, setVoiceChannels] = useState<{ id: string; name: string }[]>([]);

  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: undefined,
  });

  const startTime = date?.from
    ? Math.floor(date.from.setHours(0, 0, 0, 0) / 1000)
    : Math.floor(new Date().setHours(0, 0, 0, 0) / 1000 - 24 * 60 * 60);

  const endTime = date?.to
    ? Math.floor(date.to.setHours(0, 0, 0, 0) / 1000 + 24 * 60 * 60)
    : startTime + 24 * 60 * 60;

  const differenceHours = (endTime - startTime) / 60 / 60;
  const iterations = differenceHours / 24 > 5 ? differenceHours / 24 : 24;

  useEffect(() => {
    getLogs().then((logs) => {
      const processedData = processUserActivity(
        logs,
        startTime,
        endTime,
        iterations,
        selection == "all" ? undefined : Number(selection)
      );
      setChartData(processedData);
    });
  }, [date, startTime, endTime, iterations, selection]);

  useEffect(() => {
    getLogs().then((logs) => {
      const channels = logs.filter((log) => log.channel).map((log) => log.channel);
      setVoiceChannels(
        Array.from(new Set(channels.map((channel) => JSON.stringify(channel)))).map((channel) =>
          JSON.parse(channel)
        )
      );
    });
  }, []);

  return (
    <Card className="flex-1">
      <CardHeader className="flex flex-row flex-wrap gap-x-8 gap-y-4 justify-between space-y-0">
        <div className="min-w-[330px] flex-1">
          <CardTitle>User activity</CardTitle>
          <CardDescription>
            Displaying the peak user activity throughout the day.
            <br />
            <i>Data might not be accurate if the bot was down in the current period.</i>
          </CardDescription>
        </div>
        <div className="flex flex-col gap-2">
          <DatePickerWithRange date={date} setDate={setDate} />
          <Select
            value={selection}
            onValueChange={(value) => {
              setSelection(value);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select channel" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All</SelectItem>
              {voiceChannels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData.map((entry) => ({
              ...entry,
              fill: entry.botDown ? "var(--color-botDown)" : "var(--color-activeCount)",
            }))}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                differenceHours / 24 > 5
                  ? new Date(value * 1000).toLocaleDateString("en-GB", {
                      month: "short",
                      day: "numeric",
                    })
                  : new Date(value * 1000).toLocaleTimeString("en-GB", {
                      hour: "numeric",
                      minute: "numeric",
                    })
              }
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dashed"
                  labelKey="timestamp"
                  label="Timestamp"
                  labelFormatter={(value, i) => getLabel(i, differenceHours)}
                />
              }
            />
            <Bar dataKey="activeCount" fill="fill" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function SoundActivityChart() {
  const [chartData, setChartData] = useState<SoundInterval[]>([]);

  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: undefined,
  });

  const startTime = date?.from
    ? Math.floor(date.from.setHours(0, 0, 0, 0) / 1000)
    : Math.floor(new Date().setHours(0, 0, 0, 0) / 1000 - 24 * 60 * 60);

  const endTime = date?.to
    ? Math.floor(date.to.setHours(0, 0, 0, 0) / 1000 + 24 * 60 * 60)
    : startTime + 24 * 60 * 60;

  const differenceHours = (endTime - startTime) / 60 / 60;
  const iterations = differenceHours / 24 > 5 ? differenceHours / 24 : 24;

  useEffect(() => {
    getLogs().then((logs) => {
      const processedData = processSoundActivity(logs, startTime, endTime, iterations);
      setChartData(processedData);
    });
  }, [date, startTime, endTime, iterations]);

  return (
    <Card className="flex-1">
      <CardHeader className="flex flex-row flex-wrap gap-x-8 gap-y-4 justify-between space-y-0">
        <div className="min-w-[330px] flex-1">
          <CardTitle>Soundboard activity</CardTitle>
          <CardDescription>
            Displaying the sounds played throughout the day.
            <br />
            <i>Data might not be accurate if the bot was down in the current period.</i>
          </CardDescription>
        </div>
        <DatePickerWithRange date={date} setDate={setDate} />
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData.map((entry) => ({
              ...entry,
              fill: "var(--color-soundCount)",
            }))}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) =>
                differenceHours / 24 > 5
                  ? new Date(value * 1000).toLocaleDateString("en-GB", {
                      month: "short",
                      day: "numeric",
                    })
                  : new Date(value * 1000).toLocaleTimeString("en-GB", {
                      hour: "numeric",
                      minute: "numeric",
                    })
              }
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="dashed"
                  labelKey="timestamp"
                  label="Timestamp"
                  labelFormatter={(value, i) => getLabel(i, differenceHours)}
                />
              }
            />
            <Bar dataKey="soundCount" fill="fill" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
