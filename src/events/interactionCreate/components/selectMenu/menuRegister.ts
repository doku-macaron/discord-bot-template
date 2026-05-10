import { archiveChannelSelectMenu } from "@/events/interactionCreate/components/selectMenu/items/archiveChannelSelectMenu";
import { helpSectionSelectMenu } from "@/events/interactionCreate/components/selectMenu/items/helpSectionSelectMenu";
import { modRoleSelectMenu } from "@/events/interactionCreate/components/selectMenu/items/modRoleSelectMenu";
import { reportUserSelectMenu } from "@/events/interactionCreate/components/selectMenu/items/reportUserSelectMenu";
import { menuHandler } from "@/events/interactionCreate/components/selectMenu/menuHandlerInstance";

menuHandler.register(helpSectionSelectMenu);
menuHandler.register(reportUserSelectMenu);
menuHandler.register(modRoleSelectMenu);
menuHandler.register(archiveChannelSelectMenu);
