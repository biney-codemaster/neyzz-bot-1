require("dotenv").config();

var Discord = require("discord.js");
var fetch = require("node-fetch");

var TOKEN = process.env.DISCORD_TOKEN;
var PREFIX = "+";

if (!TOKEN) {
  console.error(
    "DISCORD_TOKEN manquant. Crée un fichier .env avec DISCORD_TOKEN=ton_token"
  );
  process.exit(1);
}

var client = new Discord.Client();

var NEKOBOT_POOL = [
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

var REDDIT_SUBS = [
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

var IMAGE_EXT = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;
var cooldowns = new Map();
var COOLDOWN_MS = 2500;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fetchJson(url) {
  return fetch(url, {
    headers: {
      "User-Agent": "neyzz-nsfw-bot/1.0 (Discord bot)",
      Accept: "application/json",
    },
  }).then(function (res) {
    if (!res.ok) {
      throw new Error("HTTP " + res.status + " for " + url);
    }
    return res.json();
  });
}

function fromNekobot() {
  var type = pick(NEKOBOT_POOL);
  return fetchJson(
    "https://nekobot.xyz/api/image?type=" + encodeURIComponent(type)
  ).then(function (data) {
    if (!data || !data.success || typeof data.message !== "string") {
      throw new Error("nekobot/" + type + " empty");
    }
    return { url: data.message, source: type };
  });
}

function fromReddit() {
  var sub = pick(REDDIT_SUBS);
  var sort = pick(["hot", "top"]);
  var url =
    "https://www.reddit.com/r/" + sub + "/" + sort + ".json?limit=80&t=week";

  return fetchJson(url).then(function (data) {
    var children =
      data && data.data && data.data.children ? data.data.children : [];
    var posts = children
      .map(function (c) {
        return c.data;
      })
      .filter(function (p) {
        if (!p || p.stickied || p.is_self || !p.url) return false;
        var previewUrl =
          p.preview &&
          p.preview.images &&
          p.preview.images[0] &&
          p.preview.images[0].source &&
          p.preview.images[0].source.url;
        return (
          IMAGE_EXT.test(p.url) ||
          p.url.indexOf("i.redd.it") !== -1 ||
          p.url.indexOf("i.imgur.com") !== -1 ||
          p.post_hint === "image" ||
          Boolean(previewUrl)
        );
      });

    if (!posts.length) {
      throw new Error("reddit r/" + sub + " empty");
    }

    var post = pick(posts);
    var imageUrl = post.url;
    var preview =
      post.preview &&
      post.preview.images &&
      post.preview.images[0] &&
      post.preview.images[0].source &&
      post.preview.images[0].source.url;

    if (!IMAGE_EXT.test(imageUrl) && preview) {
      imageUrl = preview.replace(/&amp;/g, "&");
    }

    if (
      imageUrl.indexOf("imgur.com") !== -1 &&
      !IMAGE_EXT.test(imageUrl) &&
      imageUrl.indexOf("i.imgur") === -1
    ) {
      var parts = imageUrl.split("/");
      imageUrl = "https://i.imgur.com/" + parts[parts.length - 1] + ".jpg";
    }

    return {
      url: imageUrl,
      source: "r/" + sub,
      title: post.title ? String(post.title).slice(0, 180) : null,
    };
  });
}

function getNsfwImage(attempts) {
  attempts = attempts || 8;
  var providers = [
    fromNekobot,
    fromNekobot,
    fromNekobot,
    fromNekobot,
    fromReddit,
  ];
  var lastError = null;
  var i = 0;

  function tryNext() {
    if (i >= attempts) {
      return Promise.reject(lastError || new Error("Aucune image trouvée"));
    }
    i += 1;
    var provider = pick(providers);
    return provider()
      .then(function (result) {
        if (result && result.url) return result;
        return tryNext();
      })
      .catch(function (err) {
        lastError = err;
        return tryNext();
      });
  }

  return tryNext();
}

client.once("ready", function () {
  console.log("Connecté en tant que " + client.user.tag);
  client.user.setActivity("+nsfw", { type: "WATCHING" });
});

client.on("message", function (message) {
  if (message.author.bot || !message.guild) return;

  var content = message.content.trim().toLowerCase();
  if (content !== PREFIX + "nsfw") return;

  var key = message.author.id;
  var now = Date.now();
  var until = cooldowns.get(key) || 0;
  if (now < until) {
    var wait = Math.ceil((until - now) / 1000);
    message
      .reply("Attends encore " + wait + "s avant de rerun +nsfw.")
      .catch(function () {});
    return;
  }
  cooldowns.set(key, now + COOLDOWN_MS);

  var loadingPromise = message.channel
    .send("🔥 Je cherche une image de malade…")
    .catch(function () {
      return null;
    });

  loadingPromise.then(function (loading) {
    return getNsfwImage()
      .then(function (image) {
        var footer =
          image.source +
          (image.title ? " · " + image.title : "") +
          " · " +
          message.author.username;

        var embed = new Discord.MessageEmbed()
          .setColor(0xff2d55)
          .setTitle("🔞 NSFW")
          .setImage(image.url)
          .setFooter(footer)
          .setTimestamp();

        return message.channel.send(embed);
      })
      .catch(function (err) {
        console.error("nsfw error:", err);
        return message.channel
          .send("❌ Impossible de récupérer une image pour le moment, réessaie.")
          .catch(function () {});
      })
      .then(function () {
        if (loading) {
          return loading.delete().catch(function () {});
        }
      });
  });
});

client.login(TOKEN);
