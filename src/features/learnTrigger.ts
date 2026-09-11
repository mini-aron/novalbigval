import type { Message } from "discord.js";
import type { TextTrigger } from "../types.js";
import { forgetPhrase, findPhrase, learnPhrase } from "../services/learnedPhraseService.js";
import { RESERVED_TRIGGER_WORDS } from "./reservedTriggerWords.js";

// "세이지 배워 <트리거> <대답>"으로 등록하면 "세이지 <트리거>"라고 부를 때 <대답>을 그대로 돌려준다.
const TEACH_PHRASE = "세이지 배워";
const FORGET_PHRASE = "세이지 잊어";
const CALL_PREFIX = "세이지 ";

function guildKeyOf(message: Message): string {
  return message.guildId ?? "dm";
}

function parseTeach(content: string): { trigger: string; response: string } | null {
  const idx = content.indexOf(TEACH_PHRASE);
  const rest = content.slice(idx + TEACH_PHRASE.length).trim().replace(/^[:\-,]\s*/, "");
  const spaceIdx = rest.search(/\s/);
  if (spaceIdx === -1) return null;
  const trigger = rest.slice(0, spaceIdx).trim();
  const response = rest.slice(spaceIdx + 1).trim();
  if (!trigger || !response) return null;
  return { trigger, response };
}

async function handleTeach(message: Message): Promise<void> {
  const parsed = parseTeach(message.content);
  if (!parsed) {
    await message.reply(
      "트리거랑 대답을 같이 알려주셔야 배울 수 있어요. 예: `세이지 배워 아이스크림 차가워잉`"
    );
    return;
  }
  const { trigger, response } = parsed;
  if (RESERVED_TRIGGER_WORDS.has(trigger)) {
    await message.reply(`**${trigger}**는 공주가 이미 다른 용도로 쓰고 있어서 못 배워요.`);
    return;
  }
  await learnPhrase(guildKeyOf(message), trigger, response);
  await message.reply(`**${trigger}**라고 하면 이제 "${response}"라고 답할게요!`);
}

async function handleForget(message: Message): Promise<void> {
  const idx = message.content.indexOf(FORGET_PHRASE);
  const trigger = message.content
    .slice(idx + FORGET_PHRASE.length)
    .trim()
    .replace(/^[:\-,]\s*/, "");
  if (!trigger) {
    await message.reply("뭘 잊으면 될지 알려주세요. 예: `세이지 잊어 아이스크림`");
    return;
  }
  const removed = await forgetPhrase(guildKeyOf(message), trigger);
  await message.reply(
    removed ? `**${trigger}**, 이제 깨끗이 잊어드릴게요.` : `**${trigger}**는 원래 몰랐던걸요.`
  );
}

async function handleRecall(message: Message): Promise<void> {
  const rest = message.content.trim().slice(CALL_PREFIX.length).trim();
  const trigger = rest.split(/\s+/)[0];
  const phrase = await findPhrase(guildKeyOf(message), trigger);
  if (!phrase) return;
  await message.reply(phrase.response);
}

export const teachTrigger: TextTrigger = {
  test: (content) => content.includes(TEACH_PHRASE),
  handle: handleTeach,
};

export const forgetTrigger: TextTrigger = {
  test: (content) => content.includes(FORGET_PHRASE),
  handle: handleForget,
};

// 배워/잊어/날씨 등 예약어를 제외한 "세이지 <아무말>"을 전부 받아, 학습된 트리거가 있으면 응답한다.
// 없으면 조용히 무시한다(아무 말에나 "모르는 말이에요"라고 답하면 시끄러우니까).
export const recallTrigger: TextTrigger = {
  test: (content) => {
    const trimmed = content.trim();
    if (!trimmed.startsWith(CALL_PREFIX)) return false;
    const rest = trimmed.slice(CALL_PREFIX.length).trim();
    if (!rest) return false;
    const firstWord = rest.split(/\s+/)[0];
    return !RESERVED_TRIGGER_WORDS.has(firstWord);
  },
  handle: handleRecall,
};
