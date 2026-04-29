export class ApiError extends Error {
  constructor(status, data) {
    super(data?.message || `HTTP Error ${status}`)
    this.status = status
    this.data = data
  }
}

const request = async (url, options = {}) => {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { token } : {}),
    ...options.headers,
  }

  const res = await fetch(url, { ...options, headers })

  if (!res.ok) {
    let data
    try {
      data = await res.json()
    } catch {
      data = { message: res.statusText }
    }
    throw new ApiError(res.status, data)
  }

  if (res.status === 204) return null
  return res.json()
}

export const apiClient = {
  get: (url, options) =>
    request(url, { ...options, method: 'GET' }),
  post: (url, body, options) =>
    request(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (url, body, options) =>
    request(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (url, options) =>
    request(url, { ...options, method: 'DELETE' }),
}
