import SoundGrid from "../../components/SoundGrid";

export default function SoundboardLeaderboardPage() {
  return <SoundGrid filter="leaderboard" key={Math.random()} />;
}
