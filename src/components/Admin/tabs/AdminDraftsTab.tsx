import React from 'react';
import { useLives } from '../../../hooks/queries/useLives';
import { useSongs } from '../../../hooks/queries/useSongs';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryKeys';
import DraftManagerRaw from '../DraftManager';
const DraftManager = DraftManagerRaw as any;

const AdminDraftsTab = () => {
    const { data: lives = [] } = useLives({ include_setlists: true });
    const { data: songs = [] } = useSongs();
    const queryClient = useQueryClient();

    const handleSetlistImported = (liveId: number) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.lives.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.songs.all });
    };

    return (
        <DraftManager
            lives={lives}
            allSongs={songs}
            onSetlistImported={handleSetlistImported}
        />
    );
};

export default AdminDraftsTab;
