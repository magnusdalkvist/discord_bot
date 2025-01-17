import SoundGrid from "../../components/SoundGrid";

export default function SoundboardMyUploadsPage() {
  return <SoundGrid filter="uploads" key={Math.random()} />;
}
