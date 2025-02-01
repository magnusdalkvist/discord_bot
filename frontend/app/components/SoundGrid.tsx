"use client";

import { useState, useEffect } from "react";
import SoundComponent from "./Sound";
import { getEntranceSound, getSounds, Sound } from "@/lib/sounds";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multiSelect";
import UploadDialog from "./UploadDialog";
import { Input } from "@/components/ui/input";

export const getTotalPlayCount = (playedBy: Sound["playedBy"]) => {
  return playedBy?.reduce((acc, playedBy) => acc + playedBy?.times, 0) || 0;
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
  const [sortedSounds, setSortedSounds] = useState<Sound[]>([]);
  const [filters, setFilters] = useState<{ type: "category" | "user"; value: string }[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [entrance, setEntrance] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 24;

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

  useEffect(() => {
    let sorted = [...sounds];
    switch (filter) {
      case "leaderboard":
        sorted = sorted.sort(
          (a, b) => getTotalPlayCount(b.playedBy) - getTotalPlayCount(a.playedBy)
        );
        break;
      case "uploads":
        sorted = sorted.reverse();
        break;
      default:
        sorted = sorted.sort((a, b) => a.displayname.localeCompare(b.displayname));
    }
    setSortedSounds(sorted);
    setPage(1);
  }, [sounds, filter, filters]);

  const handleNextPage = () => {
    setPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    setPage((prev) => prev - 1);
  };

  const categoryFilters = filters
    .filter((f) => f.type === "category")
    .map((f) => f.value.toLowerCase());
  const userFilters = filters.filter((f) => f.type === "user").map((f) => f.value.toLowerCase());

  const sortedFilteredSounds = sortedSounds.filter((sound) => {
    const categoryMatch =
      categoryFilters.length === 0 || categoryFilters.includes(sound.category.toLowerCase());
    const userMatch =
      userFilters.length === 0 || userFilters.includes(sound.uploadedBy.name.toLowerCase());
    const searchMatch = sound.displayname.toLowerCase().includes(search.toLowerCase());
    return categoryMatch && userMatch && searchMatch;
  });

  return (
    <div className="flex flex-col gap-4">
      {filter != "leaderboard" && (
        <div className="flex gap-4 flex-wrap-reverse items-center">
          <Select
            onValueChange={(value) => {
              let sorted = [...sounds];
              switch (value) {
                case "leaderboard":
                  sorted = sorted.sort(
                    (a, b) => getTotalPlayCount(b.playedBy) - getTotalPlayCount(a.playedBy)
                  );
                  break;
                case "uploads":
                  sorted = sorted.reverse();
                  break;
                case "old":
                  break;
                default:
                  sorted = sorted.sort((a, b) => a.displayname.localeCompare(b.displayname));
              }
              setSortedSounds(sorted);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-min gap-2 max-[945px]:flex-1">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alphabetical">Alphabetical</SelectItem>
              <SelectItem value="leaderboard">Most Played</SelectItem>
              <SelectItem value="uploads">Newest</SelectItem>
              <SelectItem value="old">Oldest</SelectItem>
            </SelectContent>
          </Select>
          <MultiSelect
            selectedItems={filters}
            setSelectedItems={setFilters}
            categories={
              //get all categories from sounds and remove duplicates
              [...new Set(sounds.map((sound) => sound.category))].map((category) => ({
                label: category,
                value: category,
              }))
            }
            users={
              //get all users from sounds and remove duplicates
              [...new Set(sounds.map((sound) => sound.uploadedBy.name))].map((user) => ({
                label: user,
                value: user,
              }))
            }
          />
          <div className="flex gap-4 items-center flex-grow">
            <Input
              placeholder="Search sounds..."
              className="placeholder:text-sm flex-1 min-w-[150px] max-w-full"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {session?.data?.user && <UploadDialog />}
          </div>
        </div>
      )}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(308px,1fr))] gap-4">
        {isLoading ? (
          [...Array(pageSize)].map((_, index) => (
            <Skeleton key={index} className="min-h-[150px] w-full rounded-lg" />
          ))
        ) : sortedFilteredSounds ? (
          sortedFilteredSounds
            .slice((page - 1) * pageSize, page * pageSize)
            .map((sound, i) => (
              <SoundComponent
                sound={sound}
                key={sound.filename}
                entrance={sound.filename == entrance}
                setEntrance={setEntrance}
                favorited={
                  (session?.data?.user?.id &&
                    sound?.favoritedBy?.includes(session?.data?.user?.id)) ||
                  false
                }
                type={filter}
                className={cn(
                  i == 0 && page == 1 && filter === "leaderboard" && "border-gold",
                  i == 1 && page == 1 && filter === "leaderboard" && "border-silver",
                  i == 2 && page == 1 && filter === "leaderboard" && "border-bronze"
                )}
              />
            ))
        ) : (
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
      {sortedFilteredSounds.length > pageSize && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious onClick={handlePrevPage} disabled={page <= 1} />
            </PaginationItem>
            {page > 1 && <PaginationLink onClick={() => setPage(1)}>1</PaginationLink>}
            {page > 2 && <PaginationEllipsis />}
            <PaginationLink className="font-bold border">{page}</PaginationLink>
            {page < Math.ceil(sortedFilteredSounds.length / pageSize) - 1 && <PaginationEllipsis />}
            {page < Math.ceil(sortedFilteredSounds.length / pageSize) && (
              <PaginationLink
                onClick={() => setPage(Math.ceil(sortedFilteredSounds.length / pageSize))}
              >
                {Math.ceil(sortedFilteredSounds.length / pageSize)}
              </PaginationLink>
            )}
            <PaginationItem>
              <PaginationNext
                onClick={handleNextPage}
                disabled={page >= Math.ceil(sortedFilteredSounds.length / pageSize)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
