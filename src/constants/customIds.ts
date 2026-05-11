export const CUSTOM_ID = {
    BUTTON: {
        PROFILE_EDIT: "profile:edit-button",
        SHOWCASE_ACCESSORY: "showcase:accessory-button",
    },
    MODAL: {
        PROFILE_EDIT: "profile:edit-modal",
        POLL: "poll:modal",
    },
    INPUT: {
        PROFILE_BIO: "profile:bio",
        POLL_QUESTION: "poll:question",
        POLL_ANSWERS: "poll:answers",
        POLL_DURATION: "poll:duration",
        POLL_MULTISELECT: "poll:multiselect",
    },
    SELECT_MENU: {
        HELP_SECTION: "help:section-select",
        REPORT_USER: "report:user-select",
        MOD_ROLE: "admin:mod-role-select",
        ARCHIVE_CHANNEL: "admin:archive-channel-select",
    },
} as const;

export const CUSTOM_ID_PATTERN = {
    BUTTON: {
        PROFILE_EDIT_WITH_USER_ID: /^profile:edit-button:\d+$/,
    },
} as const;
