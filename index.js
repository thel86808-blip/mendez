const {
Client,
GatewayIntentBits,
Collection,
ActivityType,
SlashCommandBuilder,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
PermissionFlagsBits
} = require("discord.js");

require('dotenv').config();

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.GuildMessages
]
});

client.commands = new Collection();

/* ======================
   AANGENOMEN
====================== */
client.commands.set("aangenomen", {
data: new SlashCommandBuilder()
.setName("aangenomen")
.setDescription("Geeft een gebruiker de gangrollen.")
.addUserOption(o =>
o.setName("gebruiker").setDescription("Gebruiker").setRequired(true)
)
.addStringOption(o =>
o.setName("reden").setDescription("Reden").setRequired(false)
),

async execute(interaction) {
const LOG_CHANNEL_ID = "1379190130694160414";
const STAFF_ROLE_NAMES = ["| Bloody Angels Lid", "| Proeftijd"];
const ALLOWED_ROLE_NAME = "| Sollicitatie Behandelaar";

const executor = interaction.member;
if (!executor.roles.cache.some(r => r.name === ALLOWED_ROLE_NAME)) {
return interaction.reply({ content: "❌ Geen permissie.", ephemeral: true });
}

await interaction.deferReply();

const targetUser = interaction.options.getUser("gebruiker");
const reason = interaction.options.getString("reden") || "Geen reden";
const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
if (!member) return interaction.editReply("Gebruiker niet gevonden.");

const roles = STAFF_ROLE_NAMES
.map(n => interaction.guild.roles.cache.find(r => r.name === n))
.filter(Boolean);

await member.roles.add(roles);

const embed = new EmbedBuilder()
.setTitle("✅ Aangenomen")
.setColor("Green")
.addFields(
{ name: "Gebruiker", value: `<@${member.id}>` },
{ name: "Door", value: `<@${executor.id}>` },
{ name: "Reden", value: reason }
);

await interaction.editReply({ embeds: [embed] });

const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
if (logChannel) logChannel.send({ embeds: [embed] });
}
});

/* ======================
   CLEAR
====================== */
client.commands.set("clear", {
data: new SlashCommandBuilder()
.setName("clear")
.setDescription("Verwijder berichten")
.addIntegerOption(o =>
o.setName("aantal").setDescription("1-100").setRequired(true)
),

async execute(interaction) {
const allowedRoles = ["1451251947087855752"];
if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
return interaction.reply({ content: "❌ Geen permissie", ephemeral: true });
}

const amount = interaction.options.getInteger("aantal");
if (amount < 1 || amount > 100) {
return interaction.reply({ content: "1-100 berichten", ephemeral: true });
}

await interaction.channel.bulkDelete(amount, true);
await interaction.reply({ content: `🧹 ${amount} berichten verwijderd`, ephemeral: true });
}
});

/* ======================
   EMBED
====================== */
client.commands.set("embed", {
data: new SlashCommandBuilder()
.setName("embed")
.setDescription("Maak een embed")
.addStringOption(o => o.setName("titel").setRequired(true))
.addStringOption(o => o.setName("tekst").setRequired(true)),

async execute(interaction) {
const embed = new EmbedBuilder()
.setTitle(interaction.options.getString("titel"))
.setDescription(interaction.options.getString("tekst"))
.setColor("Red");

await interaction.channel.send({ embeds: [embed] });
await interaction.reply({ content: "✅ Embed verzonden", ephemeral: true });
}
});

