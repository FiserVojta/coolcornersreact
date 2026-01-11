import axios from 'axios';
import type { AxiosRequestHeaders } from 'axios';
import { env } from '../config/env';

type TokenGetter =
  | (() => string | undefined | null | Promise<string | undefined | null>)
  | null;

let tokenGetter: TokenGetter = null;

export const setAuthTokenGetter = (getter: TokenGetter) => {
  tokenGetter = getter;
};

export const apiClient = axios.create({
  baseURL: env.apiUrl
});

apiClient.interceptors.request.use(async (config) => {
  if (tokenGetter) {
    const maybeToken = tokenGetter();
    const token = maybeToken instanceof Promise ? await maybeToken : maybeToken;

    if (token) {
      const headers = (config.headers ?? {}) as AxiosRequestHeaders;
      config.headers = {
        ...headers,
        Authorization: `Bearer ${token}`
      } as AxiosRequestHeaders;
    }
  }

  return config;
});
