import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../lib/apiClient';
import type { MetadataReviewSummary } from '../../types/liveMetadata';

export const METADATA_REVIEW_QUERY_KEY = ['admin', 'liveMetadataReview'] as const;
export function useAdminMetadataReview() {
    const { currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';
    return useQuery({
        queryKey: [...METADATA_REVIEW_QUERY_KEY, isAdmin ? currentUser?.id : null],
        queryFn: ({ signal }) => apiClient.get<MetadataReviewSummary[]>('/api/lives/metadata-review', { signal }),
        enabled: isAdmin,
        staleTime: 0,
        retry: false,
    });
}
