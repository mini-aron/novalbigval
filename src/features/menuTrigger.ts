import type { Message } from "discord.js";
import type { TextTrigger } from "../types.js";
import { princessEmbed } from "../commands/_embed.js";
import { addMenuItem, listMenuItems, pickRandomMenuItem, removeMenuItem } from "../services/menuService.js";

// "세이지 메뉴 추가 <메뉴>"로 누구나 후보를 계속 늘릴 수 있고, "세이지 오늘의 메뉴"로 그중 하나를 골라준다.
const ADD_PHRASE = "세이지 메뉴 추가";
const REMOVE_PHRASE = "세이지 메뉴 삭제";
const LIST_PHRASE = "세이지 메뉴 목록";
const RECOMMEND_PHRASE = "세이지 오늘의 메뉴";

function guildKeyOf(message: Message): string {
  return message.guildId ?? "dm";
}

function extractArg(content: string, phrase: string): string {
  const idx = content.indexOf(phrase);
  return content
    .slice(idx + phrase.length)
    .trim()
    .replace(/^[:\-,]\s*/, "");
}

async function handleAdd(message: Message): Promise<void> {
  const name = extractArg(message.content, ADD_PHRASE);
  if (!name) {
    await message.reply("어떤 메뉴를 추가할지 알려주세요. 예: `세이지 메뉴 추가 김치찌개`");
    return;
  }
  const added = await addMenuItem(guildKeyOf(message), name);
  await message.reply(
    added ? `**${name}**, 오늘의 메뉴 후보로 잘 챙겨둘게요!` : `**${name}**는 이미 후보에 있는걸요.`
  );
}

async function handleRemove(message: Message): Promise<void> {
  const name = extractArg(message.content, REMOVE_PHRASE);
  if (!name) {
    await message.reply("어떤 메뉴를 뺄지 알려주세요. 예: `세이지 메뉴 삭제 김치찌개`");
    return;
  }
  const removed = await removeMenuItem(guildKeyOf(message), name);
  await message.reply(removed ? `**${name}**, 후보에서 빼드릴게요.` : `**${name}**는 원래 후보에 없었는걸요.`);
}

async function handleList(message: Message): Promise<void> {
  const items = await listMenuItems(guildKeyOf(message));
  if (items.length === 0) {
    await message.reply("아직 후보로 챙겨둔 메뉴가 없는걸요. `세이지 메뉴 추가 <메뉴>`로 알려주세요.");
    return;
  }
  const embed = princessEmbed()
    .setTitle("👑 공주가 챙겨둔 메뉴 후보")
    .setDescription(items.map((i) => `• ${i.name}`).join("\n"));
  await message.reply({ embeds: [embed] });
}

async function handleRecommend(message: Message): Promise<void> {
  const picked = await pickRandomMenuItem(guildKeyOf(message));
  if (!picked) {
    await message.reply("아직 후보가 하나도 없는걸요. `세이지 메뉴 추가 <메뉴>`로 먼저 알려주세요.");
    return;
  }
  await message.reply(`오늘은 **${picked.name}** 어때요?`);
}

export const menuAddTrigger: TextTrigger = { test: (c) => c.includes(ADD_PHRASE), handle: handleAdd };
export const menuRemoveTrigger: TextTrigger = { test: (c) => c.includes(REMOVE_PHRASE), handle: handleRemove };
export const menuListTrigger: TextTrigger = { test: (c) => c.includes(LIST_PHRASE), handle: handleList };
export const menuRecommendTrigger: TextTrigger = {
  test: (c) => c.includes(RECOMMEND_PHRASE),
  handle: handleRecommend,
};
