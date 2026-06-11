import { supabaseConfig } from '@/config/supabase-config';
import type { INearbyProfile } from '@/services/users';
import { logSupabaseError } from '@/utils/logSupabaseError';

export interface IEventRoom {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  image_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  member_count: number;
  is_joined: boolean;
}

type ServiceResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

function mapEventRoom(row: Record<string, unknown>): IEventRoom {
  return {
    id: String(row.id),
    slug: String(row.slug ?? ''),
    name: String(row.name ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    city: typeof row.city === 'string' ? row.city : null,
    image_url: typeof row.image_url === 'string' ? row.image_url : null,
    starts_at: typeof row.starts_at === 'string' ? row.starts_at : null,
    ends_at: typeof row.ends_at === 'string' ? row.ends_at : null,
    member_count:
      typeof row.member_count === 'number'
        ? row.member_count
        : Number(row.member_count ?? 0),
    is_joined: row.is_joined === true,
  };
}

const JOIN_REQUIRED_MESSAGE = 'join this room to see who is here';

export const listActiveEventRooms = async (): Promise<
  ServiceResult<IEventRoom[]>
> => {
  try {
    const { data, error } = await supabaseConfig.rpc('list_active_event_rooms');

    if (error) {
      logSupabaseError('listActiveEventRooms rpc list_active_event_rooms', error);
      throw new Error(error.message);
    }

    return {
      success: true,
      data: (data ?? []).map((row) =>
        mapEventRoom(row as Record<string, unknown>),
      ),
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'An error occurred while loading event rooms.',
      data: [],
    };
  }
};

export const getActiveEventRoom = async (
  roomId: string,
): Promise<ServiceResult<IEventRoom | null>> => {
  const response = await listActiveEventRooms();

  if (!response.success) {
    return {
      success: false,
      message: response.message,
      data: null,
    };
  }

  const room = response.data?.find((entry) => entry.id === roomId) ?? null;

  return {
    success: true,
    data: room,
  };
};

export const joinEventRoom = async (
  roomId: string,
): Promise<ServiceResult<void>> => {
  try {
    const { error } = await supabaseConfig.rpc('join_event_room', {
      p_room_id: roomId,
    });

    if (error) {
      logSupabaseError('joinEventRoom rpc join_event_room', error);
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'An error occurred while joining the room.',
    };
  }
};

export const leaveEventRoom = async (
  roomId: string,
): Promise<ServiceResult<void>> => {
  try {
    const { error } = await supabaseConfig.rpc('leave_event_room', {
      p_room_id: roomId,
    });

    if (error) {
      logSupabaseError('leaveEventRoom rpc leave_event_room', error);
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'An error occurred while leaving the room.',
    };
  }
};

export const heartbeatEventRoom = async (
  roomId: string,
): Promise<ServiceResult<void>> => {
  try {
    const { error } = await supabaseConfig.rpc('heartbeat_event_room', {
      p_room_id: roomId,
    });

    if (error) {
      logSupabaseError('heartbeatEventRoom rpc heartbeat_event_room', error);
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'An error occurred while updating room presence.',
    };
  }
};

export const listEventRoomMembers = async (
  roomId: string,
): Promise<ServiceResult<INearbyProfile[]>> => {
  try {
    const { data, error } = await supabaseConfig.rpc('list_event_room_members', {
      p_room_id: roomId,
    });

    if (error) {
      const message = error.message ?? 'Could not load room members.';
      if (!message.toLowerCase().includes(JOIN_REQUIRED_MESSAGE)) {
        logSupabaseError(
          'listEventRoomMembers rpc list_event_room_members',
          error,
        );
      }
      throw new Error(message);
    }

    return {
      success: true,
      data: (data ?? []) as INearbyProfile[],
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'An error occurred while loading room members.',
      data: [],
    };
  }
};
