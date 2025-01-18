"use client";
import { HeartIcon, StarIcon } from "lucide-react";
import type { Sound } from "../page";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { setEntranceSound, favoriteSound } from "@/lib/sounds";
import debounce from "lodash.debounce";
import { getMostPlayedBy, getTotalPlayCount } from "./SoundGrid";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function Sound({
  sound,
  favorited,
  type,
  className,
  entrance,
  setEntrance,
}: {
  sound: Sound;
  favorited?: boolean;
  type?: "leaderboard" | "uploads" | "favorites";
  className?: string;
  entrance: boolean;
  setEntrance: (filename: string) => void;
}) {
  const soundUrl = `https://sarah.bils.space/api/sounds/${sound.filename}`;
  const session = useSession();
  const [favorite, setFavorite] = useState(favorited || false);

  useEffect(() => {
    if (
      sound.favoritedBy &&
      session?.data?.user?.id &&
      sound.favoritedBy.includes(session.data.user.id)
    ) {
      setFavorite(true);
    }
  }, [session, sound.favoritedBy]);

  const debouncedFavoriteSound = useCallback(
    debounce(
      (filename: string, userId: string, favorite: boolean) => {
        favoriteSound(filename, userId, favorite);
      },
      500,
      {
        leading: true,
        trailing: false,
      }
    ),
    []
  );

  const handleFavorite = () => {
    setFavorite((prevFavorite) => {
      const newFavorite = !prevFavorite;
      if (session?.data?.user?.id) {
        debouncedFavoriteSound(sound.filename, session.data.user.id, newFavorite);
      }
      return newFavorite;
    });
  };

  const debouncedEntranceSound = useCallback(
    debounce(
      (filename: string, userId: string) => {
        setEntranceSound(filename, userId);
      },
      500,
      {
        leading: true,
        trailing: false,
      }
    ),
    []
  );

  const handleEntrance = () => {
    setEntrance(entrance ? "" : sound.filename);
    if (session?.data?.user?.id) {
      debouncedEntranceSound(sound.filename, session.data.user.id);
    }
  };

  return (
    <div
      key={sound.filename}
      className={cn(
        "min-h-[150px] flex flex-col items-center justify-center p-4 pt-10 bg-[#f1f3f4] rounded-lg text-black relative",
        className
      )}
    >
      <div className="absolute top-2 left-2 h-6 cursor-pointer flex gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HeartIcon
                size={20}
                className={cn(favorite && "fill-red-400 text-red-400", "duration-100")}
                onClick={handleFavorite}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Add to favorites</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <StarIcon
                size={20}
                className={cn(entrance && "fill-yellow-400 text-yellow-400", "duration-100")}
                onClick={handleEntrance}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>Set as entrance sound</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="absolute top-2 right-2 bg-neutral-600 text-white px-2 py-1 h-6 text-[10px] rounded-lg font-semibold uppercase">
        {sound.category}
      </p>
      <p className="font-bold">{sound.displayname}</p>
      {type === "leaderboard" ? (
        <p className="text-xs text-neutral-500 text-center">
          Total plays: {getTotalPlayCount(sound?.playedBy)}
          <br />
          Most plays: {getMostPlayedBy(sound?.playedBy).name} (
          {getMostPlayedBy(sound?.playedBy).times})
        </p>
      ) : (
        sound.uploadedBy?.name && (
          <p className="text-xs text-neutral-500 text-center">
            Uploaded by: {sound.uploadedBy?.name}
          </p>
        )
      )}
      <audio controls src={soundUrl} controlsList="nodownload noplaybackrate" />
    </div>
  );
}
