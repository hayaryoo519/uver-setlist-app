// Storage key for attended lives
const STORAGE_KEY = 'uver_attended_lives';

/**
 * Get the list of attended live IDs.
 * @returns {string[]} Array of live IDs
 */
export const getAttendedLives = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error('Failed to load attended lives', e);
        return [];
    }
};

/**
 * Toggle attendance status for a live.
 * @param {string} liveId - The ID of the live to toggle
 * @returns {string[]} Updated array of live IDs
 */
export const toggleAttendance = (liveId) => {
    try {
        const current = getAttendedLives();
        const index = current.indexOf(liveId);

        let updated;
        if (index >= 0) {
            // Remove if already exists
            updated = current.filter(id => id !== liveId);
        } else {
            // Add if not exists
            updated = [...current, liveId];
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    } catch (e) {
        console.error('Failed to save attended lives', e);
        return [];
    }
};

/**
 * Check if a live is attended.
 * @param {string} liveId 
 * @returns {boolean}
 */
export const isAttended = (liveId) => {
    const current = getAttendedLives();
    return current.includes(liveId);
};

// Storage key for user profile
const USER_PROFILE_KEY = 'uver_user_profile';

/**
 * Get the user profile data.
 * @returns {object} Profile object { name, twitter, instagram, youtube, website }
 */
export const getUserProfile = () => {
    try {
        const stored = localStorage.getItem(USER_PROFILE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (e) {
        console.error('Failed to load user profile', e);
        return {};
    }
};

/**
 * Save the user profile data.
 * @param {object} profileData 
 */
export const saveUserProfile = (profileData) => {
    try {
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profileData));
    } catch (e) {
        console.error('Failed to save user profile', e);
    }
};
