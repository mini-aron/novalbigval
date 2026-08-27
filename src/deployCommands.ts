import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_DEV_GUILD_ID;

if (!token || !clientId) {
  throw new Error("DISCORD_TOKEN, DISCORD_CLIENT_ID 환경변수가 필요합니다.");
}

const rest = new REST().setToken(token);
const body = commands.map((c) => c.data.toJSON());

const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

await rest.put(route, { body });

console.log(
  `${body.length}개 명령어를 ${guildId ? `길드(${guildId})` : "글로벌"}에 등록했습니다.`
);
