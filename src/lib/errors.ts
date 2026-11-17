export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return (
    err instanceof Error &&
    err.name === 'HttpError' &&
    'status' in err &&
    typeof (err as HttpError).status === 'number'
  )
}

export function toErrorResponse(err: unknown): Response {
  if (isHttpError(err)) {
    return Response.json({ error: err.message }, { status: err.status })
  }
  console.error(err)
  return Response.json({ error: 'Something went wrong' }, { status: 500 })
}
