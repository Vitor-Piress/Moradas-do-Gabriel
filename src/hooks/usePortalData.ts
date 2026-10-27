import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LinkInsert, LinkUpdate } from "../@types/database.types";
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
    queryFn: getActiveAccommodations,
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
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 2,
  });
}

export function useAccommodationMutations() {
  const queryClient = useQueryClient();

  const invalidateAccommodations = () => {
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
    queryFn: getBusinessInfo,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.businessInfo });
    },
  });
}
