import { ActionRowBuilder, ApplicationIntegrationType, ButtonBuilder, ButtonStyle, EmbedBuilder, InteractionContextType } from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { CommandWithSubCommand, SubCommand } from "@/events/interactionCreate/commands/chatInput/commandHandler";
import { createProfileEditModal } from "@/events/interactionCreate/components/modal/items/profileEditModal";

export const profileCommand = new CommandWithSubCommand((builder) =>
    builder
        .setName("profile")
        .setDescription("DB を使ったプロフィール例です")
        .setContexts(InteractionContextType.Guild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
);

profileCommand.register(
    new SubCommand(
        (builder) => {
            builder.setName("view").setDescription("プロフィールを表示します");
        },
        async (interaction) => {
            if (!interaction.inCachedGuild()) {
                await interaction.reply("このコマンドはサーバー内で実行してください。");
                return;
            }

            await interaction.deferReply();

            const { getOrCreateGuild } = await import("@/db/query/guild/getOrCreateGuild");
            const { getOrCreateMember } = await import("@/db/query/member/getOrCreateMember");
            const { incrementMemberCommandCount } = await import("@/db/query/member/incrementMemberCommandCount");

            await getOrCreateGuild({
                guildId: interaction.guildId,
                name: interaction.guild.name,
            });
            await getOrCreateMember({
                guildId: interaction.guildId,
                userId: interaction.user.id,
                displayName: interaction.member.displayName,
            });

            const member = await incrementMemberCommandCount({
                guildId: interaction.guildId,
                userId: interaction.user.id,
            });

            const embed = new EmbedBuilder()
                .setTitle("Profile")
                .setColor(0x57f287)
                .addFields([
                    {
                        name: "User",
                        value: `<@${member.userId}>`,
                        inline: true,
                    },
                    {
                        name: "Display Name",
                        value: member.displayName || "-",
                        inline: true,
                    },
                    {
                        name: "Command Count",
                        value: `${member.commandCount}`,
                        inline: true,
                    },
                ]);

            const editButton = new ButtonBuilder()
                .setCustomId(CUSTOM_ID.BUTTON.PROFILE_EDIT)
                .setLabel("Edit")
                .setStyle(ButtonStyle.Primary);
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(editButton);

            await interaction.editReply({ embeds: [embed], components: [row] });
        }
    )
);

profileCommand.register(
    new SubCommand(
        (builder) => {
            builder.setName("edit").setDescription("プロフィール編集フォームを開きます");
        },
        async (interaction) => {
            if (!interaction.inCachedGuild()) {
                await interaction.reply("このコマンドはサーバー内で実行してください。");
                return;
            }

            await interaction.showModal(createProfileEditModal(interaction.member.displayName));
        }
    )
);
