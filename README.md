# neyzz-bot-1 — Bot Discord NSFW

Bot Discord en JavaScript avec **une seule commande** : `+nsfw`.

Elle marche dans **n’importe quel salon** et envoie une image NSFW hard (seins, cul, chatte, etc.) tirée au hasard.

## Prérequis

- Node.js 12+
- Un bot Discord ([Discord Developer Portal](https://discord.com/developers/applications))

## Setup

1. Installe les deps :

```bash
npm install
```

2. Crée le fichier `.env` :

```bash
cp .env.example .env
```

3. Colle ton token dans `.env` :

```
DISCORD_TOKEN=ton_token_ici
```

4. Active les **Privileged Gateway Intents** du bot dans le portail Discord :

- Message Content Intent
- Server Members Intent (si demandé)

5. Invite le bot avec les permissions : `Send Messages`, `Embed Links`, `Read Message History`.

6. Lance :

```bash
npm start
```

## Usage

```
+nsfw          → random hard
+nsfw bite / zgeg  → gros penis
+nsfw seins    → gros seins
+nsfw chatte   → chattes
+nsfw cul      → gros culs
+nsfw anal     → anal
+nsfw gif      → gifs hard
+nsfw help     → liste des commandes
```

Sources principales : Reddit hard (MassiveCock, hugeboobs, godpussy, bigasses…) + nekobot + n-sfw.

Cooldown : 2 s par user.
