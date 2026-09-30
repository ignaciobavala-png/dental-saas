import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryCache, MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./styles.css";
import { RequestErrors, showRequestError } from "./components/RequestErrors";

// Remove the historical PWA API cache, which must never hold clinical data.
if ("caches" in window) void caches.delete("api");

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: showRequestError }),
  mutationCache: new MutationCache({ onError: showRequestError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const container = document.getElementById("root");
if (!container) throw new Error("No se encontró #root");

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <RequestErrors />
    </QueryClientProvider>
  </StrictMode>,
);
