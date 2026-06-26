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
import { findMemberProfile } from "@/db/query/member/findMemberProfile";
import { createProfileEditModal } from "@/events/interactionCreate/components/modal/items/profileEditModal";
import { CommandWithSubCommand, SubCommand } from "@/framework/discord/interactions/chatInput";
import { EMBED_COLOR } from "@/lib/discord/embed";

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

            const profile = await findMemberProfile({
                guildId: interaction.guildId,
                userId: interaction.user.id,
            });
            const bio = profile?.bio ?? "";

            const headerSection = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${interaction.member.displayName}`),
                    new TextDisplayBuilder().setContent(`User: ${userMention(interaction.user.id)}`),
                    new TextDisplayBuilder().setContent(`Bio: ${bio || "-"}`)
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder()
                        .setURL(interaction.user.displayAvatarURL({ size: 256 }))
                        .setDescription(`${interaction.user.username}'s avatar`)
                );

            const editSection = new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent("自己紹介 (bio) を更新できます。"))
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

            const profile = await findMemberProfile({
                guildId: interaction.guildId,
                userId: interaction.user.id,
            });
            await interaction.showModal(createProfileEditModal(profile?.bio ?? ""));
        }
    )
);
