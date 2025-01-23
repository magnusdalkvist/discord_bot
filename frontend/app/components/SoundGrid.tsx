"use client";

import { useState, useEffect } from "react";
import { Sound } from "../page";
import SoundComponent from "./Sound";
import { getEntranceSound, getSounds } from "@/lib/sounds";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export const getTotalPlayCount = (playedBy: Sound["playedBy"]) => {
  return playedBy.reduce((acc, playedBy) => acc + playedBy?.times, 0);
};

export const getMostPlayedBy = (playedBy: Sound["playedBy"]) => {
  // find the user with the most play count
  return playedBy.reduce((prev, current) => (prev.times > current.times ? prev : current));
};

export default function SoundGrid({
  filter,
}: {
  filter?: "uploads" | "favorites" | "leaderboard";
}) {
  const session = useSession();
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [entrance, setEntrance] = useState("");

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
        if (filter === "leaderboard") {
          // find the total of playedby[{times}] for each sound and only show sounds with any play count
          filteredSounds = filteredSounds.filter(
            (sound) => sound.playedBy && getTotalPlayCount(sound.playedBy) > 0
          );
        }
        setSounds(filteredSounds);
      })
      .finally(() => {
        setTimeout(() => setIsLoading(false), 300);
      });
    if (session?.data?.user?.id) {
      getEntranceSound(session?.data?.user?.id).then((entrance) => {
        setEntrance(entrance?.entrance_sound || "");
      });
    }
  }, [session?.data?.user?.id, filter]);

  const sortedSounds = [...sounds].sort((a, b) => {
    if (filter === "leaderboard") {
      return getTotalPlayCount(b.playedBy) - getTotalPlayCount(a.playedBy);
    }
    return a.displayname.localeCompare(b.displayname);
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {[...Array(12)].map((_, index) => (
          <Skeleton key={index} className="min-h-[150px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(308px,1fr))] gap-4">
      {sortedSounds.map((sound, i) => (
        <SoundComponent
          sound={sound}
          key={sound.filename}
          entrance={sound.filename == entrance}
          setEntrance={setEntrance}
          favorited={
            (session?.data?.user?.id && sound?.favoritedBy?.includes(session?.data?.user?.id)) ||
            false
          }
          type={filter}
          className={cn(
            i == 0 && filter === "leaderboard" && "border-gold",
            i == 1 && filter === "leaderboard" && "border-silver",
            i == 2 && filter === "leaderboard" && "border-bronze"
          )}
        />
      ))}
      {sortedSounds.length === 0 && (
        <>
          <div className="flex flex-col text-center items-center justify-center p-4 bg-[#f1f3f4] rounded-lg text-black min-h-[150px] w-full">
            <p className="font-semibold">It looks like there are no sounds here.</p>
          </div>
          <div className="flex flex-col text-center items-center justify-center p-4 bg-[#f1f3f4] rounded-lg text-black min-h-[150px] w-full">
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
