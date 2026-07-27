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

/**
 * Catégories hard — Reddit via arctic-shift (vraies photos).
 * Pondération volontairement agressive sur bites / seins / chattes / culs.
 */
var CATEGORIES = {
  bite: {
    label: "gros penis",
    reddit: [
      "MassiveCock",
      "MassiveCock",
      "MassiveCock",
      "penis",
      "penis",
      "cock",
      "cock",
      "ratemycock",
      "ratemycock",
    ],
    nekobot: [],
    nsfwApi: [],
  },
  seins: {
    label: "gros seins",
    reddit: [
      "hugeboobs",
      "hugeboobs",
      "hugeboobs",
      "boobs",
      "boobs",
      "bustypetite",
      "TittyDrop",
      "simps",
    ],
    nekobot: ["boobs", "boobs", "boobs", "hboobs", "4k"],
    nsfwApi: ["milf"],
  },
  chatte: {
    label: "chatte",
    reddit: [
      "godpussy",
      "godpussy",
      "pussy",
      "pussy",
      "labia",
      "labia",
      "spreadpussy",
      "spreadpussy",
      "rearpussy",
      "creampies",
    ],
    nekobot: ["pussy", "pussy", "pussy"],
    nsfwApi: ["vagina", "vagina"],
  },
  cul: {
    label: "gros cul",
    reddit: [
      "bigasses",
      "bigasses",
      "datass",
      "datass",
      "ass",
      "pawg",
      "thick",
    ],
    nekobot: ["ass", "ass", "ass", "hass", "gonewild"],
    nsfwApi: ["ass", "ass"],
  },
  anal: {
    label: "anal",
    reddit: ["anal", "anal", "rearpussy", "creampies"],
    nekobot: ["anal", "anal", "hanal"],
    nsfwApi: ["anal", "anal"],
  },
  gif: {
    label: "gif hard",
    reddit: ["anal", "TittyDrop", "GoneWild", "creampies", "nsfw"],
    nekobot: ["pgif", "pgif", "pgif", "pgif"],
    nsfwApi: ["gif", "gif", "blowjob"],
  },
};

var ALL_CATS = Object.keys(CATEGORIES);

var ALIASES = {
  bite: "bite",
  bites: "bite",
  zgeg: "bite",
  zgegs: "bite",
  zeg: "bite",
  penis: "bite",
  cock: "bite",
  dick: "bite",
  queue: "bite",
  seins: "seins",
  sein: "seins",
  boobs: "seins",
  boob: "seins",
  tits: "seins",
  tit: "seins",
  nichons: "seins",
  chatte: "chatte",
  chattes: "chatte",
  pussy: "chatte",
  vulve: "chatte",
  cul: "cul",
  culs: "cul",
  ass: "cul",
  fesse: "cul",
  fesses: "cul",
  anal: "anal",
  anus: "anal",
  gif: "gif",
  gifs: "gif",
  video: "gif",
};

