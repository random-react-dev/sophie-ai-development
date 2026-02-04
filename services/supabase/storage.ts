import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { supabase } from "./client";

// Module type for expo-file-system (handles legacy import)
type FSModule = typeof FileSystem;

export const uploadAvatar = async (
  userId: string,
  imageUri: string,
): Promise<string | null> => {
  try {
    console.log("[Avatar] Starting upload for user:", userId);
    console.log("[Avatar] Image URI:", imageUri);

    // Use legacy module if available (handles deprecation warning)
    let fsModule: FSModule = FileSystem;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const legacy = require("expo-file-system/legacy") as FSModule;
      if (legacy) fsModule = legacy;
    } catch {
      // Legacy module not found, stick to default
    }

    const base64 = await fsModule.readAsStringAsync(imageUri, {
      encoding: "base64",
    });

    console.log("[Avatar] Base64 data length:", base64.length);

    // Determine file extension and content type
    const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";

    let contentType = "image/jpeg"; // Default
    if (fileExt === "png") contentType = "image/png";
    else if (fileExt === "webp") contentType = "image/webp";
    else if (fileExt === "gif") contentType = "image/gif";

    const fileName = `avatar.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    console.log("[Avatar] Uploading to path:", filePath);

    const { data, error } = await supabase.storage
      .from("avatars")
      .upload(filePath, decode(base64), {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error("[Avatar] Upload error:", error.message);
      throw error;
    }

    // Verify upload succeeded
    if (!data || !data.path) {
      console.error("[Avatar] Upload returned no data path");
      return null;
    }

    console.log("[Avatar] Upload successful, path:", data.path);

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // FIX: Append timestamp to force UI refresh (cache busting)
    const finalUrl = `${publicUrl}?t=${new Date().getTime()}`;
    console.log("Avatar Public URL:", finalUrl);
    return finalUrl;
  } catch (error) {
    console.error("Error in uploadAvatar:", error);
    return null;
  }
};
