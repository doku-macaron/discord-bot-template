import {
    ApplicationIntegrationType,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    InteractionContextType,
    MessageFlags,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder,
    userMention,
} from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { getOrCreateGuild } from "@/db/query/guild/getOrCreateGuild";
import { getOrCreateMember } from "@/db/query/member/getOrCreateMember";
import { incrementMemberCommandCount } from "@/db/query/member/incrementMemberCommandCount";
import { CommandWithSubCommand, SubCommand } from "@/events/interactionCreate/commands/chatInput/_core/commandHandler";
import { createProfileEditModal } from "@/events/interactionCreate/components/modal/items/profileEditModal";
import { EMBED_COLOR } from "@/lib/embed";

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
            builder.setName("view").setDescription("プロフィールを表示します (Components v2)");
        },
        async (interaction) => {
            if (!interaction.inCachedGuild()) {
                await interaction.reply("このコマンドはサーバー内で実行してください。");
                return;
            }

            await interaction.deferReply();

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

            const headerSection = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## Profile"),
                    new TextDisplayBuilder().setContent(`User: ${userMention(member.userId)}`),
                    new TextDisplayBuilder().setContent(`Display name: ${member.displayName || "-"}`),
                    new TextDisplayBuilder().setContent(`Command count: ${member.commandCount}`)
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder()
                        .setURL(interaction.user.displayAvatarURL({ size: 256 }))
                        .setDescription(`${interaction.user.username}'s avatar`)
                );

            const editSection = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent("プロフィールの表示名を更新できます。"))
                .setButtonAccessory(
                    new ButtonBuilder().setCustomId(CUSTOM_ID.BUTTON.PROFILE_EDIT).setLabel("Edit").setStyle(ButtonStyle.Primary)
                );

            const container = new ContainerBuilder()
                .setAccentColor(EMBED_COLOR.success)
                .addSectionComponents(headerSection)
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addSectionComponents(editSection);

            await interaction.editReply({
                flags: MessageFlags.IsComponentsV2,
                components: [container],
            });
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
