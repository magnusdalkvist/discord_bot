"use client";
import { HeartIcon } from "lucide-react";
import type { Sound } from "../page";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { favoriteSound } from "@/lib/sounds";
import debounce from "lodash.debounce";

export default function Sound({ sound, favorited }: { sound: Sound; favorited?: boolean }) {
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
    debounce((filename: string, userId: string, favorite: boolean) => {
      favoriteSound(filename, userId, favorite);
    }, 500, {
      leading: true,
      trailing: false,
    }), // Adjust the debounce delay as needed
    []
  );

  const handleClick = () => {
    setFavorite((prevFavorite) => {
      const newFavorite = !prevFavorite;
      if (session?.data?.user?.id) {
        debouncedFavoriteSound(sound.filename, session.data.user.id, newFavorite);
      }
      return newFavorite;
    });
  };

  return (
    <div
      key={sound.filename}
      className="min-h-[150px] flex flex-col items-center justify-center p-4 pt-10 bg-[#f1f3f4] rounded-lg text-black relative"
    >
      <div className="absolute top-2 left-2 h-6 cursor-pointer" onClick={handleClick}>
        <HeartIcon
          size={20}
          className={cn(favorite && "fill-red-400 text-red-400", "duration-100")}
        />
      </div>
      <p className="absolute top-2 right-2 bg-neutral-600 text-white px-2 py-1 h-6 text-[10px] rounded-lg font-semibold uppercase">
        {sound.category}
      </p>
      <p className="font-bold">{sound.displayname}</p>
      {sound.uploadedBy?.name && <p className="text-xs text-neutral-400">Uploaded by: {sound.uploadedBy?.name}</p>}
      <audio controls src={soundUrl} controlsList="nodownload noplaybackrate" />
    </div>
  );
}
