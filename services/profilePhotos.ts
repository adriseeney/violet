import { supabaseConfig } from "@/config/supabase-config";
import { logSupabaseError } from "@/utils/logSupabaseError";

const PROFILE_PHOTOS_BUCKET = "profile-photos";

function isRemoteUrl(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function getContentType(uri: string, response: Response): string {
  const responseType = response.headers.get("content-type");
  if (responseType?.startsWith("image/")) {
    return responseType.split(";")[0];
  }

  const lowerUri = uri.toLowerCase();
  if (lowerUri.endsWith(".png")) return "image/png";
  if (lowerUri.endsWith(".webp")) return "image/webp";
  if (lowerUri.endsWith(".heic")) return "image/heic";
  if (lowerUri.endsWith(".heif")) return "image/heif";

  return "image/jpeg";
}

function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "jpg";
  }
}

export const uploadCurrentUserProfilePhoto = async (uri: string) => {
  try {
    if (isRemoteUrl(uri)) {
      return {
        success: true,
        data: {
          publicUrl: uri,
          storagePath: null as string | null,
        },
      };
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseConfig.auth.getUser();

    if (userError) {
      logSupabaseError("uploadCurrentUserProfilePhoto auth.getUser", userError);
      throw new Error(userError.message);
    }

    if (!user?.id) {
      throw new Error("No authenticated user found.");
    }

    const fileResponse = await fetch(uri);
    if (!fileResponse.ok) {
      throw new Error("Unable to read the selected profile photo.");
    }

    const contentType = getContentType(uri, fileResponse);
    const fileExt = extensionForContentType(contentType);
    const storagePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;
    const fileBody = await fileResponse.arrayBuffer();

    const { error: uploadError } = await supabaseConfig.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .upload(storagePath, fileBody, {
        contentType,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      logSupabaseError("uploadCurrentUserProfilePhoto storage.upload", uploadError);
      throw new Error(uploadError.message);
    }

    const {
      data: { publicUrl },
    } = supabaseConfig.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(storagePath);

    return {
      success: true,
      data: {
        publicUrl,
        storagePath,
      },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while uploading the profile photo.",
    };
  }
};
