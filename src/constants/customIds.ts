export const CUSTOM_ID = {
    BUTTON: {
        PROFILE_EDIT: "profile:edit-button",
    },
    MODAL: {
        PROFILE_EDIT: "profile:edit-modal",
    },
    INPUT: {
        PROFILE_DISPLAY_NAME: "profile:display-name",
    },
} as const;

export const CUSTOM_ID_PATTERN = {
    BUTTON: {
        PROFILE_EDIT_WITH_USER_ID: /^profile:edit-button:\d+$/,
    },
} as const;
