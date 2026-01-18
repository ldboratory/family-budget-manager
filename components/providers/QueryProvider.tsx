/**
 * TanStack Query Provider
 *
 * React Query 클라이언트를 앱 전체에 제공합니다.
 */

"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 창 포커스 시 자동 리패치 비활성화
            refetchOnWindowFocus: false,
            // 네트워크 재연결 시 리패치
            refetchOnReconnect: true,
            // 재시도 횟수
            retry: 1,
            // 캐시 유지 시간 (5분)
            staleTime: 1000 * 60 * 5,
          },
          mutations: {
            // 뮤테이션 재시도 비활성화
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export default QueryProvider;
