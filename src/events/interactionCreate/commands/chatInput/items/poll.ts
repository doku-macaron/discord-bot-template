import { ApplicationIntegrationType, InteractionContextType, MessageFlags, PermissionFlagsBits } from "discord.js";
import { Command } from "@/framework/discord/interactions/chatInput";

const QUESTION_OPTION = "question";
const ANSWERS_OPTION = "answers";
const DURATION_OPTION = "duration";
const MULTISELECT_OPTION = "multiselect";

// Discord limits.
const ANSWER_MAX_LENGTH = 55;
const ANSWER_MIN_COUNT = 2;
const ANSWER_MAX_COUNT = 10;
const DURATION_MIN_HOURS = 1;
const DURATION_MAX_HOURS = 768;
const DURATION_DEFAULT_HOURS = 24;

export const pollCommand = new Command(
    (builder) =>
        builder
            .setName("poll")
            .setDescription("Discord ネイティブ Poll を投稿するサンプル")
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages)
            .addStringOption((opt) =>
                opt.setName(QUESTION_OPTION).setDescription("質問文 (最大 300 文字)").setRequired(true).setMaxLength(300)
            )
            .addStringOption((opt) =>
                opt
                    .setName(ANSWERS_OPTION)
                    .setDescription(`選択肢をカンマ区切りで 2〜${ANSWER_MAX_COUNT} 個 (各 ${ANSWER_MAX_LENGTH} 文字以内)`)
                    .setRequired(true)
            )
            .addIntegerOption((opt) =>
                opt
                    .setName(DURATION_OPTION)
                    .setDescription(`期間 (時間)、既定 ${DURATION_DEFAULT_HOURS}h`)
                    .setMinValue(DURATION_MIN_HOURS)
                    .setMaxValue(DURATION_MAX_HOURS)
            )
            .addBooleanOption((opt) => opt.setName(MULTISELECT_OPTION).setDescription("複数選択を許可するか (既定 false)")),
    async (interaction) => {
        const question = interaction.options.getString(QUESTION_OPTION, true);
        const answersRaw = interaction.options.getString(ANSWERS_OPTION, true);
        const duration = interaction.options.getInteger(DURATION_OPTION) ?? DURATION_DEFAULT_HOURS;
        const allowMultiselect = interaction.options.getBoolean(MULTISELECT_OPTION) ?? false;

        const answers = answersRaw
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

        if (answers.length < ANSWER_MIN_COUNT || answers.length > ANSWER_MAX_COUNT) {
            await interaction.reply({
                content: `選択肢は ${ANSWER_MIN_COUNT}〜${ANSWER_MAX_COUNT} 個指定してください (現在 ${answers.length} 個)。`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const tooLong = answers.find((a) => a.length > ANSWER_MAX_LENGTH);
        if (tooLong) {
            await interaction.reply({
                content: `選択肢は 1 つあたり ${ANSWER_MAX_LENGTH} 文字以内にしてください: "${tooLong}"`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

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
