"use client";

import { useState, useEffect } from "react";
import { Sound } from "../page";
import SoundComponent from "./Sound";
import { getSounds } from "@/lib/sounds";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";

export default function SoundGrid({ filter }: { filter?: "uploads" | "favorites" }) {
  const session = useSession();
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    getSounds()
      .then((sounds) => {
        let filteredSounds = sounds;
        if (filter === "uploads") {
          filteredSounds = filteredSounds.filter(
            (sound) => session?.data?.user?.id && sound?.uploadedBy?.id === session?.data?.user?.id
          );
        }
        if (filter === "favorites") {
          filteredSounds = filteredSounds.filter(
            (sound) =>
              session?.data?.user?.id && sound?.favoritedBy?.includes(session?.data?.user?.id)
          );
        }
        setSounds(filteredSounds);
      })
      .finally(() => {
        setTimeout(() => setIsLoading(false), 500);
      });
  }, [session?.data?.user?.id, filter]);

  const sortedSounds = [...sounds].sort((a, b) => a.displayname.localeCompare(b.displayname));

  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {[...Array(12)].map((_, index) => (
          <Skeleton key={index} className="h-[134px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      {sortedSounds.map((sound) => (
        <SoundComponent
          sound={sound}
          key={sound.filename}
          favorited={
            (session?.data?.user?.id && sound?.favoritedBy?.includes(session?.data?.user?.id)) ||
            false
          }
        />
      ))}
      {sortedSounds.length === 0 && (
        <>
          <div className="flex flex-col text-center items-center justify-center p-4 bg-[#f1f3f4] rounded-lg text-black h-[134px] w-full">
            <p className="font-semibold">It looks like there are no sounds here.</p>
          </div>
          <div className="flex flex-col text-center items-center justify-center p-4 bg-[#f1f3f4] rounded-lg text-black h-[134px] w-full">
            <p className="font-semibold">
              {filter === "uploads" && "You haven't uploaded any sounds yet."}
              {filter === "favorites" && "You haven't favorited any sounds yet."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
