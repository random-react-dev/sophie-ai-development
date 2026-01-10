import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { supabase } from "./client";

export const uploadAvatar = async (
  userId: string,
  imageUri: string
): Promise<string | null> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: "base64",
    });

    const filePath = `${userId}/avatar.png`; // Always save as png for simplicity, or detect type
    const contentType = "image/png";

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(filePath, decode(base64), {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error("Error uploading avatar:", error);
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadAvatar:", error);
    return null;
  }
};
