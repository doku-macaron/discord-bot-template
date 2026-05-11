import {
    ApplicationIntegrationType,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    InteractionContextType,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder,
} from "discord.js";
import { CUSTOM_ID } from "@/constants/customIds";
import { Command } from "@/framework/discord/interactions/chatInput/commandHandler";
import { EMBED_COLOR } from "@/lib/discord/embed";

const SHOWCASE_THUMBNAIL = "https://cdn.discordapp.com/embed/avatars/0.png";
const SHOWCASE_GALLERY = [
    {
        url: "https://cdn.discordapp.com/embed/avatars/1.png",
        description: "Sample 1",
    },
    {
        url: "https://cdn.discordapp.com/embed/avatars/2.png",
        description: "Sample 2",
    },
    {
        url: "https://cdn.discordapp.com/embed/avatars/3.png",
        description: "Sample 3",
    },
];

export const showcaseCommand = new Command(
    (builder) =>
        builder
            .setName("showcase")
            .setDescription("Components v2 のリファレンス実装サンプル")
            .setContexts(InteractionContextType.Guild)
            .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
            .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    async (interaction) => {
        const headerText = new TextDisplayBuilder().setContent(
            [
                "# Components v2 showcase",
                "Container / Section / TextDisplay / Separator / MediaGallery を 1 つのメッセージで使った例。",
            ].join("\n")
        );

        const thumbnailSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("**Section + Thumbnail accessory**"),
                new TextDisplayBuilder().setContent("テキストの右側にサムネイル画像を accessory として置けます。")
            )
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(SHOWCASE_THUMBNAIL).setDescription("Discord default avatar"));

        const buttonSection = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("**Section + Button accessory**"),
                new TextDisplayBuilder().setContent(
                    "section の accessory として interactive button を置けます。ボタンの customId は通常通り button handler でルーティングされます。"
                )
            )
            .setButtonAccessory(
                new ButtonBuilder().setCustomId(CUSTOM_ID.BUTTON.SHOWCASE_ACCESSORY).setLabel("Click me").setStyle(ButtonStyle.Primary)
            );

        const gallery = new MediaGalleryBuilder().addItems(
            SHOWCASE_GALLERY.map((item) => new MediaGalleryItemBuilder().setURL(item.url).setDescription(item.description))
        );

        const footerText = new TextDisplayBuilder().setContent(
            "-# Components v2 を使うときは `MessageFlags.IsComponentsV2` を立ててください。content と embeds は併用できません。"
        );

        const container = new ContainerBuilder()
            .setAccentColor(EMBED_COLOR.info)
            .addTextDisplayComponents(headerText)
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addSectionComponents(thumbnailSection)
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addSectionComponents(buttonSection)
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
            .addMediaGalleryComponents(gallery)
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
            .addTextDisplayComponents(footerText);

        await interaction.reply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
        });
    }
);
