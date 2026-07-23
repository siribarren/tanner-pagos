import createClient from "openapi-fetch";

import type { paths } from "./schema";

export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "",
});

apiClient.use({
  onRequest({ request }) {
    const t = localStorage.getItem("accessToken");
    if (t) request.headers.set("Authorization", `Bearer ${t}`);
    return request;
  },
  onResponse({ response }) {
    // ponytail: un 401 solo limpia tokens y falla; sin reload (evita bucle de recargas).
    if (response.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
    return response;
  },
});
