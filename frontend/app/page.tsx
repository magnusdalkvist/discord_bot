"use client";
import { useRouter, useSearchParams } from "next/navigation";
import Sound from "./components/Sound";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { getSounds } from "@/lib/sounds";

export interface Sound {
  filename: string;
  displayname: string;
  category: string;
  favorite: boolean;
  favoritedBy: string[];
  uploadedBy: {
    id: string;
    name: string;
  };
  playedBy: {
    id: string;
    name: string;
    times: number;
  }[];
}

export default function Home() {
  const searchParams = useSearchParams();
  const redirected = searchParams.get("redirected");
  const { toast } = useToast();
  const router = useRouter();
  const [imageSrc, setImageSrc] = useState("/cat.png");
  const [sounds, setSounds] = useState<Sound[]>([]);
  useEffect(() => {
    getSounds().then(setSounds);
  }, []);

  const playSound = () => {
    if (sounds.length === 0) return;
    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    const audio = new Audio(`https://sarah.bils.space/api/sounds/${randomSound.filename}`);
    
    setImageSrc("/cat-speak.png");
    audio.play();

    audio.onended = () => {
      setImageSrc("/cat.png");
    };
  };

  useEffect(() => {
    if (redirected === "unauth") {
      console.log("Unauthorized");

      setTimeout(() => {
        toast({
          title: "Unauthorized",
          description: "You must be logged in to access this page.",
        });
      }, 0);

      router.replace("/");
    }
  }, [redirected, toast, router]);

  return (
    <div className="h-full w-full flex flex-col gap-5 justify-center items-center">
      <Image
        src={imageSrc}
        alt="logo"
        width={200}
        height={200}
        className="overflow-hidden rounded cursor-pointer"
        priority
        onClick={()=>imageSrc == "/cat.png" ? playSound() : null}
      />
      <h1 className="text-5xl">Fart Machine</h1>
    </div>
  );
}
