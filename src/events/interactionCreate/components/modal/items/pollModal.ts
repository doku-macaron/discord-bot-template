import { CheckboxBuilder, LabelBuilder, MessageFlags, ModalBuilder, RadioGroupBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Modal } from "@/framework/discord/interactions/components/modal";

// Discord limits.
const QUESTION_MAX_LENGTH = 300;
const ANSWER_MAX_LENGTH = 55;
const ANSWER_MIN_COUNT = 2;
const ANSWER_MAX_COUNT = 10;
// Each answer can be ≤ 55 chars and we allow up to 10 separated by newlines,
// so 10 * (55 + 1) is a safe upper bound for the textarea.
const ANSWERS_INPUT_MAX_LENGTH = ANSWER_MAX_COUNT * (ANSWER_MAX_LENGTH + 1);

const DURATION_OPTIONS = [
    { label: "1 hour", value: "1" },
    { label: "6 hours", value: "6" },
    { label: "24 hours", value: "24" },
    { label: "3 days", value: "72" },
    { label: "7 days", value: "168" },
] as const;

export function createPollModal(): ModalBuilder {
    const questionInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT.POLL_QUESTION)
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(QUESTION_MAX_LENGTH);

    const answersInput = new TextInputBuilder()
        .setCustomId(CUSTOM_ID.INPUT.POLL_ANSWERS)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(ANSWERS_INPUT_MAX_LENGTH);

    const durationRadio = new RadioGroupBuilder().setCustomId(CUSTOM_ID.INPUT.POLL_DURATION).addOptions(...DURATION_OPTIONS);

    const multiselectCheckbox = new CheckboxBuilder().setCustomId(CUSTOM_ID.INPUT.POLL_MULTISELECT).setDefault(false);

    return new ModalBuilder()
        .setCustomId(CUSTOM_ID.MODAL.POLL)
        .setTitle("Create poll")
        .addLabelComponents(
            new LabelBuilder().setLabel("Question").setTextInputComponent(questionInput),
            new LabelBuilder()
                .setLabel("Answers")
                .setDescription(`one per line, ${ANSWER_MIN_COUNT}-${ANSWER_MAX_COUNT} entries, ${ANSWER_MAX_LENGTH} chars each`)
                .setTextInputComponent(answersInput),
            new LabelBuilder().setLabel("Duration").setRadioGroupComponent(durationRadio),
            new LabelBuilder().setLabel("Allow multiple selections").setCheckboxComponent(multiselectCheckbox)
        );
}

export const pollModal = new Modal(
    () => CUSTOM_ID.MODAL.POLL,
    async (interaction) => {
        const question = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT.POLL_QUESTION).trim();
        const answersRaw = interaction.fields.getTextInputValue(CUSTOM_ID.INPUT.POLL_ANSWERS);
        const durationRaw = interaction.fields.getRadioGroup(CUSTOM_ID.INPUT.POLL_DURATION, true);
        const allowMultiselect = interaction.fields.getCheckbox(CUSTOM_ID.INPUT.POLL_MULTISELECT);

        const answers = answersRaw
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (answers.length < ANSWER_MIN_COUNT || answers.length > ANSWER_MAX_COUNT) {
            await interaction.reply({
                content: `Provide ${ANSWER_MIN_COUNT}-${ANSWER_MAX_COUNT} answers, one per line (got ${answers.length}).`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const tooLong = answers.find((a) => a.length > ANSWER_MAX_LENGTH);
        if (tooLong) {
            await interaction.reply({
                content: `Each answer must be ${ANSWER_MAX_LENGTH} characters or less: "${tooLong}"`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const duration = Number.parseInt(durationRaw, 10);

        await interaction.reply({
            poll: {
                question: { text: question },
                answers: answers.map((text) => ({ text })),
                duration,
                allowMultiselect,
            },
        });
    }
);
