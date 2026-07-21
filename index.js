require("dotenv").config();

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (Number.isNaN(nodeMajor) || nodeMajor < 18) {
  console.error(
    `Node ${process.version} est trop vieux. Sur HostMaster, mets Node 18 ou 20 (pas 12), puis relance.`
  );
  process.exit(1);
}

const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = "+";

if (!TOKEN) {
  console.error("DISCORD_TOKEN manquant. Crée un fichier .env avec DISCORD_TOKEN=... ou mets la variable dans le panel.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/**
 * Types nekobot "hard" / explicites.
 * Pondération plus forte sur le réel (ass, boobs, pussy, anal, gonewild, 4k, pgif).
 */
const NEKOBOT_POOL = [
  "ass",
  "ass",
  "ass",
  "boobs",
  "boobs",
  "boobs",
  "pussy",
  "pussy",
  "pussy",
  "anal",
  "anal",
  "gonewild",
  "gonewild",
  "4k",
  "4k",
  "pgif",
  "pgif",
  "thigh",
  "hass",
  "hboobs",
  "hentai",
  "hanal",
  "paizuri",
];

const REDDIT_SUBS = [
  "nsfw",
  "RealGirls",
  "gonewild",
  "ass",
  "boobs",
  "pussy",
  "godpussy",
  "thick",
  "pawg",
  "nsfw_gif",
  "Amateur",
  "OnOff",
  "milf",
  "curvy",
  "bigasses",
  "TittyDrop",
  "holdthemoan",
  "Nudes",
  "nsfwcosplay",
];

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;
const cooldowns = new Map();
const COOLDOWN_MS = 2500;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "neyzz-nsfw-bot/1.0 (Discord bot)",
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fromNekobot() {
  const type = pick(NEKOBOT_POOL);
  const data = await fetchJson(`https://nekobot.xyz/api/image?type=${encodeURIComponent(type)}`);
  if (!data?.success || typeof data.message !== "string") {
    throw new Error(`nekobot/${type} empty`);
  }
  return { url: data.message, source: type };
}

async function fromReddit() {
  const sub = pick(REDDIT_SUBS);
  const sort = pick(["hot", "top"]);
  const url = `https://www.reddit.com/r/${sub}/${sort}.json?limit=80&t=week`;
  const data = await fetchJson(url);
  const posts = (data?.data?.children || [])
    .map((c) => c.data)
    .filter((p) => {
      if (!p || p.stickied || p.is_self || !p.url) return false;
      return (
        IMAGE_EXT.test(p.url) ||
        p.url.includes("i.redd.it") ||
        p.url.includes("i.imgur.com") ||
        p.post_hint === "image" ||
        Boolean(p.preview?.images?.[0]?.source?.url)
      );
    });

  if (!posts.length) throw new Error(`reddit r/${sub} empty`);

  const post = pick(posts);
  let imageUrl = post.url;

  if (!IMAGE_EXT.test(imageUrl) && post.preview?.images?.[0]?.source?.url) {
    imageUrl = post.preview.images[0].source.url.replace(/&amp;/g, "&");
  }

  if (imageUrl.includes("imgur.com") && !IMAGE_EXT.test(imageUrl) && !imageUrl.includes("i.imgur")) {
    imageUrl = `https://i.imgur.com/${imageUrl.split("/").pop()}.jpg`;
  }

  return {
    url: imageUrl,
    source: `r/${sub}`,
    title: post.title?.slice(0, 180) || null,
  };
}

async function getNsfwImage(attempts = 8) {
  // ~80% nekobot (fiable), ~20% reddit (bonus si dispo)
  const providers = [
    fromNekobot,
    fromNekobot,
    fromNekobot,
    fromNekobot,
    fromReddit,
  ];

  let lastError;
  for (let i = 0; i < attempts; i++) {
    const provider = pick(providers);
    try {
      const result = await provider();
      if (result?.url) return result;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error("Aucune image trouvée");
}

client.once("ready", () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
  client.user.setActivity("+nsfw", { type: 3 });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim().toLowerCase();
  if (content !== `${PREFIX}nsfw`) return;

  const key = message.author.id;
  const now = Date.now();
  const until = cooldowns.get(key) || 0;
  if (now < until) {
    const wait = Math.ceil((until - now) / 1000);
    return message.reply(`Attends encore ${wait}s avant de rerun +nsfw.`).catch(() => {});
  }
  cooldowns.set(key, now + COOLDOWN_MS);

  const loading = await message.channel.send("🔥 Je cherche une image de malade…").catch(() => null);

  try {
    const image = await getNsfwImage();

    const embed = new EmbedBuilder()
      .setColor(0xff2d55)
      .setTitle("🔞 NSFW")
      .setImage(image.url)
      .setFooter({
        text: `${image.source}${image.title ? ` · ${image.title}` : ""} · ${message.author.username}`,
      })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("nsfw error:", err);
    await message.channel
      .send("❌ Impossible de récupérer une image pour le moment, réessaie.")
      .catch(() => {});
  } finally {
    if (loading) loading.delete().catch(() => {});
  }
});

client.login(TOKEN);
