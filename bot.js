const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const cors = require('cors');
const fs = require('fs');

// ===== КОНФИГУРАЦИЯ (через переменные окружения) =====
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;     // Берётся из Railway
const CLIENT_ID = process.env.CLIENT_ID;             // Берётся из Railway
const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;     // Берётся из Railway
const API_PORT = process.env.PORT || 3000;

// Проверка что все переменные есть
if (!DISCORD_TOKEN || !CLIENT_ID || !ADMIN_ROLE_ID) {
    console.error('❌ Ошибка: Добавь переменные окружения в Railway!');
    console.error('Нужны: DISCORD_TOKEN, CLIENT_ID, ADMIN_ROLE_ID');
    process.exit(1);
}

// ===== БАЗА ДАННЫХ =====
const db = new sqlite3.Database('./keys.db');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS licenses (
        license_key TEXT PRIMARY KEY,
        expires_at INTEGER,
        status TEXT DEFAULT 'active',
        hwid TEXT,
        note TEXT
    )`);
    console.log('✅ База данных готова');
});

// Генерация ключа (XXXX-XXXX-XXXX-XXXX)
function generateKey() {
    return crypto.randomBytes(16).toString('hex').toUpperCase().match(/.{1,4}/g).join('-');
}

// ===== ВЕБ-СЕРВЕР (для выдачи Lua) =====
const app = express();
app.use(cors());
app.use(express.json());

// Проверка ключа и выдача скрипта
app.get('/get', (req, res) => {
    const key = req.query.key;
    const hwid = req.query.hwid;
    
    if (!key || !hwid) {
        return res.status(400).send('KEY_AND_HWID_REQUIRED');
    }
    
    db.get('SELECT * FROM licenses WHERE license_key = ?', [key], (err, license) => {
        if (err || !license) {
            return res.status(403).send('INVALID_KEY');
        }
        
        const now = Math.floor(Date.now() / 1000);
        if (license.expires_at && license.expires_at < now) {
            return res.status(403).send('KEY_EXPIRED');
        }
        
        // Привязка HWID при первом использовании
        if (!license.hwid) {
            db.run('UPDATE licenses SET hwid = ?, status = "used" WHERE license_key = ?', [hwid, key]);
        } else if (license.hwid !== hwid) {
            return res.status(403).send('HWID_MISMATCH');
        }
        
        // Твой защищённый Lua код
        const luaScript = `
-- Anyagang Live Script
print("Успешная загрузка!")
print("Привет от Anyagang!")

-- ТВОЙ ОСНОВНОЙ КОД ЗДЕСЬ
-- Например:
-- loadstring(game:HttpGet("https://example.com/actual_script.lua"))()

print("Скрипт загружен!")
`;
        
        res.send(luaScript);
    });
});

// Запуск веб-сервера
app.listen(API_PORT, () => {
    console.log(`✅ API сервер на порту ${API_PORT}`);
    console.log(`   URL: http://localhost:${API_PORT}/get?key=КЛЮЧ&hwid=ID`);
});

// ===== DICORD БОТ =====
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
    console.log(`✅ Discord бот ${client.user.tag} запущен!`);
    registerCommands();
});

// Регистрация команд
async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
    
    const commands = [
        new SlashCommandBuilder()
            .setName('gen')
            .setDescription('Создать ключ')
            .addStringOption(opt => opt.setName('time').setDescription('1h, 7d, 1m, 1y').setRequired(true))
            .addStringOption(opt => opt.setName('note').setDescription('Примечание').setRequired(false)),
        
        new SlashCommandBuilder()
            .setName('del')
            .setDescription('Удалить ключ')
            .addStringOption(opt => opt.setName('key').setDescription('Ключ').setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('list')
            .setDescription('Список ключей'),
        
        new SlashCommandBuilder()
            .setName('reset')
            .setDescription('Сбросить HWID ключа')
            .addStringOption(opt => opt.setName('key').setDescription('Ключ').setRequired(true))
    ];
    
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Команды зарегистрированы');
    } catch (error) {
        console.error(error);
    }
}

// Парсинг времени (1h, 7d, 1m, 1y)
function parseTime(time) {
    const match = time.match(/^(\d+)([hdmy])$/);
    if (!match) return null;
    const val = parseInt(match[1]);
    const unit = match[2];
    const now = Math.floor(Date.now() / 1000);
    if (unit === 'h') return now + val * 3600;
    if (unit === 'd') return now + val * 86400;
    if (unit === 'm') return now + val * 86400 * 30;
    if (unit === 'y') return now + val * 86400 * 365;
    return null;
}

// Обработка команд
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;
    
    // Проверка админа
    if (['gen', 'del', 'list', 'reset'].includes(interaction.commandName)) {
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({ content: '❌ Нет прав!', ephemeral: true });
        }
    }
    
    // Генерация ключа
    if (interaction.commandName === 'gen') {
        const time = interaction.options.getString('time');
        const note = interaction.options.getString('note') || '';
        
        const expires = parseTime(time);
        if (!expires) {
            return interaction.reply({ content: '❌ Формат: 1h, 7d, 1m, 1y', ephemeral: true });
        }
        
        const key = generateKey();
        db.run('INSERT INTO licenses (license_key, expires_at, note) VALUES (?, ?, ?)', [key, expires, note]);
        
        const date = new Date(expires * 1000).toLocaleString();
        interaction.reply({ content: `✅ **${key}**\n⏰ До ${date}\n📝 ${note}`, ephemeral: true });
    }
    
    // Удаление ключа
    else if (interaction.commandName === 'del') {
        const key = interaction.options.getString('key');
        db.run('DELETE FROM licenses WHERE license_key = ?', [key]);
        interaction.reply({ content: `✅ Ключ ${key} удалён`, ephemeral: true });
    }
    
    // Список ключей
    else if (interaction.commandName === 'list') {
        db.all('SELECT license_key, expires_at, status, hwid FROM licenses', (err, rows) => {
            if (!rows || rows.length === 0) {
                return interaction.reply({ content: '📭 Нет ключей', ephemeral: true });
            }
            let msg = '📋 **Ключи:**\n';
            rows.forEach(r => {
                const icon = r.status === 'active' ? '🟢' : r.hwid ? '🔵' : '🟡';
                msg += `${icon} \`${r.license_key}\` | ${r.hwid ? '🔒' : '🆓'}\n`;
            });
            interaction.reply({ content: msg, ephemeral: true });
        });
    }
    
    // Сброс HWID
    else if (interaction.commandName === 'reset') {
        const key = interaction.options.getString('key');
        db.run('UPDATE licenses SET hwid = NULL, status = "active" WHERE license_key = ?', [key]);
        interaction.reply({ content: `✅ HWID сброшен для ${key}`, ephemeral: true });
    }
});

client.login(DISCORD_TOKEN);