var IMAGE_EXT = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;
var cooldowns = new Map();
var COOLDOWN_MS = 2000;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isImageUrl(url) {
  if (!url || typeof url !== "string") return false;
  return (
    IMAGE_EXT.test(url) ||
    url.indexOf("i.redd.it") !== -1 ||
    url.indexOf("i.imgur.com") !== -1 ||
    url.indexOf("cdn.nekobot") !== -1 ||
    url.indexOf("i0.nekobot") !== -1 ||
    url.indexOf("cdn.n-sfw.com") !== -1
  );
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

function fromArcticReddit(sub) {
  var url =
    "https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=" +
    encodeURIComponent(sub) +
    "&limit=80";

  return fetchJson(url).then(function (data) {
    var posts = (data && data.data ? data.data : []).filter(function (p) {
      return p && isImageUrl(p.url) && !p.stickied;
    });
    if (!posts.length) {
      throw new Error("arctic r/" + sub + " empty");
    }
    var post = pick(posts);
    return {
      url: post.url,
      source: "r/" + sub,
      title: post.title ? String(post.title).slice(0, 160) : null,
    };
  });
}

function fromNekobot(type) {
  return fetchJson(
    "https://nekobot.xyz/api/image?type=" + encodeURIComponent(type)
  ).then(function (data) {
    if (!data || !data.success || typeof data.message !== "string") {
      throw new Error("nekobot/" + type + " empty");
    }
    return { url: data.message, source: "nekobot/" + type, title: null };
  });
}

function fromNsfwApi(type) {
  return fetchJson("https://api.n-sfw.com/nsfw/" + encodeURIComponent(type)).then(
    function (data) {
      var url = (data && (data.url || data.url_cdn)) || null;
      if (!url) throw new Error("n-sfw/" + type + " empty");
      return { url: url, source: "n-sfw/" + type, title: null };
    }
  );
}

function buildProviders(catKey) {
  var cat = CATEGORIES[catKey];
  var providers = [];

  (cat.reddit || []).forEach(function (sub) {
    providers.push(function () {
      return fromArcticReddit(sub);
    });
  });
  (cat.nekobot || []).forEach(function (type) {
    providers.push(function () {
      return fromNekobot(type);
    });
  });
  (cat.nsfwApi || []).forEach(function (type) {
    providers.push(function () {
      return fromNsfwApi(type);
    });
  });

  return providers;
}

function getNsfwImage(catKey, attempts) {
  attempts = attempts || 10;
  var providers = buildProviders(catKey);
  if (!providers.length) {
    return Promise.reject(new Error("catégorie vide"));
  }

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
        if (result && result.url && isImageUrl(result.url)) return result;
        return tryNext();
      })
      .catch(function (err) {
        lastError = err;
        return tryNext();
      });
  }

  return tryNext();
}

function resolveCategory(arg) {
  if (!arg) {
    // Random hard: plus de poids bite / seins / chatte / cul
    return pick([
      "bite",
      "bite",
      "bite",
      "seins",
      "seins",
      "seins",
      "chatte",
      "chatte",
      "chatte",
      "cul",
      "cul",
      "anal",
      "gif",
    ]);
  }
  var key = ALIASES[arg];
  return key || null;
}

client.once("ready", function () {
  console.log("Connecté en tant que " + client.user.tag);
  client.user.setActivity("+nsfw | +nsfw zgeg/seins/chatte/cul", {
    type: "WATCHING",
  });
});

client.on("message", function (message) {
  if (message.author.bot || !message.guild) return;

  var raw = message.content.trim();
  var lower = raw.toLowerCase();
  if (lower.indexOf(PREFIX + "nsfw") !== 0) return;

  var rest = lower.slice((PREFIX + "nsfw").length).trim();
  var arg = rest.split(/\s+/)[0] || "";

  if (arg === "help" || arg === "aide") {
    message.channel
      .send(
        "**+nsfw** — random hard\n" +
          "**+nsfw bite** / **+nsfw zgeg** — gros penis\n" +
          "**+nsfw seins** — gros seins\n" +
          "**+nsfw chatte** — chattes\n" +
          "**+nsfw cul** — gros culs\n" +
          "**+nsfw anal** — anal\n" +
          "**+nsfw gif** — gifs hard"
      )
      .catch(function () {});
    return;
  }

  var catKey = resolveCategory(arg);
  if (arg && !catKey) {
    message
      .reply(
        "Catégorie inconnue. Essaie: `+nsfw bite` `+nsfw seins` `+nsfw chatte` `+nsfw cul` `+nsfw anal` `+nsfw gif`"
      )
      .catch(function () {});
    return;
  }

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

  var cat = CATEGORIES[catKey];
  var loadingPromise = message.channel
    .send("🔥 Je cherche une image de malade (" + cat.label + ")…")
    .catch(function () {
      return null;
    });

  loadingPromise.then(function (loading) {
    return getNsfwImage(catKey)
      .then(function (image) {
        var footer =
          image.source +
          (image.title ? " · " + image.title : "") +
          " · " +
          message.author.username;

        var embed = new Discord.MessageEmbed()
          .setColor(0xff2d55)
          .setTitle("🔞 " + cat.label.toUpperCase())
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