/* ======================
   GIVEAWAY (JOIN / LEAVE)
====================== */
client.commands.set("giveaway", {
data: new SlashCommandBuilder()
.setName("giveaway")
.setDescription("Start een giveaway")
.addStringOption(o => o.setName("prijs").setRequired(true))
.addIntegerOption(o => o.setName("tijd").setDescription("minuten").setRequired(true))
.addIntegerOption(o => o.setName("winnaars").setRequired(true))
.addChannelOption(o => o.setName("kanaal").setRequired(true)),

async execute(interaction) {
const allowedRoles = ["1451251294449958923"];
if (!interaction.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
return interaction.reply({ content: "❌ Geen permissie", ephemeral: true });
}

await interaction.deferReply({ ephemeral: true });

const prijs = interaction.options.getString("prijs");
const tijd = interaction.options.getInteger("tijd");
const winnaars = interaction.options.getInteger("winnaars");
const kanaal = interaction.options.getChannel("kanaal");

let deelnemers = [];

const embed = new EmbedBuilder()
.setTitle("🎉 Giveaway")
.setDescription(`Prijs: ${prijs}\nWinnaars: ${winnaars}\nDeelnemers: 0`)
.setColor("Purple");

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("gw_join").setLabel("Join").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("gw_leave").setLabel("Leave").setStyle(ButtonStyle.Danger)
);

const msg = await kanaal.send({ embeds: [embed], components: [row] });
await interaction.editReply("✅ Giveaway gestart");

const collector = msg.createMessageComponentCollector({ time: tijd * 60000 });

collector.on("collect", async btn => {
if (btn.customId === "gw_join" && !deelnemers.includes(btn.user.id)) {
deelnemers.push(btn.user.id);
}
if (btn.customId === "gw_leave") {
deelnemers = deelnemers.filter(id => id !== btn.user.id);
}

const updated = EmbedBuilder.from(embed)
.setDescription(`Prijs: ${prijs}\nWinnaars: ${winnaars}\nDeelnemers: ${deelnemers.length}`);

await msg.edit({ embeds: [updated] });
await btn.reply({ content: "✔️ Bijgewerkt", ephemeral: true });
});

collector.on("end", async () => {
if (!deelnemers.length) {
return msg.edit({ content: "❌ Geen deelnemers", components: [] });
}

const gekozen = deelnemers.sort(() => 0.5 - Math.random()).slice(0, winnaars);
const winEmbed = new EmbedBuilder()
.setTitle("🏆 Winnaars")
.setDescription(gekozen.map(id => `<@${id}>`).join("\n"))
.setColor("Gold");

await msg.edit({ embeds: [winEmbed], components: [] });
});
}
});

/* ======================
   ADDROLE
====================== */
client.commands.set("addrole", {
data: new SlashCommandBuilder()
.setName("addrole")
.setDescription("Geef een rol aan een gebruiker")
.addUserOption(o => o.setName("gebruiker").setRequired(true))
.addRoleOption(o => o.setName("rol").setRequired(true))
.addStringOption(o => o.setName("reden").setRequired(true)),

async execute(interaction) {
const REQUIRED_ROLE_ID = "1451251947087855752";
if (!interaction.member.roles.cache.has(REQUIRED_ROLE_ID)) {
return interaction.reply({ content: "❌ Geen permissie", ephemeral: true });
}

const member = interaction.options.getMember("gebruiker");
const role = interaction.options.getRole("rol");
const reason = interaction.options.getString("reden");

if (role.position >= interaction.guild.members.me.roles.highest.position) {
return interaction.reply({ content: "❌ Rol te hoog", ephemeral: true });
}

await member.roles.add(role, reason);

await interaction.reply({
embeds: [
new EmbedBuilder()
.setTitle("✨ Rol Toegekend")
.setColor("Green")
.addFields(
{ name: "Gebruiker", value: member.user.tag },
{ name: "Rol", value: role.name },
{ name: "Reden", value: reason }
)
]
});
}
});

/* ======================
   KICK
====================== */
client.commands.set("kick", {
data: new SlashCommandBuilder()
.setName("kick")
.setDescription("Kick een gebruiker")
.addUserOption(o => o.setName("gebruiker").setRequired(true))
.addStringOption(o => o.setName("reden").setRequired(false))
.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

async execute(interaction) {
const user = interaction.options.getUser("gebruiker");
const reason = interaction.options.getString("reden") || "Geen reden";

const member = await interaction.guild.members.fetch(user.id).catch(() => null);
if (!member || !member.kickable) {
return interaction.reply({ content: "❌ Kan niet kicken", ephemeral: true });
}

await member.kick(reason);
await interaction.reply({ content: `👢 ${user.tag} gekickt`, ephemeral: true });
}
});

/* ======================
   USERINFO
====================== */
client.commands.set("userinfo", {
data: new SlashCommandBuilder()
.setName("userinfo")
.setDescription("Bekijk user info")
.addUserOption(o => o.setName("gebruiker").setRequired(false)),

async execute(interaction) {
const user = interaction.options.getUser("gebruiker") || interaction.user;
const member = await interaction.guild.members.fetch(user.id).catch(() => null);

const embed = new EmbedBuilder()
.setTitle(user.tag)
.setThumbnail(user.displayAvatarURL())
.addFields(
{ name: "ID", value: user.id },
{ name: "Bot", value: user.bot ? "Ja" : "Nee" },
{ name: "Hoogste rol", value: member ? `${member.roles.highest}` : "Onbekend" }
)
.setColor("Blue");

await interaction.reply({ embeds: [embed] });
}
});

/* ======================
   STATUS
====================== */
let currentStatus = "open";

client.commands.set("status", {
data: new SlashCommandBuilder()
.setName("status")
.setDescription("Bekijk of stel status")
.addStringOption(o =>
o.setName("status")
.addChoices(
{ name: "Open", value: "open" },
{ name: "Few", value: "few" },
{ name: "Full", value: "full" }
)
),

async execute(interaction) {
const s = interaction.options.getString("status");
if (s) currentStatus = s;

await interaction.channel.send({
embeds: [
new EmbedBuilder()
.setTitle("Sollicitatie Status")
.setDescription(`Huidige status: ${currentStatus}`)
.setColor("Green")
]
});

await interaction.reply({ content: "✅ Status geplaatst", ephemeral: true });
}
});

