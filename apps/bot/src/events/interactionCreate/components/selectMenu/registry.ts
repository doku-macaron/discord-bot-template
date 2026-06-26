import { archiveChannelSelectMenu } from "@/events/interactionCreate/components/selectMenu/items/archiveChannelSelectMenu";
import { helpSectionSelectMenu } from "@/events/interactionCreate/components/selectMenu/items/helpSectionSelectMenu";
import { modRoleSelectMenu } from "@/events/interactionCreate/components/selectMenu/items/modRoleSelectMenu";
import { reportUserSelectMenu } from "@/events/interactionCreate/components/selectMenu/items/reportUserSelectMenu";
import { MenuHandler } from "@/framework/discord/interactions/components/selectMenu";

export const menuHandler = new MenuHandler();
menuHandler.register(helpSectionSelectMenu);
menuHandler.register(reportUserSelectMenu);
menuHandler.register(modRoleSelectMenu);
menuHandler.register(archiveChannelSelectMenu);
