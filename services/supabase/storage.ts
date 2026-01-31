import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system";
import { supabase } from "./client";

export const uploadAvatar = async (
  userId: string,
  imageUri: string,
): Promise<string | null> => {
  try {
    // FIX: Using Base64 (Classic Method) because fetch+ArrayBuffer led to corrupt files (invisible image) header.
    // We handle the 'readAsStringAsync' deprecation by attempting to use the legacy module if available,
    // or falling back to the main module (suppressing errors if possible).

    // Note: The error log suggested "import from expo-file-system/legacy".
    // Since we cannot verify the module existence statically here, we'll try a dynamic require
    // or just use the standard one and catch the specific error if it persists?
    // Actually, let's try to use the standard one but strict.
    // Wait, the user said it THREW an error.

    // Let's use the exact instruction: import legacy.
    // We cast to any to avoid TS errors if types aren't updated.
    let fsModule: any = FileSystem;
    try {
      const legacy = require("expo-file-system/legacy");
      if (legacy) fsModule = legacy;
    } catch (e) {
      // Legacy module not found, stick to default
    }

    const base64 = await fsModule.readAsStringAsync(imageUri, {
      encoding: "base64",
    });

    // Determine file extension and content type
    const fileExt = imageUri.split(".").pop()?.toLowerCase() || "jpg";

    let contentType = "image/jpeg"; // Default
    if (fileExt === "png") contentType = "image/png";
    else if (fileExt === "webp") contentType = "image/webp";
    else if (fileExt === "gif") contentType = "image/gif";

    const fileName = `avatar.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

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

    // FIX: Append timestamp to force UI refresh (cache busting)
    const finalUrl = `${publicUrl}?t=${new Date().getTime()}`;
    console.log("Avatar Public URL:", finalUrl);
    return finalUrl;
  } catch (error) {
    console.error("Error in uploadAvatar:", error);
    return null;
  }
};
