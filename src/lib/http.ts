export interface ParsedApiResponse<T = Record<string, any>> {
  ok: boolean;
  status: number;
  unreachable: boolean;
  data: T | null;
}

export const SERVER_UNREACHABLE_MESSAGE =
  'Unable to reach the server right now. Please check your connection and try again shortly.';

export async function parseApiResponse<T = Record<string, any>>(
  res: Response
): Promise<ParsedApiResponse<T>> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    return {
      ok: false,
      status: res.status,
      unreachable: true,
      data: null,
    };
  }

  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    return {
      ok: false,
      status: res.status,
      unreachable: true,
      data: null,
    };
  }

  const unreachable = res.status >= 502;
  return {
    ok: res.ok && !unreachable,
    status: res.status,
    unreachable,
    data,
  };
}
