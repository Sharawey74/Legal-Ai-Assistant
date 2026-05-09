import client from "./client";
import type { TokenResponse } from "../types/auth.types";

export const register = (email: string, password: string) =>
  client.post("/auth/register", { email, password });

export const login = async (email: string, password: string): Promise<string> => {
  const res = await client.post<TokenResponse>("/auth/login", { email, password });
  return res.data.access_token;
};
