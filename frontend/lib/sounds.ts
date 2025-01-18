import { Sound } from "@/app/page";

export async function getSounds(): Promise<Sound[]> {
  try {
    const response = await fetch("https://sarah.bils.space/api/sounds", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to fetch sounds");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching sounds:", error);
    return [];
  }
}

export async function favoriteSound(
  filename: string,
  userId: string,
  favorite: boolean
): Promise<boolean> {
  try {
    const response = await fetch(`https://sarah.bils.space/api/sounds/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, userId, favorite }),
    });
    return response.ok;
  } catch (error) {
    console.error("Error favoriting sound:", error);
    return false;
  }
}

export async function entranceSound(
  filename: string,
  userId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`https://sarah.bils.space/api/sounds/entrance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, userId }),
    });
    return response.ok;
  } catch (error) {
    console.error("Error setting entrance sound:", error);
    return false;
  }
}
