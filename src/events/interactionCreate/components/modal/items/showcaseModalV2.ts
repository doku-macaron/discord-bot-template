import {
    type Attachment,
    CheckboxBuilder,
    CheckboxGroupBuilder,
    type Collection,
    ComponentType,
    FileUploadBuilder,
    LabelBuilder,
    MessageFlags,
    ModalBuilder,
    RadioGroupBuilder,
    type Snowflake,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Modal } from "@/framework/discord/interactions/components/modal";

const FEEDBACK_MAX_LENGTH = 500;
const FEATURE_OPTIONS = [
    { label: "Notifications", value: "notifications" },
    { label: "Dark mode", value: "dark-mode" },
    { label: "Auto-save", value: "auto-save" },
] as const;
const PRIORITY_OPTIONS = [
    { label: "Low", value: "low" },
    { label: "Medium", value: "medium" },
    { label: "High", value: "high" },
] as const;

export function createShowcaseModalV2(): ModalBuilder {
    const feedbackInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT.SHOWCASE_MODAL_V2_FEEDBACK)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(FEEDBACK_MAX_LENGTH);

    const agreeCheckbox = new CheckboxBuilder().setCustomId(CUSTOM_ID.INPUT.SHOWCASE_MODAL_V2_AGREE).setDefault(false);

    const priorityRadio = new RadioGroupBuilder().setCustomId(CUSTOM_ID.INPUT.SHOWCASE_MODAL_V2_PRIORITY).addOptions(...PRIORITY_OPTIONS);

    const featuresGroup = new CheckboxGroupBuilder()
        .setCustomId(CUSTOM_ID.INPUT.SHOWCASE_MODAL_V2_FEATURES)
        .addOptions(...FEATURE_OPTIONS)
        .setMinValues(0)
        .setMaxValues(FEATURE_OPTIONS.length)
        // Discord rejects `min_values: 0` unless the field is explicitly
        // marked non-required.
        .setRequired(false);

    const fileUpload = new FileUploadBuilder()
        .setCustomId(CUSTOM_ID.INPUT.SHOWCASE_MODAL_V2_ATTACHMENT)
        .setMinValues(0)
        .setMaxValues(1)
        .setRequired(false);

    return new ModalBuilder()
        .setCustomId(CUSTOM_ID.MODAL.SHOWCASE_MODAL_V2)
        .setTitle("Modal v2 Showcase")
        .addLabelComponents(
            new LabelBuilder().setLabel("Feedback").setDescription("free text").setTextInputComponent(feedbackInput),
            new LabelBuilder().setLabel("I agree to the terms").setCheckboxComponent(agreeCheckbox),
            new LabelBuilder().setLabel("Priority").setRadioGroupComponent(priorityRadio),
            new LabelBuilder().setLabel("Enabled features").setCheckboxGroupComponent(featuresGroup),
            new LabelBuilder().setLabel("Attachment").setDescription("optional, up to 1 file").setFileUploadComponent(fileUpload)
        );
}

export const showcaseModalV2 = new Modal(
    () => CUSTOM_ID.MODAL.SHOWCASE_MODAL_V2,
    async (interaction) => {
        const feedback = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT.SHOWCASE_MODAL_V2_FEEDBACK);
        const agreed = interaction.fields.getCheckbox(CUSTOM_ID.INPUT.SHOWCASE_MODAL_V2_AGREE);
        const priority = interaction.fields.getRadioGroup(CUSTOM_ID.INPUT.SHOWCASE_MODAL_V2_PRIORITY, false);
        const features = interaction.fields.getCheckboxGroup(CUSTOM_ID.INPUT.SHOWCASE_MODAL_V2_FEATURES);

        const fileField = interaction.fields.getField(CUSTOM_ID.INPUT.SHOWCASE_MODAL_V2_ATTACHMENT, ComponentType.FileUpload);
        const attachments = fileField.attachments as Collection<Snowflake, Attachment>;
        const attachmentSummary = attachments.size > 0 ? attachments.map((a) => a.name).join(", ") : "(none)";

        const summary = [
            "**Modal v2 submission**",
            `- Feedback: ${feedback}`,
            `- Agreed to terms: ${agreed ? "✓" : "✗"}`,
            `- Priority: ${priority ?? "(not selected)"}`,
            `- Features: ${features.length > 0 ? features.join(", ") : "(none)"}`,
            `- Attachments: ${attachmentSummary}`,
        ].join("\n");

        await interaction.reply({
            content: summary,
            flags: MessageFlags.Ephemeral,
        });
    }
);
