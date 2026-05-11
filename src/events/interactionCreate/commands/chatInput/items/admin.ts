import {
    ActionRowBuilder,
    ApplicationIntegrationType,
    ChannelSelectMenuBuilder,
    ChannelType,
    InteractionContextType,
    MessageFlags,
    PermissionFlagsBits,
    RoleSelectMenuBuilder,
    UserSelectMenuBuilder,
} from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { CommandWithSubCommand, SubCommand } from "@/framework/discord/interactions/chatInput";

export const adminCommand = new CommandWithSubCommand((builder) =>
    builder
        .setName("admin")
        .setDescription("Select menu のサンプル admin コマンドです")
        .setContexts(InteractionContextType.Guild)
        .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
);

adminCommand.register(
    new SubCommand(
        (builder) => {
            builder.setName("report-user-select").setDescription("ユーザーを選んで report します (User Select サンプル)");
        },
        async (interaction) => {
            const menu = new UserSelectMenuBuilder()
                .setCustomId(CUSTOM_ID.SELECT_MENU.REPORT_USER)
                .setPlaceholder("ユーザーを選択")
                .setMinValues(1)
                .setMaxValues(1);
            const row = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(menu);
            await interaction.reply({
                content: "Report 対象のユーザーを選んでください。",
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
        }
    )
);

adminCommand.register(
    new SubCommand(
        (builder) => {
            builder.setName("set-mod-role").setDescription("Mod ロールを選びます (Role Select サンプル)");
        },
        async (interaction) => {
            const menu = new RoleSelectMenuBuilder()
                .setCustomId(CUSTOM_ID.SELECT_MENU.MOD_ROLE)
                .setPlaceholder("Mod ロールを選択")
                .setMinValues(1)
                .setMaxValues(1);
            const row = new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(menu);
            await interaction.reply({
                content: "Mod に設定するロールを選んでください。",
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
        }
    )
);

adminCommand.register(
    new SubCommand(
        (builder) => {
            builder.setName("set-archive-channel").setDescription("アーカイブ用テキストチャンネルを選びます (Channel Select サンプル)");
        },
        async (interaction) => {
            const menu = new ChannelSelectMenuBuilder()
                .setCustomId(CUSTOM_ID.SELECT_MENU.ARCHIVE_CHANNEL)
                .setPlaceholder("テキストチャンネルを選択")
                .setChannelTypes(ChannelType.GuildText)
                .setMinValues(1)
                .setMaxValues(1);
            const row = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(menu);
            await interaction.reply({
                content: "アーカイブに使うテキストチャンネルを選んでください。",
                components: [row],
                flags: MessageFlags.Ephemeral,
            });
        }
    )
);
