import SoundGrid from "../../components/SoundGrid";

export default function SoundboardFavoritesPage() {
  return <SoundGrid filter="favorites" key={Math.random()} />;
}
