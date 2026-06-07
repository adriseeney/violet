import { supabaseConfig } from "@/config/supabase-config";
import { logSupabaseError } from "@/utils/logSupabaseError";

const PROFILE_PHOTOS_BUCKET = "profile-photos";

type SavedProfilePhoto = {
  url: string;
  storagePath: string | null;
};

function isRemoteUrl(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function photoUrlFromRow(row: Record<string, unknown>): string {
  const value = row.photo_url ?? row.url;
  return value != null ? String(value) : "";
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${PROFILE_PHOTOS_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) {
    return null;
  }

  return decodeURIComponent(url.slice(index + marker.length));
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

async function getCurrentUserId() {
  const {
    data: { user },
    error: userError,
  } = await supabaseConfig.auth.getUser();

  if (userError) {
    logSupabaseError("profilePhotos auth.getUser", userError);
    throw new Error(userError.message);
  }

  if (!user?.id) {
    throw new Error("No authenticated user found.");
  }

  return user.id;
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

    const userId = await getCurrentUserId();

    const fileResponse = await fetch(uri);
    if (!fileResponse.ok) {
      throw new Error("Unable to read the selected profile photo.");
    }

    const contentType = getContentType(uri, fileResponse);
    const fileExt = extensionForContentType(contentType);
    const storagePath = `${userId}/photo-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;
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

export const getCurrentUserProfilePhotos = async () => {
  try {
    const userId = await getCurrentUserId();

    const { data, error } = await supabaseConfig
      .from("user_photos")
      .select("photo_url, url, storage_path, display_order, is_primary")
      .eq("user_id", userId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      logSupabaseError("getCurrentUserProfilePhotos select user_photos", error);
      throw new Error(error.message);
    }

    return {
      success: true,
      data: (data ?? []).map((photo) => ({
        url: photoUrlFromRow(photo as Record<string, unknown>),
        storagePath:
          typeof photo.storage_path === "string" ? photo.storage_path : null,
      })),
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while loading profile photos.",
      data: [] as SavedProfilePhoto[],
    };
  }
};

export const saveCurrentUserProfilePhotos = async (photoUris: string[]) => {
  try {
    const userId = await getCurrentUserId();
    const realPhotoUris = photoUris.filter(Boolean);
    const savedPhotos: SavedProfilePhoto[] = [];

    for (const uri of realPhotoUris) {
      if (isRemoteUrl(uri)) {
        savedPhotos.push({
          url: uri,
          storagePath: storagePathFromPublicUrl(uri),
        });
        continue;
      }

      const uploadResponse = await uploadCurrentUserProfilePhoto(uri);

      if (!uploadResponse.success || !uploadResponse.data?.publicUrl) {
        throw new Error(
          uploadResponse.message ?? "A profile photo could not be uploaded.",
        );
      }

      savedPhotos.push({
        url: uploadResponse.data.publicUrl,
        storagePath: uploadResponse.data.storagePath,
      });
    }

    const { error: deleteError } = await supabaseConfig
      .from("user_photos")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      logSupabaseError("saveCurrentUserProfilePhotos delete user_photos", deleteError);
      throw new Error(deleteError.message);
    }

    if (savedPhotos.length > 0) {
      const { error: insertError } = await supabaseConfig
        .from("user_photos")
        .insert(
          savedPhotos.map((photo, index) => ({
            user_id: userId,
            photo_url: photo.url,
            storage_path: photo.storagePath,
            display_order: index,
            is_primary: index === 0,
            is_private: false,
          })),
        );

      if (insertError) {
        logSupabaseError("saveCurrentUserProfilePhotos insert user_photos", insertError);
        throw new Error(insertError.message);
      }
    }

    return {
      success: true,
      data: savedPhotos,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred while saving profile photos.",
      data: [] as SavedProfilePhoto[],
    };
  }
};
