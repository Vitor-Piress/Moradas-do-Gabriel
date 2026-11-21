import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  LinkInsert,
  LinkUpdate,
  TypedAccommodation,
  TypedBusinessInfo,
} from "../@types/database.types";
import {
  createAccommodation,
  createLink,
  deleteAccommodation,
  deleteLink,
  getAccommodationBySlug,
  getActiveAccommodations,
  getActiveLinks,
  getAllAccommodations,
  getAllLinks,
  getAnalyticsSummary,
  getBusinessInfo,
  reorderLinks,
  saveBusinessInfo,
  updateAccommodation,
  updateLink,
  type SaveAccommodationPayload,
  type SaveBusinessInfoInput,
} from "../services";
import {
  clearPublicCache,
  PUBLIC_CACHE_KEYS,
  readPublicCache,
  writePublicCache,
} from "../utils/publicCache";

export const QUERY_KEYS = {
  activeLinks: ["links", "active"] as const,
  allLinks: ["links", "all"] as const,
  activeAccommodations: ["accommodations", "active"] as const,
  allAccommodations: ["accommodations", "all"] as const,
  businessInfo: ["business_info"] as const,
  analytics: ["analytics_summary"] as const,
};

export function useActiveAccommodations() {
  return useQuery({
    queryKey: QUERY_KEYS.activeAccommodations,
    queryFn: async () => {
      const data = await getActiveAccommodations();
      writePublicCache(PUBLIC_CACHE_KEYS.accommodations, data);
      return data;
    },
    initialData: () =>
      readPublicCache<TypedAccommodation[]>(PUBLIC_CACHE_KEYS.accommodations)
        ?.data,
    initialDataUpdatedAt: () => 0,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAllAccommodations() {
  return useQuery({
    queryKey: QUERY_KEYS.allAccommodations,
    queryFn: getAllAccommodations,
  });
}

export function useAccommodationBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["accommodations", "slug", slug] as const,
    queryFn: () => (slug ? getAccommodationBySlug(slug) : Promise.resolve(null)),
    initialData: () => {
      if (!slug) return undefined;
      return readPublicCache<TypedAccommodation[]>(
        PUBLIC_CACHE_KEYS.accommodations,
      )?.data?.find((item) => item.slug === slug);
    },
    initialDataUpdatedAt: () => 0,
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAccommodationMutations() {
  const queryClient = useQueryClient();

  const invalidateAccommodations = () => {
    clearPublicCache(PUBLIC_CACHE_KEYS.accommodations);
    queryClient.invalidateQueries({ queryKey: ["accommodations"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: SaveAccommodationPayload) =>
      createAccommodation(payload),
    onSuccess: invalidateAccommodations,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SaveAccommodationPayload>;
    }) => updateAccommodation(id, updates),
    onSuccess: invalidateAccommodations,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAccommodation(id),
    onSuccess: invalidateAccommodations,
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
  };
}

export function useActiveLinks() {
  return useQuery({
    queryKey: QUERY_KEYS.activeLinks,
    queryFn: getActiveLinks,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAllLinks() {
  return useQuery({
    queryKey: QUERY_KEYS.allLinks,
    queryFn: getAllLinks,
  });
}

export function useBusinessInfo() {
  return useQuery({
    queryKey: QUERY_KEYS.businessInfo,
    queryFn: async () => {
      const data = await getBusinessInfo();
      if (data.id) {
        writePublicCache(PUBLIC_CACHE_KEYS.businessInfo, data);
      }
      return data;
    },
    initialData: () =>
      readPublicCache<TypedBusinessInfo>(PUBLIC_CACHE_KEYS.businessInfo)?.data,
    initialDataUpdatedAt: () => 0,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.analytics,
    queryFn: getAnalyticsSummary,
  });
}

export function useLinkMutations() {
  const queryClient = useQueryClient();

  const invalidateLinks = () => {
    queryClient.invalidateQueries({ queryKey: ["links"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: LinkInsert) => createLink(payload),
    onSuccess: invalidateLinks,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: LinkUpdate }) =>
      updateLink(id, updates),
    onSuccess: invalidateLinks,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLink(id),
    onSuccess: invalidateLinks,
  });

  const reorderMutation = useMutation({
    mutationFn: (items: Array<{ id: string; position: number }>) =>
      reorderLinks(items),
    onSuccess: invalidateLinks,
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    reorderMutation,
  };
}

export function useSaveBusinessInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveBusinessInfoInput) => saveBusinessInfo(input),
    onSuccess: (saved) => {
      if (saved?.id) {
        writePublicCache(PUBLIC_CACHE_KEYS.businessInfo, saved);
        queryClient.setQueryData(QUERY_KEYS.businessInfo, saved);
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.businessInfo });
    },
  });
}
