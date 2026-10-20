import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface UseDataTableOptions {
  defaultLimit?: number;
}

export function useDataTable(options: UseDataTableOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [limit, setLimit] = useState(Number(searchParams.get("limit")) || options.defaultLimit || 10);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  
  // Debounce search input
  const [inputValue, setInputValue] = useState(search);

  const createQueryString = useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      
      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === "") {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, String(value));
        }
      }
      
      return newSearchParams.toString();
    },
    [searchParams]
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      if (inputValue !== search) {
        setSearch(inputValue);
        setPage(1); // Reset to page 1 on new search
        router.push(`${pathname}?${createQueryString({ search: inputValue, page: 1 })}`);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [inputValue, search, pathname, router, createQueryString]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    router.push(`${pathname}?${createQueryString({ page: newPage })}`);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setPage(1);
    router.push(`${pathname}?${createQueryString({ status: newStatus, page: 1 })}`);
  };

  return {
    page,
    limit,
    search,
    status,
    inputValue,
    setInputValue,
    handlePageChange,
    handleStatusChange,
    createQueryString,
  };
}
