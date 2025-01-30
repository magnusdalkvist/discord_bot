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

export async function getSound(filename: string): Promise<Sound | undefined> {
  try {
    const response = await fetch(`https://sarah.bils.space/api/sounds/${filename}`);
    if (!response.ok) {
      throw new Error("Failed to fetch sound");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching sound:", error);
  }
}

export async function uploadSound(formData: FormData): Promise<Response> {
  const response = await fetch("https://sarah.bils.space/api/sounds/upload", {
    method: "POST",
    body: formData,
  });
  return response;
}

export async function deleteSound(filename: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://sarah.bils.space/api/sounds/${filename}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    return response.ok;
  } catch (error) {
    console.error("Error deleting sound:", error);
    return false;
  }
}

export async function editSound(filename: string, formData: FormData): Promise<Response> {
  const response = await fetch(`https://sarah.bils.space/api/sounds/${filename}`, {
    method: "PUT",
    body: formData,
  });
  return response;
}

export async function favoriteSound(
  filename: string,
  userId: string,
  favorite: boolean
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://sarah.bils.space/api/users/${userId}/favorites/${filename}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite }),
      }
    );
    return response.ok;
  } catch (error) {
    console.error("Error favoriting sound:", error);
    return false;
  }
}

export async function setEntranceSound(filename: string, userId: string): Promise<boolean> {
  try {
    const response = await fetch(`https://sarah.bils.space/api/users/${userId}/entrance`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    return response.ok;
  } catch (error) {
    console.error("Error setting entrance sound:", error);
    return false;
  }
}

export async function getEntranceSound(
  userId: string
): Promise<{ entrance_sound: string } | undefined> {
  try {
    const response = await fetch(`https://sarah.bils.space/api/users/${userId}/entrance`);
    if (!response.ok) {
      throw new Error("Failed to fetch entrance sound");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching entrance sound:", error);
  }
}