/* ======================
   ROLAANVRAAG
====================== */
client.commands.set("rolaanvraag", {
data: new SlashCommandBuilder()
.setName("rolaanvraag")
.setDescription("Vraag een rol aan")
.addRoleOption(o =>
o.setName("rol").setDescription("Welke rol").setRequired(true)
)
.addStringOption(o =>
o.setName("motivatie").setDescription("Waarom?").setRequired(true)
),

async execute(interaction) {
const role = interaction.options.getRole("rol");
const motivatie = interaction.options.getString("motivatie");
const reviewChannelId = "1379190130694160414";

const embed = new EmbedBuilder()
.setTitle("📩 Nieuwe Rolaanvraag")
.setColor("Blue")
.addFields(
{ name: "Gebruiker", value: `<@${interaction.user.id}>` },
{ name: "Rol", value: role.name },
{ name: "Motivatie", value: motivatie }
);

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId(`accept_${interaction.user.id}_${role.id}`)
.setLabel("✅ Accepteren")
.setStyle(ButtonStyle.Success),
new ButtonBuilder()
.setCustomId(`deny_${interaction.user.id}_${role.id}`)
.setLabel("❌ Weigeren")
.setStyle(ButtonStyle.Danger)
);

const channel = interaction.guild.channels.cache.get(reviewChannelId);
await channel.send({ embeds: [embed], components: [row] });

await interaction.reply({ content: "✅ Rolaanvraag verzonden", ephemeral: true });
}
});

/* ======================
   WARN SYSTEM
====================== */
const warns = new Map();

client.commands.set("warn", {
data: new SlashCommandBuilder()
.setName("warn")
.setDescription("Geef een warn")
.addUserOption(o => o.setName("gebruiker").setRequired(true))
.addStringOption(o => o.setName("reden").setRequired(true)),

async execute(interaction) {
const staffRole = "1451251947087855752";
if (!interaction.member.roles.cache.has(staffRole)) {
return interaction.reply({ content: "❌ Geen permissie", ephemeral: true });
}

const user = interaction.options.getUser("gebruiker");
const reden = interaction.options.getString("reden");

const count = warns.get(user.id) || 0;
const newCount = count + 1;
warns.set(user.id, newCount);

const embed = new EmbedBuilder()
.setTitle("⚠️ Warn")
.setColor("Orange")
.addFields(
{ name: "Gebruiker", value: `<@${user.id}>` },
{ name: "Door", value: `<@${interaction.user.id}>` },
{ name: "Reden", value: reden },
{ name: "Totaal warns", value: `${newCount}/3` }
);

await interaction.channel.send({ embeds: [embed] });

if (newCount >= 3) {
const member = await interaction.guild.members.fetch(user.id).catch(() => null);
if (member) {
await member.kick("3 warns bereikt");
warns.delete(user.id);

interaction.channel.send(`🚨 <@${user.id}> is **ontslagen** (3 warns).`);
}
}

await interaction.reply({ content: "✅ Warn gegeven", ephemeral: true });
}
});

/* ======================
   BUTTON INTERACTIONS
====================== */
client.on("interactionCreate", async interaction => {
if (!interaction.isButton()) return;

const [action, userId, roleId] = interaction.customId.split("_");

if (action === "accept") {
const member = await interaction.guild.members.fetch(userId);
const role = interaction.guild.roles.cache.get(roleId);

await member.roles.add(role);
await interaction.update({
content: `✅ Rol toegekend aan <@${userId}>`,
components: [],
embeds: []
});
}

if (action === "deny") {
await interaction.update({
content: `❌ Rolaanvraag geweigerd`,
components: [],
embeds: []
});
}
});


/* ======================
   READY
====================== */
client.once("ready", () => {
console.log(`✅ Online als ${client.user.tag}`);
client.user.setActivity("Murat's Shop", { type: ActivityType.Watching });
});

/* ======================
   INTERACTION
====================== */
client.on("interactionCreate", async interaction => {
if (!interaction.isChatInputCommand()) return;
const command = client.commands.get(interaction.commandName);
if (!command) return;
try {
await command.execute(interaction);
} catch (e) {
console.error(e);
if (!interaction.replied) {
interaction.reply({ content: "❌ Error", ephemeral: true });
}
}
});

/* ======================
   LOGIN
====================== */
const token = process.env.TOKEN?.trim();
console.log("TOKEN lengte na trim:", token.length);
client.login(token);



