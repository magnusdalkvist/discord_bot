import { SoundActivityChart, UserActivityChart } from "@/components/discordCharts";

export default function DiscordPage() {
  return (
    <div className="flex flex-col xl:flex-row gap-4">
      <UserActivityChart />
      <SoundActivityChart />
    </div>
  );
}
