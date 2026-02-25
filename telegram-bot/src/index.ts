import { Bot } from "grammy";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env" });

// Required environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN is required. Please set it in .env file.");
}

// Initialize the bot
const bot = new Bot(BOT_TOKEN);

// In-memory storage for subscriptions (in production, use a database)
const subscriptions = new Map<string, Set<string>>(); // groupId -> Set of chatIds
const chatIdToGroups = new Map<string, Set<string>>(); // chatId -> Set of groupIds

// Command: /subscribe <group_id>
bot.command("subscribe", async (ctx) => {
  const args = ctx.match;
  const chatId = ctx.chat!.id.toString();
  const groupId = args?.trim();

  if (!groupId) {
    await ctx.reply("⚠️ Please provide a group ID.\n\nUsage: /subscribe <group_id>");
    return;
  }

  // Add subscription
  if (!subscriptions.has(groupId)) {
    subscriptions.set(groupId, new Set());
  }
  subscriptions.get(groupId)!.add(chatId);

  // Track user's subscriptions
  if (!chatIdToGroups.has(chatId)) {
    chatIdToGroups.set(chatId, new Set());
  }
  chatIdToGroups.get(chatId)!.add(groupId);

  await ctx.reply(
    `✅ Successfully subscribed to group: *${groupId}*\n\n` +
    `You'll receive notifications for:\n` +
    `• New contributions\n` +
    `• Payout distributions\n` +
    `• New rounds started`,
    { parse_mode: "Markdown" }
  );
});

// Command: /unsubscribe
bot.command("unsubscribe", async (ctx) => {
  const args = ctx.match;
  const chatId = ctx.chat!.id.toString();
  const groupId = args?.trim();

  if (!groupId) {
    await ctx.reply(
      "⚠️ Please provide a group ID.\n\nUsage: /unsubscribe <group_id>\n\n" +
      `Current subscriptions:\n${Array.from(chatIdToGroups.get(chatId) || []).join("\n") || "None"}`
    );
    return;
  }

  // Remove subscription
  if (subscriptions.has(groupId)) {
    subscriptions.get(groupId)!.delete(chatId);
  }
  if (chatIdToGroups.has(chatId)) {
    chatIdToGroups.get(chatId)!.delete(groupId);
  }

  await ctx.reply(`✅ Successfully unsubscribed from group: *${groupId}*`, {
    parse_mode: "Markdown"
  });
});

// Command: /status
bot.command("status", async (ctx) => {
  const chatId = ctx.chat!.id.toString();
  const subscribedGroups = chatIdToGroups.get(chatId);

  if (!subscribedGroups || subscribedGroups.size === 0) {
    await ctx.reply("📊 **Your Subscriptions**\n\nYou are not subscribed to any groups yet.\n\nUse /subscribe <group_id> to start receiving notifications.");
    return;
  }

  const groupList = Array.from(subscribedGroups)
    .map(
      (groupId, index) => `${index + 1}. \`${groupId}\` - Active`
    )
    .join("\n");

  await ctx.reply(
    `📊 **Your Subscriptions**\n\nYou are monitoring ${subscribedGroups.size} group(s):\n\n${groupList}`,
    { parse_mode: "Markdown" }
  );
});

// Command: /help
bot.command("help", async (ctx) => {
  const helpText = `🤖 **SoroSave Telegram Bot Help**

**Commands:**

\`/subscribe <group_id>\` - Subscribe to notifications for a SoroSave group
\`/unsubscribe <group_id>\` - Unsubscribe from a group
\`/status\` - View your current subscriptions
\`/help\` - Show this help message

**Notifications you'll receive:**
• 💰 New contribution events
• 🎉 Payout distributed events
• 🔄 Round started events

**Example:**
\`/subscribe CA7X...\`

Need help? Visit: https://github.com/sorosave-protocol/sdk/issues/60`;

  await ctx.reply(helpText, { parse_mode: "Markdown" });
});

// Middleware: Handle unknown commands
bot.on("msg:text", async (ctx) => {
  const text = ctx.message?.text || "";
  if (text.startsWith("/")) {
    await ctx.reply(
      "❓ Unknown command. Use /help to see available commands."
    );
  }
});

// Functions to send notifications (can be called from other modules)
export class NotificationService {
  /**
   * Send notification about a new contribution
   */
  static async notifyNewContribution(
    groupId: string,
    contributor: string,
    amount: string
  ) {
    const subscribers = subscriptions.get(groupId);
    if (!subscribers || subscribers.size === 0) return;

    const message = `💰 **New Contribution**

**Group:** \`${groupId}\`
**Contributor:** \`${shortenAddress(contributor)}\`
**Amount:** ${amount}

A new contribution has been made to the group pot!`;

    for (const chatId of subscribers) {
      try {
        await bot.api.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error(`Failed to send notification to ${chatId}:`, error);
      }
    }
  }

  /**
   * Send notification about payout distribution
   */
  static async notifyPayoutDistributed(
    groupId: string,
    amount: string,
    round: number
  ) {
    const subscribers = subscriptions.get(groupId);
    if (!subscribers || subscribers.size === 0) return;

    const message = `🎉 **Payout Distributed**

**Group:** \`${groupId}\`
**Round:** #${round}
**Amount:** ${amount}

The round has ended and payouts have been distributed to members!`;

    for (const chatId of subscribers) {
      try {
        await bot.api.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error(`Failed to send notification to ${chatId}:`, error);
      }
    }
  }

  /**
   * Send notification about a new round starting
   */
  static async notifyRoundStarted(groupId: string, round: number, startDate: string) {
    const subscribers = subscriptions.get(groupId);
    if (!subscribers || subscribers.size === 0) return;

    const message = `🔄 **New Round Started**

**Group:** \`${groupId}\`
**Round:** #${round}
**Start Date:** ${startDate}

A new savings round has started! Members can now make contributions.`;

    for (const chatId of subscribers) {
      try {
        await bot.api.sendMessage(chatId, message, { parse_mode: "Markdown" });
      } catch (error) {
        console.error(`Failed to send notification to ${chatId}:`, error);
      }
    }
  }
}

// Helper function to shorten addresses
function shortenAddress(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Start the bot
console.log("🤖 SoroSave Telegram Bot is starting...");
bot.api
  .getMe()
  .then((botInfo) => {
    console.log(`✅ Bot started successfully as @${botInfo.username}`);
  })
  .catch((error) => {
    console.error("❌ Failed to start bot:", error);
  });

export { bot };
