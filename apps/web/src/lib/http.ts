type ErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string | undefined;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);

    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

type JsonRequestInit = Omit<RequestInit, 'headers'> & {
  headers?: Readonly<Record<string, string>>;
};

export async function request(
  url: string,
  init: JsonRequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    let errorBody: ErrorResponse = {};

    try {
      errorBody = (await response.json()) as ErrorResponse;
    } catch {
      // The server did not return a JSON error body.
    }

    throw new ApiError(
      response.status,
      errorBody.error?.message ?? 'The request failed',
      errorBody.error?.code
    );
  }

  return response;
}

export async function requestJson<T>(
  url: string,
  init: JsonRequestInit = {}
): Promise<T> {
  const response = await request(url, init);

  return (await response.json()) as T;
}
