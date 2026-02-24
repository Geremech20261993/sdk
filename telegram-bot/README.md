# SoroSave Telegram Bot

A Telegram bot for monitoring SoroSave group events.

## Features

- Subscribe to groups for notifications
- Real-time alerts for new contributions
- Payout distribution notifications
- Round start notifications

#2 Setup

1. Create a bot with [@BotFather](https://t.me/BotFather)
2. Copy the bot token
3. Set `TELEGRAM_BOT_TOKEN` in `.env`
4. Run `npm install  && npm run dev

## Commands

| Command | Description |
|--------|-----------|
| `/subscribe <group_id>` | Subscribe to a group |
| `/unsubscribe <group_id>` | Unsubscribe |
| `/status` | View subscriptions |
| `/help` | Show help |

## Notification Types

- 💰 New Contribution
- 🎉 Payout Distributed  
- 🔄 Round Started

## License

MIT
