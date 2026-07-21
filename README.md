# neyzz-bot-1 — Bot Discord NSFW

Bot Discord en JavaScript avec **une seule commande** : `+nsfw`.

Elle marche dans **n’importe quel salon** et envoie une image NSFW hard (seins, cul, chatte, etc.) tirée au hasard.

## Prérequis

- Node.js 18+
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

5. Invite le bot avec les permissions : `Send Messages`, `Embed Links`, `Read Message History`.

6. Lance :

```bash
npm start
```

## HostMaster (panel.code-master.xyz)

Si tu as l’erreur `ts-node` / `fileExists` ou `Node v12` :

1. Dans les **settings** du serveur HostMaster, change la version de **Node à 18 ou 20** (pas 12).
2. Change la **commande de démarrage** en :
   ```bash
   node index.js
   ```
   (surtout pas `ts-node` — ce bot est en JavaScript, pas TypeScript)
3. Crée un fichier `.env` à la racine :
   ```
   DISCORD_TOKEN=ton_token_ici
   ```
4. Dans la console : `npm install` puis clique **Start**.

Alternative startup :
```bash
npm start
```
ou :
```bash
bash start.sh
```

## Usage

Dans n’importe quel salon texte :

```
+nsfw
```

## Sources

Le bot pioche au hasard parmi :

- **nekobot** : ass, boobs, pussy, gifs, 4k, etc.
- **Reddit** : subs NSFW (gonewild, ass, boobs, pussy, …)
- **waifu.im** (NSFW) en secours

Cooldown : 2,5 s par user pour éviter le spam.
