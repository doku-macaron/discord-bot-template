export const CUSTOM_ID = {
    BUTTON: {
        PROFILE_EDIT: "profile:edit-button",
        SHOWCASE_ACCESSORY: "showcase:accessory-button",
    },
    MODAL: {
        PROFILE_EDIT: "profile:edit-modal",
        POLL: "poll:modal",
        SHOWCASE_MODAL_V2: "showcase:modal-v2",
    },
    INPUT: {
        PROFILE_BIO: "profile:bio",
        POLL_QUESTION: "poll:question",
        POLL_ANSWERS: "poll:answers",
        POLL_DURATION: "poll:duration",
        POLL_MULTISELECT: "poll:multiselect",
        SHOWCASE_MODAL_V2_FEEDBACK: "showcase:modal-v2:feedback",
        SHOWCASE_MODAL_V2_AGREE: "showcase:modal-v2:agree",
        SHOWCASE_MODAL_V2_PRIORITY: "showcase:modal-v2:priority",
        SHOWCASE_MODAL_V2_FEATURES: "showcase:modal-v2:features",
        SHOWCASE_MODAL_V2_ATTACHMENT: "showcase:modal-v2:attachment",
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
