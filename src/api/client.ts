import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { AdServeRequest, AdServeResponse } from '../types';

type ClientCtx = {
  baseUrl: string;
  token?: string | null;
  deviceId: string | null;
};

class AdsApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'AdsApiError';
  }
}

function buildClient(ctx: ClientCtx): AxiosInstance {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (ctx.token) headers.Authorization = `Bearer ${ctx.token}`;
  return axios.create({
    baseURL: ctx.baseUrl,
    headers,
    withCredentials: true,
    timeout: 8000,
  });
}

async function post<T>(ctx: ClientCtx, path: string, body: Record<string, unknown>): Promise<T> {
  try {
    const res = await buildClient(ctx).post(path, body);
    const data = res.data;
    if (data?.estado === 'erro') {
      throw new AdsApiError(data?.texto ?? 'Erro do servidor', res.status);
    }
    return data?.data ?? data;
  } catch (e) {
    if (e instanceof AdsApiError) throw e;
    if (axios.isAxiosError(e)) {
      const ax = e as AxiosError<{ texto?: string; estado?: string }>;
      throw new AdsApiError(ax.response?.data?.texto ?? ax.message, ax.response?.status ?? 0);
    }
    throw e;
  }
}

export async function serve(
  ctx: ClientCtx,
  req: AdServeRequest,
): Promise<AdServeResponse | null> {
  return post<AdServeResponse | null>(ctx, '/serve', {
    espaco_id: req.espacoId,
    formato_id: req.formatoId ?? null,
    origem: req.origem ?? null,
    sublocal: req.sublocal ?? null,
    device_id: ctx.deviceId,
    user_age: req.userAge ?? null,
    geo_country: req.geoCountry ?? null,
  });
}

export async function trackImpression(ctx: ClientCtx, token: string): Promise<void> {
  await post(ctx, '/impression', { token, device_id: ctx.deviceId });
}

export async function trackClick(
  ctx: ClientCtx,
  token: string,
): Promise<{ redirect_url: string | null }> {
  return post<{ redirect_url: string | null }>(ctx, '/click', {
    token,
    device_id: ctx.deviceId,
  });
}

export { AdsApiError };
