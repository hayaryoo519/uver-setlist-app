interface RequestOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
}

export class ApiError extends Error {
  status: number
  data: { message?: string } | null

  constructor(status: number, data: { message?: string } | null) {
    super(data?.message ?? `HTTP Error ${status}`)
    this.status = status
    this.data = data
  }
}

const request = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { token } : {}),
    ...options.headers,
  }

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    let data: { message?: string } | null = null
    try {
      data = await res.json()
    } catch {
      data = { message: res.statusText }
    }
    throw new ApiError(res.status, data)
  }

  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}

export const apiClient = {
  get: <T = unknown>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'GET' }),
  post: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T = unknown>(url: string, body?: unknown, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T = unknown>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: 'DELETE' }),
}
