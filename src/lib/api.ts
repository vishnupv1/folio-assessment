import { HttpError, toErrorResponse } from './errors'

export type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>
}

export function api(handler: (req: Request, ctx: RouteContext) => Promise<Response>) {
  return async (req: Request, ctx: RouteContext): Promise<Response> => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      return toErrorResponse(err)
    }
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Expected a JSON object')
  }
  return body as Record<string, unknown>
}

export async function routeId(ctx: RouteContext): Promise<string> {
  const params = await ctx.params
  const id = params.id
  const value = Array.isArray(id) ? id[0] : id
  if (!value) throw new HttpError(400, 'Missing document id')
  return value
}
