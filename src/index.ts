import "dotenv/config";
import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { commands } from "./commands/index.js";
import { initScheduler, startAllSchedules } from "./scheduler/wishlistScheduler.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (c) => {
  console.log(`로그인 완료: ${c.user.tag}`);
  initScheduler(client);
  void startAllSchedules();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(err);
      const payload = { content: "명령어 실행 중 오류가 발생했습니다.", ephemeral: true } as const;
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
    return;
  }

  if (interaction.isAutocomplete()) {
    const command = commands.get(interaction.commandName);
    if (!command?.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (err) {
      console.error(err);
    }
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error("DISCORD_TOKEN 환경변수가 필요합니다.");

await client.login(token);
