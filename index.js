require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const express = require('express'); // Importa o Express

// --- CONFIGURAÇÃO DO EXPRESS ---
const app = express();
const PORT = 10000;

// Rota raiz com nada escrito (vazia)
app.get('/', (req, res) => {
    res.send(''); 
});

app.listen(PORT, () => {
    console.log(`🌐 Server Express rodando na porta ${PORT}`);
});

// --- CONFIGURAÇÕES DO BOT ---
const TOKEN = process.env.TOKEN;
const API_URL = 'https://mbappeout.replit.app/api/votes';
const DATA_FILE = './votos.json';

const carregarOuCriarJSON = () => {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify({ vote: 0 }, null, 2));
    }
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Submit a vote for the Mbappe Out petition'),
    new SlashCommandBuilder()
        .setName('count')
        .setDescription('Check current petition statistics')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    carregarOuCriarJSON();
    try {
        console.log('⏳ Registering slash commands...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log(`✅ Bot online as ${client.user.tag}! Commands registered.`);
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'vote') {
        await interaction.deferReply();
        try {
            let db = JSON.parse(fs.readFileSync(DATA_FILE));
            let valorParaEnviar = db.vote;

            const response = await axios.post(API_URL, valorParaEnviar.toString(), {
                headers: {
                    'Content-Type': 'text/plain',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/146.0.0.0'
                }
            });

            db.vote = valorParaEnviar + 1;
            fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));

            const voteEmbed = new EmbedBuilder()
                .setColor(0xFF4500)
                .setTitle('🚀 Petition Vote Registered!')
                .setDescription(`You just sent vote number **${valorParaEnviar}**`)
                .addFields({ 
                    name: 'Total Petition Votes (Global)', 
                    value: `**${response.data.count.toLocaleString('en-US')}**` 
                })
                .setFooter({ text: 'Mbappe Out Petition System' })
                .setTimestamp();

            await interaction.editReply({ embeds: [voteEmbed] });
        } catch (error) {
            await interaction.editReply('❌ Failed to connect to the petition server.');
        }
    }

    if (commandName === 'count') {
        await interaction.deferReply();
        try {
            const db = JSON.parse(fs.readFileSync(DATA_FILE));
            const response = await axios.post(API_URL, "check", { 
                headers: { 'Content-Type': 'text/plain' } 
            });

            const countEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('📊 Petition Status')
                .addFields(
                    { name: 'Global Total Votes', value: `**${response.data.count.toLocaleString('en-US')}**`, inline: true },
                    { name: 'Votes by this Bot', value: `**${db.vote}**`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [countEmbed] });
        } catch (error) {
            await interaction.editReply('❌ Failed to fetch petition count.');
        }
    }
});

client.login(TOKEN);