import { Collection } from "discord.js";
import type { Command } from "../types.js";
import { command as accounts } from "./accounts.js";
import { command as login } from "./login.js";
import { command as logout } from "./logout.js";
import { command as matches } from "./matches.js";
import { command as rank } from "./rank.js";
import { command as servicelogin } from "./servicelogin.js";
import { command as shop } from "./shop.js";
import { command as wishlist } from "./wishlist.js";

export const commands = new Collection<string, Command>(
  [accounts, login, logout, matches, rank, servicelogin, shop, wishlist].map((c) => [c.data.name, c])
);
