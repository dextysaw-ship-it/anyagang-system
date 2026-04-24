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
do
    local steamname = panorama.open("CSGOHud").MyPersonaAPI.GetName()
    local euphemia = (euphemia_data and euphemia_data()) or {
        username = "PROSTAK1337",
        build = "LIVE"
    }

    local function lerp(a, b, t)
        return a + ((b - a) * t)
    end

    local screen_width, screen_height = client.screen_size()
    local vector = require("vector")
    local y = 0
    local alpha = 255
    client.set_event_callback("paint_ui", function()
        local screen = vector(client.screen_size())
        local size = vector(screen.x, screen.y)
        local sizing = lerp(0.1, 0.9, (math.sin(globals.realtime() * 0.9) * 0.5) + 0.5)
        local rotation = lerp(0, 360, globals.realtime() % 1)
        alpha = lerp(alpha, 0, globals.frametime() * 0.5)
        y = lerp(y, 20, globals.frametime() * 2)
        renderer.rectangle(0, 0, size.x, size.y, 13, 13, 13, alpha)
        renderer.circle_outline(screen.x / 2, screen.y / 2, 255, 255, 255, alpha, 20, rotation, sizing, 3)
        renderer.text(screen.x / 2, (screen.y / 2) + 40, 255, 255, 255, alpha, "c", 0, "Loading...")
        renderer.text(screen.x / 2, (screen.y / 2) + 60, 255, 255, 255, alpha, "c", 0, "Welcome - ANYAGANG [LIVE]")
    end)

    local vector = require("vector")
    local c_entity = require("gamesense/entity")
    local images = require("gamesense/images")
    local weapons = require("gamesense/csgo_weapons")
    local base64 = require("gamesense/base64")
    local clipboard = require("gamesense/clipboard")
    local steamworks = require("gamesense/steamworks")
    local color_r, color_g, color_b, color_a = 255, 255, 0, 255
    local client_set_event_callback, client_unset_event_callback = client.set_event_callback, client.unset_event_callback
    local entity_get_local_player, entity_get_player_weapon, entity_get_prop = entity.get_local_player, entity.get_player_weapon, entity.get_prop
    local ui_get, ui_set, ui_set_callback, ui_set_visible, ui_reference, ui_new_checkbox, ui_new_slider = ui.get, ui.set, ui.set_callback, ui.set_visible, ui.reference, ui.new_checkbox, ui.new_slider
    X, Y = client.screen_size()
    local notify_data = {}
    local ref = {
        aa_enable = ui.reference("AA", "anti-aimbot angles", "enabled"),
        pitch = ui.reference("AA", "anti-aimbot angles", "pitch"),
        pitch_value = select(2, ui.reference("AA", "anti-aimbot angles", "pitch")),
        yaw_base = ui.reference("AA", "anti-aimbot angles", "yaw base"),
        yaw = ui.reference("AA", "anti-aimbot angles", "yaw"),
        yaw_value = select(2, ui.reference("AA", "anti-aimbot angles", "yaw")),
        yaw_jitter = ui.reference("AA", "Anti-aimbot angles", "Yaw Jitter"),
        yaw_jitter_value = select(2, ui.reference("AA", "Anti-aimbot angles", "Yaw Jitter")),
        body_yaw = ui.reference("AA", "Anti-aimbot angles", "Body yaw"),
        body_yaw_value = select(2, ui.reference("AA", "Anti-aimbot angles", "Body yaw")),
        freestand_body_yaw = ui.reference("AA", "Anti-aimbot angles", "freestanding body yaw"),
        edgeyaw = ui.reference("AA", "anti-aimbot angles", "edge yaw"),
        freestand = {ui.reference("AA", "anti-aimbot angles", "freestanding")},
        roll = ui.reference("AA", "anti-aimbot angles", "roll"),
        slide = {ui.reference("AA", "other", "slow motion")},
        fakeduck = ui.reference("rage", "other", "duck peek assist"),
        quick_peek = {ui.reference("rage", "other", "quick peek assist")},
        doubletap = {ui.reference("rage", "aimbot", "double tap")},
        aimbot_enabled = ui.reference("RAGE", "Aimbot", "Enabled")
    }

    local reference = {
        double_tap = {ui.reference("RAGE", "Aimbot", "Double tap")},
        duck_peek_assist = ui.reference("RAGE", "Other", "Duck peek assist"),
        pitch = {ui.reference("AA", "Anti-aimbot angles", "Pitch")},
        yaw_base = ui.reference("AA", "Anti-aimbot angles", "Yaw base"),
        yaw = {ui.reference("AA", "Anti-aimbot angles", "Yaw")},
        yaw_jitter = {ui.reference("AA", "Anti-aimbot angles", "Yaw jitter")},
        body_yaw = {ui.reference("AA", "Anti-aimbot angles", "Body yaw")},
        freestanding_body_yaw = ui.reference("AA", "anti-aimbot angles", "Freestanding body yaw"),
        edge_yaw = ui.reference("AA", "Anti-aimbot angles", "Edge yaw"),
        freestanding = {ui.reference("AA", "Anti-aimbot angles", "Freestanding")},
        roll = ui.reference("AA", "Anti-aimbot angles", "Roll"),
        on_shot_anti_aim = {ui.reference("AA", "Other", "On shot anti-aim")},
        slow_motion = {ui.reference("AA", "Other", "Slow motion")},
        aa_enable = ui.reference("AA", "anti-aimbot angles", "enabled")
    }

    local prev_simulation_time = 0
    local function time_to_ticks(t)
        return math.floor(0.5 + (t / globals.tickinterval()))
    end

    local diff_sim = 0
    local recharge_timer = 0
    function sim_diff()
        local current_simulation_time = time_to_ticks(entity.get_prop(entity.get_local_player(), "m_flSimulationTime"))
        local diff = current_simulation_time - prev_simulation_time
        prev_simulation_time = current_simulation_time
        diff_sim = diff
        return diff_sim
    end

    function rgba_to_hex(b, c, d, e)
        return string.format("%02x%02x%02x%02x", b, c, d, e)
    end

    function text_fade_animation(speed, r, g, b, a, text)
        local final_text = ""
        local curtime = globals.curtime()
        for i = 0, #text do
            local color = rgba_to_hex(r, g, b, a * math.abs(1 * math.cos(((2 * speed * curtime) / 4) + ((i * 5) / 30))))
            final_text = final_text .. "\a" .. color .. text:sub(i, i)
        end
        return final_text
    end

    function text_fade_animation_guwno(speed, r, g, b, a, text)
        local final_text = ""
        local curtime = globals.curtime()
        for i = 0, #text do
            local color = rgba_to_hex(r, g, b, a * math.abs(1 * math.cos(((2 * speed * curtime) / 4) - ((i * 5) / 30))))
            final_text = final_text .. "\a" .. color .. text:sub(i, i)
        end
        return final_text
    end

    function gradient_text(text, speed, r, g, b, a)
        local final_text = ""
        local curtime = globals.curtime()
        local center = math.floor(#text / 2) + 1
        for i = 1, #text do
            local distance = math.abs(i - center)
            a = 255 - math.abs(255 * math.sin(((speed * curtime) / 4) - ((distance * 4) / 20)))
            local col = rgba_to_hex(r, g, b, a)
            final_text = final_text .. "\a" .. col .. text:sub(i, i)
        end
        return final_text
    end

    local globals_frametime = globals.frametime
    local globals_tickinterval = globals.tickinterval
    local entity_is_enemy = entity.is_enemy
    local entity_is_dormant = entity.is_dormant
    local entity_is_alive = entity.is_alive
    local entity_get_origin = entity.get_origin
    local entity_get_player_resource = entity.get_player_resource
    local table_insert = table.insert
    local math_floor = math.floor
    local last_press = 0
    local direction = 0
    local anti_aim_on_use_direction = 0
    local cheked_ticks = 0
    local E_POSE_PARAMETERS = {
        STRAFE_YAW = 0,
        STAND = 1,
        LEAN_YAW = 2,
        SPEED = 3,
        LADDER_YAW = 4,
        LADDER_SPEED = 5,
        JUMP_FALL = 6,
        MOVE_YAW = 7,
        MOVE_BLEND_CROUCH = 8,
        MOVE_BLEND_WALK = 9,
        MOVE_BLEND_RUN = 10,
        BODY_YAW = 11,
        BODY_PITCH = 12,
        AIM_BLEND_STAND_IDLE = 13,
        AIM_BLEND_STAND_WALK = 14,
        AIM_BLEND_STAND_RUN = 14,
        AIM_BLEND_CROUCH_IDLE = 16,
        AIM_BLEND_CROUCH_WALK = 17,
        DEATH_YAW = 18
    }

    local function contains(source, target)
        for id, name in pairs(ui.get(source)) do
            if name == target then return true end
        end
        return false
    end

    local function get_backtrack_value(e)
        if e.backtrack ~= nil then
            return math.max(math.floor(e.backtrack + 0.5), 0)
        end
        if e.tick ~= nil then
            return math.max(globals.tickcount() - e.tick, 0)
        end
        return 0
    end

    local function format_shot_context(pre_data)
        if pre_data == nil then
            return "hc: 0 | bt: 0"
        end
        return string.format("hc: %d | bt: %d", pre_data.hit_chance or 0, pre_data.backtrack or 0)
    end

    local hit_data_store = {}

    function render_rect_outline(x, y, w, h, r, g, b, a)
        renderer.line(x, y, x + w, y, r, g, b, a)
        renderer.line(x, y, x, y + h, r, g, b, a)
        renderer.line(x, y + h, x + w, y + h, r, g, b, a)
        renderer.line(x + w, y, x + w, y + h, r, g, b, a)
    end

    local function intersect(x, y, width, height)
        local cx, cy = ui.mouse_position()
        return (cx >= x) and (cx <= (x + width)) and (cy >= y) and (cy <= (y + height))
    end

    local function is_defensive(index)
        cheked_ticks = math.max(entity.get_prop(index, "m_nTickBase"), cheked_ticks or 0)
        return (math.abs(entity.get_prop(index, "m_nTickBase") - cheked_ticks) > 2) and (math.abs(entity.get_prop(index, "m_nTickBase") - cheked_ticks) < 14)
    end

    local settings = {}
    local anti_aim_settings = {}
    local anti_aim_states = {"Global", "Standing", "Moving", "Slow motion", "Crouching", "Crouching & moving", "In air", "In air & crouching", "No exploits", "On use"}
    local anti_aim_different = {"", " ", "  ", "   ", "    ", "     ", "      ", "       ", "        ", "         "}
    text1 = ui.new_label("AA", "Anti-aimbot angles", ".")
    text2 = ui.new_label("AA", "Anti-aimbot angles", ".")
    text3 = ui.new_label("AA", "Anti-aimbot angles", " ")
    current_tab = ui.new_combobox("AA", "Anti-aimbot angles", "\n ", {"Anti-Aim", "Visuals", "Misc", "Config"})
    current_color = ui.new_color_picker("AA", "Anti-aimbot angles", "colormenu", 255, 255, 255)
    current_state_menu = ui.new_combobox("AA", "Anti-aimbot angles", "\n ", "builder", "keybinds", "other")
    settings.anti_aim_state = ui.new_combobox("AA", "Anti-aimbot angles", "condition", anti_aim_states)
    local pusto2 = ui.new_label("AA", "Anti-aimbot angles", "\n")
    local visual_ = ui.new_label("AA", "Anti-aimbot angles", "› Visuals")
    local polosa = ui.new_label("AA", "Anti-aimbot angles", "\aFFFFFF6F━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    local master_switch = ui.new_checkbox("AA", "Anti-aimbot angles", "› Hitlogs")
    local damage_ind = ui.new_checkbox("AA", "Anti-aimbot angles", "› 3D hitmarker")
    local aspectratio = ui.new_checkbox("AA", "Anti-aimbot angles", "› Aspect ratio")
    local aspect_ratio_slider = nil
    local function apply_aspect_ratio()
        if not ui.get(aspectratio) then
            client.set_cvar("r_aspectratio", 0)
            return
        end

        if aspect_ratio_slider then
            local percent = ui.get(aspect_ratio_slider) / 100
            local multiplier = 2 - percent
            local w, h = client.screen_size()
            local value = (w * multiplier) / h
            if multiplier == 1 then value = 0 end
            client.set_cvar("r_aspectratio", value)
        end
    end

    aspect_ratio_slider = ui.new_slider("AA", "Anti-aimbot angles", "   › Ratio value", 0, 200, 100, true, "%")
    ui.set_callback(aspectratio, apply_aspect_ratio)
    ui.set_callback(aspect_ratio_slider, apply_aspect_ratio)
    local last_w, last_h = client.screen_size()
    client.set_event_callback("paint", function()
        local w, h = client.screen_size()
        if (w ~= last_w) or (h ~= last_h) then
            last_w, last_h = w, h
            apply_aspect_ratio()
        end
    end)

    local thirdperson = ui.new_checkbox("AA", "Anti-aimbot angles", "› Third person")
    local thirdperson_distance = ui.new_slider("AA", "Anti-aimbot angles", "   › Thirdperson distance", 30, 200, 150, true, "")
    local function apply_thirdperson()
        if ui.get(thirdperson) then
            client.exec("cam_idealdist " .. ui.get(thirdperson_distance))
        else
            client.exec("cam_idealdist 0")
            client.exec("thirdperson")
        end
    end

    ui.set_callback(thirdperson, apply_thirdperson)
    ui.set_callback(thirdperson_distance, apply_thirdperson)
    local defensive1 = ui.new_checkbox("AA", "Anti-aimbot angles", "Force Defensive")
    local mindamageind = ui.new_checkbox("AA", "Anti-aimbot angles", "› Damage Indicator")
    local inds = ui.new_checkbox("AA", "Anti-aimbot angles", "› Crosshair Indicators")
    local viewmodel = ui.new_checkbox("AA", "Anti-aimbot angles", "› Viewmodel")
    local viewmodel_fov = ui.new_slider("AA", "Anti-aimbot angles", "   › Viewmodel FOV", -180, 180, 68, true, "")
    local viewmodel_offset_x = ui.new_slider("AA", "Anti-aimbot angles", "   › Offset X", -180, 180, 25, true, "")
    local viewmodel_offset_y = ui.new_slider("AA", "Anti-aimbot angles", "   › Offset Y", -180, 180, 0, true, "")
    local viewmodel_offset_z = ui.new_slider("AA", "Anti-aimbot angles", "   › Offset Z", -180, 180, -15, true, "")
    local function apply_viewmodel()
        if ui.get(viewmodel) then
            cvar.viewmodel_fov:set_raw_float(ui.get(viewmodel_fov) * 0.1)
            cvar.viewmodel_offset_x:set_raw_float(ui.get(viewmodel_offset_x) * 0.1)
            cvar.viewmodel_offset_y:set_raw_float(ui.get(viewmodel_offset_y) * 0.1)
            cvar.viewmodel_offset_z:set_raw_float(ui.get(viewmodel_offset_z) * 0.1)
        else
            cvar.viewmodel_fov:set_raw_float(68 * 0.1)
            cvar.viewmodel_offset_x:set_raw_float(25 * 0.1)
            cvar.viewmodel_offset_y:set_raw_float(0 * 0.1)
            cvar.viewmodel_offset_z:set_raw_float(-15 * 0.1)
        end
    end

    ui.set_callback(viewmodel, apply_viewmodel)
    ui.set_callback(viewmodel_fov, apply_viewmodel)
    ui.set_callback(viewmodel_offset_x, apply_viewmodel)
    ui.set_callback(viewmodel_offset_y, apply_viewmodel)
    ui.set_callback(viewmodel_offset_z, apply_viewmodel)
    client.set_event_callback("shutdown", function()
        cvar.viewmodel_fov:set_raw_float(68 * 0.1)
        cvar.viewmodel_offset_x:set_raw_float(25 * 0.1)
        cvar.viewmodel_offset_y:set_raw_float(0 * 0.1)
        cvar.viewmodel_offset_z:set_raw_float(-15 * 0.1)
    end)

    local indcolors = ui.new_color_picker("AA", "Anti-aimbot angles", "Snap lines color", 255, 255, 255, 255)
    local nile2 = ui.new_label("AA", "Anti-aimbot angles", "\n")
    local other_ = ui.new_label("AA", "Anti-aimbot angles", "› Other")
    local nile2 = ui.new_label("AA", "Anti-aimbot angles", "\aFFFFFF6F━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    local clanTag = ui.new_checkbox("AA", "Anti-aimbot angles", "› Clantag")
    local trashTalk = ui.new_checkbox("AA", "Anti-aimbot angles", "› Trashtalk")
    local trashTalk_vibor = ui.new_multiselect("AA", "Anti-aimbot angles", "Trashtalk", "Kill", "Death")
    local watermarkEnable = ui.new_checkbox("AA", "Anti-aimbot angles", "› Watermark")
    local watermark_mode = ui.new_combobox("AA", "Anti-aimbot angles", "Watermark", {"Default", "Phobic", "Cringe"})
    local femboypng = ui.new_checkbox("AA", "Anti-aimbot angles", "› Femboy mode")
    local misc_ = ui.new_label("AA", "Anti-aimbot angles", "› Misc")
    local line3 = ui.new_label("AA", "Anti-aimbot angles", "\aFFFFFF6F━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    local jittero = ui.new_checkbox("AA", "Anti-aimbot angles", "› Jitter Fix")
    local fastladder = ui.new_checkbox("AA", "Anti-aimbot angles", "› Fast Ladder")
    local force_safe_point = ui.reference("RAGE", "Aimbot", "Force safe point")
    local recharge = ui.new_checkbox("AA", "Anti-aimbot angles", "› Recharge")
    local animationsEnabled = ui.new_checkbox("AA", "Anti-aimbot angles", "› \aafaf62ffAnim Breakers")
    local animations = ui.new_multiselect("AA", "Anti-aimbot angles", "selection:", "Kinguru", "Static legs", "Leg fucker", "Moonwalk")
    local console_filter = ui.new_checkbox("AA", "Anti-aimbot angles", "› Console Filter")
    local unsafecharhge = ui.new_hotkey("AA", "Anti-aimbot angles", "› Auto Teleport \a4f4f4fff[Break LC]")
    for i = 1, #anti_aim_states do
        anti_aim_settings[i] = {
            override_state = ui.new_checkbox("AA", "Anti-aimbot angles", "enable " .. string.lower(anti_aim_states[i])),
            pitch1 = ui.new_combobox("AA", "Anti-aimbot angles", "pitch" .. anti_aim_different[i], "Off", "Default", "Up", "Down", "Minimal", "Random", "Custom"),
            pitch2 = ui.new_slider("AA", "Anti-aimbot angles", "\npitch" .. anti_aim_different[i], -89, 89, 0, true, "°"),
            yaw_base = ui.new_combobox("AA", "Anti-aimbot angles", "yaw base" .. anti_aim_different[i], "Local view", "At targets"),
            yaw1 = ui.new_combobox("AA", "Anti-aimbot angles", "yaw" .. anti_aim_different[i], "Off", "180", "Spin", "Static", "180 Z", "Crosshair"),
            yaw2_left = ui.new_slider("AA", "Anti-aimbot angles", "yaw left" .. anti_aim_different[i], -180, 180, 0, true, "°"),
            yaw2_right = ui.new_slider("AA", "Anti-aimbot angles", "yaw right" .. anti_aim_different[i], -180, 180, 0, true, "°"),
            yaw2_randomize = ui.new_slider("AA", "Anti-aimbot angles", "yaw randomize" .. anti_aim_different[i], 0, 180, 0, true, "°"),
            yaw_jitter1 = ui.new_combobox("AA", "Anti-aimbot angles", "yaw jitter" .. anti_aim_different[i], "Off", "Offset", "Center", "Random", "Skitter", "Delay"),
            yaw_jitter2_left = ui.new_slider("AA", "Anti-aimbot angles", "yaw jitter left" .. anti_aim_different[i], -180, 180, 0, true, "°"),
            yaw_jitter2_right = ui.new_slider("AA", "Anti-aimbot angles", "yaw jitter right" .. anti_aim_different[i], -180, 180, 0, true, "°"),
            yaw_jitter2_randomize = ui.new_slider("AA", "Anti-aimbot angles", "yaw jitter randomize" .. anti_aim_different[i], 0, 180, 0, true, "°"),
            yaw_jitter2_delay = ui.new_slider("AA", "Anti-aimbot angles", "yaw jitter delay" .. anti_aim_different[i], 2, 10, 2, true, "t"),
            body_yaw1 = ui.new_combobox("AA", "Anti-aimbot angles", "body yaw" .. anti_aim_different[i], "Off", "Opposite", "Jitter", "Static"),
            body_yaw2 = ui.new_slider("AA", "Anti-aimbot angles", "body Yaw" .. anti_aim_different[i], -180, 180, 0, true, "°"),
            freestanding_body_yaw = ui.new_checkbox("AA", "Anti-aimbot angles", "freestanding body yaw" .. anti_aim_different[i]),
            defensive_anti_aimbot = ui.new_checkbox("AA", "Fake lag", "Defensive Builder" .. anti_aim_different[i]),
            defensive_pitch1 = ui.new_combobox("AA", "Fake lag", "pitch" .. anti_aim_different[i], "Off", "Default", "Up", "Down", "Minimal", "Random", "Custom"),
            defensive_pitch2 = ui.new_slider("AA", "Fake lag", "\n " .. anti_aim_different[i], -89, 89, 0, true, "°"),
            defensive_pitch3 = ui.new_slider("AA", "Fake lag", "\n " .. anti_aim_different[i], -89, 89, 0, true, "°"),
            defensive_yaw1 = ui.new_combobox("AA", "Fake lag", "yaw" .. anti_aim_different[i], "180", "Spin", "180 Z", "Sideways", "Random"),
            defensive_yaw2 = ui.new_slider("AA", "Fake lag", "\n " .. anti_aim_different[i], -180, 180, 0, true, "°")
        }
    end

    settings.warmup_disabler = ui.new_checkbox("AA", "Anti-aimbot angles", "Warmup disabler")
    settings.avoid_backstab = ui.new_checkbox("AA", "Anti-aimbot angles", "Avoid backstab")
    settings.safe_head_in_air = ui.new_checkbox("AA", "Anti-aimbot angles", "Safe head in air")
    settings.manual_left = ui.new_hotkey("AA", "Anti-aimbot angles", "Manual left")
    settings.manual_right = ui.new_hotkey("AA", "Anti-aimbot angles", "Manual right")
    settings.manual_forward = ui.new_hotkey("AA", "Anti-aimbot angles", "Manual forward")
    settings.freestanding = ui.new_hotkey("AA", "Anti-aimbot angles", "Freestanding")
    settings.freestanding_conditions = ui.new_multiselect("AA", "Anti-aimbot angles", "Conditions for freestanding", "Standing", "Moving", "Slow motion", "Crouching", "In air")
    settings.tweaks = ui.new_multiselect("AA", "Anti-aimbot angles", "\nTweaks", "Static Freestandings", "Static Manuals")
    local data = {
        integers = {settings.anti_aim_state, anti_aim_settings[1].override_state, anti_aim_settings[2].override_state, anti_aim_settings[3].override_state, anti_aim_settings[4].override_state, anti_aim_settings[5].override_state, anti_aim_settings[6].override_state, anti_aim_settings[7].override_state, anti_aim_settings[8].override_state, anti_aim_settings[9].override_state, anti_aim_settings[10].override_state, anti_aim_settings[1].pitch1, anti_aim_settings[2].pitch1, anti_aim_settings[3].pitch1, anti_aim_settings[4].pitch1, anti_aim_settings[5].pitch1, anti_aim_settings[6].pitch1, anti_aim_settings[7].pitch1, anti_aim_settings[8].pitch1, anti_aim_settings[9].pitch1, anti_aim_settings[10].pitch1, anti_aim_settings[1].pitch2, anti_aim_settings[2].pitch2, anti_aim_settings[3].pitch2, anti_aim_settings[4].pitch2, anti_aim_settings[5].pitch2, anti_aim_settings[6].pitch2, anti_aim_settings[7].pitch2, anti_aim_settings[8].pitch2, anti_aim_settings[9].pitch2, anti_aim_settings[10].pitch2, anti_aim_settings[1].yaw_base, anti_aim_settings[2].yaw_base, anti_aim_settings[3].yaw_base, anti_aim_settings[4].yaw_base, anti_aim_settings[5].yaw_base, anti_aim_settings[6].yaw_base, anti_aim_settings[7].yaw_base, anti_aim_settings[8].yaw_base, anti_aim_settings[9].yaw_base, anti_aim_settings[10].yaw_base, anti_aim_settings[1].yaw1, anti_aim_settings[2].yaw1, anti_aim_settings[3].yaw1, anti_aim_settings[4].yaw1, anti_aim_settings[5].yaw1, anti_aim_settings[6].yaw1, anti_aim_settings[7].yaw1, anti_aim_settings[8].yaw1, anti_aim_settings[9].yaw1, anti_aim_settings[10].yaw1, anti_aim_settings[1].yaw2_left, anti_aim_settings[2].yaw2_left, anti_aim_settings[3].yaw2_left, anti_aim_settings[4].yaw2_left, anti_aim_settings[5].yaw2_left, anti_aim_settings[6].yaw2_left, anti_aim_settings[7].yaw2_left, anti_aim_settings[8].yaw2_left, anti_aim_settings[9].yaw2_left, anti_aim_settings[10].yaw2_left, anti_aim_settings[1].yaw2_right, anti_aim_settings[2].yaw2_right, anti_aim_settings[3].yaw2_right, anti_aim_settings[4].yaw2_right, anti_aim_settings[5].yaw2_right, anti_aim_settings[6].yaw2_right, anti_aim_settings[7].yaw2_right, anti_aim_settings[8].yaw2_right, anti_aim_settings[9].yaw2_right, anti_aim_settings[10].yaw2_right, anti_aim_settings[1].yaw2_randomize, anti_aim_settings[2].yaw2_randomize, anti_aim_settings[3].yaw2_randomize, anti_aim_settings[4].yaw2_randomize, anti_aim_settings[5].yaw2_randomize, anti_aim_settings[6].yaw2_randomize, anti_aim_settings[7].yaw2_randomize, anti_aim_settings[8].yaw2_randomize, anti_aim_settings[9].yaw2_randomize, anti_aim_settings[10].yaw2_randomize, anti_aim_settings[1].yaw_jitter1, anti_aim_settings[2].yaw_jitter1, anti_aim_settings[3].yaw_jitter1, anti_aim_settings[4].yaw_jitter1, anti_aim_settings[5].yaw_jitter1, anti_aim_settings[6].yaw_jitter1, anti_aim_settings[7].yaw_jitter1, anti_aim_settings[8].yaw_jitter1, anti_aim_settings[9].yaw_jitter1, anti_aim_settings[10].yaw_jitter1, anti_aim_settings[1].yaw_jitter2_left, anti_aim_settings[2].yaw_jitter2_left, anti_aim_settings[3].yaw_jitter2_left, anti_aim_settings[4].yaw_jitter2_left, anti_aim_settings[5].yaw_jitter2_left, anti_aim_settings[6].yaw_jitter2_left, anti_aim_settings[7].yaw_jitter2_left, anti_aim_settings[8].yaw_jitter2_left, anti_aim_settings[9].yaw_jitter2_left, anti_aim_settings[10].yaw_jitter2_left, anti_aim_settings[1].yaw_jitter2_right, anti_aim_settings[2].yaw_jitter2_right, anti_aim_settings[3].yaw_jitter2_right, anti_aim_settings[4].yaw_jitter2_right, anti_aim_settings[5].yaw_jitter2_right, anti_aim_settings[6].yaw_jitter2_right, anti_aim_settings[7].yaw_jitter2_right, anti_aim_settings[8].yaw_jitter2_right, anti_aim_settings[9].yaw_jitter2_right, anti_aim_settings[10].yaw_jitter2_right, anti_aim_settings[1].yaw_jitter2_randomize, anti_aim_settings[2].yaw_jitter2_randomize, anti_aim_settings[3].yaw_jitter2_randomize, anti_aim_settings[4].yaw_jitter2_randomize, anti_aim_settings[5].yaw_jitter2_randomize, anti_aim_settings[6].yaw_jitter2_randomize, anti_aim_settings[7].yaw_jitter2_randomize, anti_aim_settings[8].yaw_jitter2_randomize, anti_aim_settings[9].yaw_jitter2_randomize, anti_aim_settings[10].yaw_jitter2_randomize, anti_aim_settings[1].yaw_jitter2_delay, anti_aim_settings[2].yaw_jitter2_delay, anti_aim_settings[3].yaw_jitter2_delay, anti_aim_settings[4].yaw_jitter2_delay, anti_aim_settings[5].yaw_jitter2_delay, anti_aim_settings[6].yaw_jitter2_delay, anti_aim_settings[7].yaw_jitter2_delay, anti_aim_settings[8].yaw_jitter2_delay, anti_aim_settings[9].yaw_jitter2_delay, anti_aim_settings[10].yaw_jitter2_delay, anti_aim_settings[1].body_yaw1, anti_aim_settings[2].body_yaw1, anti_aim_settings[3].body_yaw1, anti_aim_settings[4].body_yaw1, anti_aim_settings[5].body_yaw1, anti_aim_settings[6].body_yaw1, anti_aim_settings[7].body_yaw1, anti_aim_settings[8].body_yaw1, anti_aim_settings[9].body_yaw1, anti_aim_settings[10].body_yaw1, anti_aim_settings[1].body_yaw2, anti_aim_settings[2].body_yaw2, anti_aim_settings[3].body_yaw2, anti_aim_settings[4].body_yaw2, anti_aim_settings[5].body_yaw2, anti_aim_settings[6].body_yaw2, anti_aim_settings[7].body_yaw2, anti_aim_settings[8].body_yaw2, anti_aim_settings[9].body_yaw2, anti_aim_settings[10].body_yaw2, anti_aim_settings[1].freestanding_body_yaw, anti_aim_settings[2].freestanding_body_yaw, anti_aim_settings[3].freestanding_body_yaw, anti_aim_settings[4].freestanding_body_yaw, anti_aim_settings[5].freestanding_body_yaw, anti_aim_settings[6].freestanding_body_yaw, anti_aim_settings[7].freestanding_body_yaw, anti_aim_settings[8].freestanding_body_yaw, anti_aim_settings[9].freestanding_body_yaw, anti_aim_settings[10].freestanding_body_yaw, anti_aim_settings[1].defensive_anti_aimbot, anti_aim_settings[2].defensive_anti_aimbot, anti_aim_settings[3].defensive_anti_aimbot, anti_aim_settings[4].defensive_anti_aimbot, anti_aim_settings[5].defensive_anti_aimbot, anti_aim_settings[6].defensive_anti_aimbot, anti_aim_settings[7].defensive_anti_aimbot, anti_aim_settings[8].defensive_anti_aimbot, anti_aim_settings[9].defensive_anti_aimbot, anti_aim_settings[10].defensive_anti_aimbot, anti_aim_settings[1].defensive_pitch1, anti_aim_settings[2].defensive_pitch1, anti_aim_settings[3].defensive_pitch1, anti_aim_settings[4].defensive_pitch1, anti_aim_settings[5].defensive_pitch1, anti_aim_settings[6].defensive_pitch1, anti_aim_settings[7].defensive_pitch1, anti_aim_settings[8].defensive_pitch1, anti_aim_settings[9].defensive_pitch1, anti_aim_settings[10].defensive_pitch1, anti_aim_settings[1].defensive_pitch2, anti_aim_settings[2].defensive_pitch2, anti_aim_settings[3].defensive_pitch2, anti_aim_settings[4].defensive_pitch2, anti_aim_settings[5].defensive_pitch2, anti_aim_settings[6].defensive_pitch2, anti_aim_settings[7].defensive_pitch2, anti_aim_settings[8].defensive_pitch2, anti_aim_settings[9].defensive_pitch2, anti_aim_settings[10].defensive_pitch2, anti_aim_settings[1].defensive_pitch3, anti_aim_settings[2].defensive_pitch3, anti_aim_settings[3].defensive_pitch3, anti_aim_settings[4].defensive_pitch3, anti_aim_settings[5].defensive_pitch3, anti_aim_settings[6].defensive_pitch3, anti_aim_settings[7].defensive_pitch3, anti_aim_settings[8].defensive_pitch3, anti_aim_settings[9].defensive_pitch3, anti_aim_settings[10].defensive_pitch3, anti_aim_settings[1].defensive_yaw1, anti_aim_settings[2].defensive_yaw1, anti_aim_settings[3].defensive_yaw1, anti_aim_settings[4].defensive_yaw1, anti_aim_settings[5].defensive_yaw1, anti_aim_settings[6].defensive_yaw1, anti_aim_settings[7].defensive_yaw1, anti_aim_settings[8].defensive_yaw1, anti_aim_settings[9].defensive_yaw1, anti_aim_settings[10].defensive_yaw1, anti_aim_settings[1].defensive_yaw2, anti_aim_settings[2].defensive_yaw2, anti_aim_settings[3].defensive_yaw2, anti_aim_settings[4].defensive_yaw2, anti_aim_settings[5].defensive_yaw2, anti_aim_settings[6].defensive_yaw2, anti_aim_settings[7].defensive_yaw2, anti_aim_settings[8].defensive_yaw2, anti_aim_settings[9].defensive_yaw2, anti_aim_settings[10].defensive_yaw2, settings.avoid_backstab, settings.safe_head_in_air, defensive1, settings.freestanding_conditions, settings.tweaks, master_switch, console_filter, anim_breakerx, recharge, aspectratio, thirdperson, viewmodel, trashTalk, hitmarker, femboypng, fastladder, jittero, settings.warmup_disabler, watermark_mode, watermarkEnable}
    }

    local last_sim_time = 0
    local defensive_until = 0
    local function is_defensive_active()
        local tickcount = globals.tickcount()
        local sim_time = toticks(entity.get_prop(entity.get_local_player(), "m_flSimulationTime"))
        local sim_diff = sim_time - last_sim_time
        if sim_diff < 0 then defensive_until = (tickcount + math.abs(sim_diff)) - toticks(client.latency()) end
        last_sim_time = sim_time
        return defensive_until > tickcount
    end

    to_draw = "no"
    to_up = "no"
    to_draw_ticks = 0
    watermark_x, watermark_y = X - 90, Y / 2
    local y = 0
    local scope_xdxd = 0
    local alpha = 255
    local timer_test = 0
    local ctx = (function()
        local ctx = {}
        ctx.m_render = {
            rec = function(self, x, y, w, h, radius, color)
                radius = math.min(x / 2, y / 2, radius)
                local r, g, b, a = unpack(color)
                renderer.rectangle(x, y + radius, w, h - (radius * 2), r, g, b, a)
                renderer.rectangle(x + radius, y, w - (radius * 2), radius, r, g, b, a)
                renderer.rectangle(x + radius, (y + h) - radius, w - (radius * 2), radius, r, g, b, a)
                renderer.circle(x + radius, y + radius, r, g, b, a, radius, 180, 0.25)
                renderer.circle((x - radius) + w, y + radius, r, g, b, a, radius, 90, 0.25)
                renderer.circle((x - radius) + w, (y - radius) + h, r, g, b, a, radius, 0, 0.25)
                renderer.circle(x + radius, (y - radius) + h, r, g, b, a, radius, -90, 0.25)
            end,
            rec_outline = function(self, x, y, w, h, radius, thickness, color)
                radius = math.min(w / 2, h / 2, radius)
                local r, g, b, a = unpack(color)
                if radius == 1 then
                    renderer.rectangle(x, y, w, thickness, r, g, b, a)
                    renderer.rectangle(x, (y + h) - thickness, w, thickness, r, g, b, a)
                else
                    renderer.rectangle(x + radius, y, w - (radius * 2), thickness, r, g, b, a)
                    renderer.rectangle(x + radius, (y + h) - thickness, w - (radius * 2), thickness, r, g, b, a)
                    renderer.rectangle(x, y + radius, thickness, h - (radius * 2), r, g, b, a)
                    renderer.rectangle((x + w) - thickness, y + radius, thickness, h - (radius * 2), r, g, b, a)
                    renderer.circle_outline(x + radius, y + radius, r, g, b, a, radius, 180, 0.25, thickness)
                    renderer.circle_outline(x + radius, (y + h) - radius, r, g, b, a, radius, 90, 0.25, thickness)
                    renderer.circle_outline((x + w) - radius, y + radius, r, g, b, a, radius, -90, 0.25, thickness)
                    renderer.circle_outline((x + w) - radius, (y + h) - radius, r, g, b, a, radius, 0, 0.25, thickness)
                end
            end,
            glow_module = function(self, x, y, w, h, width, rounding, accent, accent_inner)
                local thickness = 1
                local offset = 1
                local r, g, b, a = unpack(accent)
                if accent_inner then self:rec(x, y, w, h + 1, rounding, accent_inner) end
                for k = 0, width do
                    if (a * ((k / width) ^ 1)) > 5 then
                        local accent = {r, g, b, a * ((k / width) ^ 2)}
                        self:rec_outline(x + (((k - width) - offset) * thickness), y + (((k - width) - offset) * thickness), w - (((k - width) - offset) * thickness * 2), (h + 1) - (((k - width) - offset) * thickness * 2), rounding + (thickness * ((width - k) + offset)), thickness, accent)
                    end
                end
            end,
            pandora_og = function(self, x, y, w, h, r, g, b, a, text)
                self:rec(x, y, w, h, 3, {0, 0, 0, 255})
                self:rec_outline(x + 1, y + 1, w - 2, h - 2, 3, 1, {45, 45, 45, 255})
                self:rec(x + 3, y + 3, w - 6, h - 6, 2, {15, 15, 15, 255})
                renderer.text(x + 5, y + 6, r, g, b, a, "", nil, text)
            end
        }

        ctx.notify = {
            easeInOut = function(t) return ((t > 0.5) and ((4 * ((t - 1) ^ 3)) + 1)) or (4 * (t ^ 3)) end,
            clamp = function(val, lower, upper)
                if lower > upper then lower, upper = upper, lower end
                return math.max(lower, math.min(upper, val))
            end,
            render = function()
                local Offset = 0
                for i, info_noti in ipairs(notify_data) do
                    if i > 7 then table.remove(notify_data, i) end
                    if (info_noti.text ~= nil) and (info_noti.text ~= "") then
                        if (info_noti.timer + 4.1) < globals.realtime() then
                            info_noti.fraction = ctx.notify.clamp(info_noti.fraction - (globals.frametime() / 0.3), 0, 1)
                        else
                            info_noti.fraction = ctx.notify.clamp(info_noti.fraction + (globals.frametime() / 0.3), 0, 1)
                            info_noti.time_left = ctx.notify.clamp(info_noti.time_left + (globals.frametime() / 4.1), 0, 1)
                        end
                    end

                    local fraction = ctx.notify.easeInOut(info_noti.fraction)
                    local width = vector(renderer.measure_text("c", info_noti.text))
                    local color = info_noti.color
                    renderer.text((((X / 2) - (width.x / 2)) - 20) + 5, ((Y - 200) - 100) + (31 * i * fraction) + 4, color[1], color[2], color[3], 255, "b", 0, "")
                    renderer.text((((X / 2) - (width.x / 2)) - 20) + 38, ((Y - 200) - 100) + (31 * i * fraction) + 4, 255, 255, 255, 255, "", 0, info_noti.text)
                    if (info_noti.timer + 4.3) < globals.realtime() then table.remove(notify_data, i) end
                end
            end
        }

        ctx.get_defensive = {
            get = function()
                local diff = sim_diff()
                if diff <= -1 then
                    to_draw = "yes"
                    to_up = "yes"
                end
            end
        }

        ctx.helps = {
            calculatePercentage = function(ticks, przez)
                local percentage = (ticks / przez) * 100
                return percentage
            end
        }

        ctx.defensive_ind = {
            render = function()
                local r, g, b, a = ui.get(current_color)
                if (to_draw == "yes") and ui.get(ref.doubletap[2]) then
                    draw_art = (to_draw_ticks * 100) / 27
                    ctx.m_render:glow_module((X / 2) - 50, (Y / 2) * 0.5, 100, 4, 10, 2, {r, g, 50}, {30, 30, 30, 100})
                    renderer.text(X / 2, ((Y / 2) * 0.5) - 10, 255, 255, 255, 255, "c", 0, "defensive")
                    ctx.m_render:rec((X / 2) - 65, (Y / 2) * 0.5, 130, 40, 20, {20, 20, 20, 255})
                    renderer.text((X / 2) - 20, (Y / 2) * 0.52, 255, 255, 255, 255, "b", 0, math.floor(ctx.helps.calculatePercentage(to_draw_ticks, 27)) .. "%")
                    ctx.m_render:rec((X / 2) - 59, (Y / 2) * 0.558, 5, 6, 2, {r, g, b, 255})
                    ctx.m_render:rec((X / 2) - 57, (Y / 2) * 0.558, 10, 8, 4, {r, g, b, 255})
                    ctx.m_render:rec((X / 2) - 50, (Y / 2) * 0.558, draw_art, 8, 2, {r, g, b, 255})
                    if logo ~= nil then
                        logo:draw((X / 2) + 20, (Y / 2) * 0.48, 60, 60, r, g, b, 255, true)
                    else
                        get_logo()
                    end

                    if to_draw_ticks == 27 then
                        to_draw_ticks = 0
                        to_draw = "no"
                    end

                    to_draw_ticks = to_draw_ticks + 1
                end
            end
        }

        ctx.arrows = {
            render = function()
                if direction == -90 then renderer.text((X / 2) - 60, (Y / 2) - 6, 255, 255, 255, 255, "", 0, "<") end
                if direction == 90 then renderer.text((X / 2) + 50, (Y / 2) - 6, 255, 255, 255, 255, "", 0, ">") end
            end
        }

        ctx.slowed_down = {
            paint = function()
                local slowed_down = entity.get_prop(entity.get_local_player(), "m_flVelocityModifier") * 100
                local r, g, b, a = 87, 235, 61
                local is_defensive = (to_draw == "yes") and ui.get(reference.double_tap[2])
                local is_dt = ui.get(reference.double_tap[2])
                local scoped = ((entity.get_prop(entity.get_local_player(), "m_bIsScoped") == 1) and true) or false
                local nextAttack = entity.get_prop(entity.get_local_player(), "m_flNextAttack")
                local nextPrimaryAttack = entity.get_prop(entity.get_player_weapon(entity.get_local_player()), "m_flNextPrimaryAttack")
                local dtActive = false
                if nextPrimaryAttack ~= nil then dtActive = not (math.max(nextPrimaryAttack, nextAttack) > globals.curtime()) end
                if (slowed_down < 100) and (slowed_down == true) then
                    local size_bar = (slowed_down_value * 98) / 100
                    if _ui.visuals.style.value == "Default" then
                        renderer.text(X / 2, (is_defensive and (((Y / 2) * 0.55) - 10)) or (((Y / 2) * 0.5) - 10), 255, 255, 255, 255, "c", 0, "- slowed down -")
                        renderer.rectangle((X / 2) - 50, (is_defensive and ((Y / 2) * 0.55)) or ((Y / 2) * 0.5), 100, 3, 12, 12, 12, 255)
                        renderer.rectangle((X / 2) - 50, (is_defensive and ((Y / 2) * 0.55)) or ((Y / 2) * 0.5), size_bar, 2, r, g, b, 255)
                    end

                    if _ui.visuals.style.value == "Modern" then
                        renderer.text(X / 2, (is_defensive and (((Y / 2) * 0.55) - 10)) or (((Y / 2) * 0.5) - 10), 255, 255, 255, 255, "c", 0, string.format("\aFFFFFFFFslowed down \aFFFFFFFF(\a%s%s%%\aFFFFFFFF)", rgba_to_hex(r, g, b, 255), math.floor(ctx.math.calculatePercentage(size_bar, 100))))
                        ctx.m_render:glow_module((X / 2) - 50, (is_defensive and ((Y / 2) * 0.55)) or ((Y / 2) * 0.5), 100, 3, 14, 2, {r, g, b, 50}, {30, 30, 30, 255})
                        renderer.rectangle(X / 2, (is_defensive and (((Y / 2) * 0.55) + 1)) or (((Y / 2) * 0.5) + 1), size_bar / 2, 2, r, g, b, 255)
                        renderer.rectangle(X / 2, (is_defensive and (((Y / 2) * 0.55) + 1)) or (((Y / 2) * 0.5) + 1), -size_bar / 2, 2, r, g, b, 255)
                    end
                end
            end
        }

        ctx.watermark = {
    render = function()
        -- Проверяем, включен ли водяной знак
        if not ui.get(watermarkEnable) then
            return
        end
        
        if ui.get(watermark_mode) == "Default" then
            local r, g, b, a = 255, 66, 169
            local text_size = vector(renderer.measure_text("cb", "A N Y A G A N G"))
            if ui.is_menu_open() then
                renderer.text(watermark_x, watermark_y - 20, 255, 255, 255, 200, "c", nil, "Click mouse2 = center watermark")
                render_rect_outline((watermark_x - (text_size.x / 2)) - 23, watermark_y - 10, text_size.x + 47, text_size.y + 10, 255, 255, 255, 255)
            end

            if client.key_state(1) and ui.is_menu_open() then
                local mouse_pos = {ui.mouse_position()}
                if intersect((watermark_x - (text_size.x / 2)) - 3, watermark_y - 10, text_size.x + 7, text_size.y + 9) then
                    watermark_x = mouse_pos[1]
                    watermark_y = mouse_pos[2]
                end
            end

            if client.key_state(2) and ui.is_menu_open() then if intersect((watermark_x - (text_size.x / 2)) - 3, watermark_y - 10, text_size.x + 7, text_size.y + 9) then watermark_x = X / 2 end end
            renderer.text(watermark_x, watermark_y, r, g, b, 255, "bc", 0, text_fade_animation(3, color_r, color_g, color_b, 255, "A N Y A G A N G") .. "\afa5757FF [LIVE]")
        end

        if ui.get(watermark_mode) == "Phobic" then
            local width = vector(renderer.measure_text("", text))
            local r, g, b, a = 255, 255, 255
            renderer.text(X / 2, Y - 5, r, g, b, 132, "c-", 0, "ANYAGANG.LIVE")
        end

        if ui.get(watermark_mode) == "Сringe" then
            local me = entity.get_local_player()
            if me == nil then return end
            local steam_id = entity.get_steam64(me)
            local steam_avatar = images.get_steam_avatar(steam_id)
            local marginXdd, marginYyy = renderer.measure_text("c", steam_id)
            renderer.rectangle((X / 2) - 370, Y - 31, 55 + marginXdd, 32, 70, 66, 94, 255)
            renderer.rectangle((X / 2) - 370, Y - 25, 30 + marginXdd, 32, 0, 0, 0, 255)
            renderer.text(((((X / 2) - 340) + marginXdd) - marginXdd) - 15, Y - 18, 255, 255, 255, 255, "b", nil, string.upper(euphemia.username))
            renderer.gradient((X / 2) - 370, Y - 25, 30 + marginXdd, 26, 70, 66, 94, 0, 70, 66, 94, 210, false)
            steam_avatar:draw(((X / 2) - 340) + marginXdd, Y - 25, 25, 25, 255, 255, 255, 255)
        end
    end
}

        ctx.helps = {
            lerp = function(a, b, t) return a + ((b - a) * t) end
        }

        ctx.inds = {
            default = function(scope)
                local r, g, b, a = ui.get(indcolors)
                local binds = string.format("\a%sQP  \a%sFS  \a%sHS", (ui.get(ref.quick_peek[2]) and rgba_to_hex(r, g, b, 255)) or rgba_to_hex(130, 130, 130, 190), (ui.get(ref.freestand[1]) and rgba_to_hex(r, g, b, 255)) or rgba_to_hex(130, 130, 130, 190), (ui.get(reference.on_shot_anti_aim[2]) and rgba_to_hex(r, g, b, 255)) or rgba_to_hex(130, 130, 130, 190))
                local exploit = string.format("\a%sDT", (ui.get(ref.doubletap[2]) and rgba_to_hex(r, g, b, 255)) or rgba_to_hex(130, 130, 130, 190))
                if ui.get(ref.doubletap[2]) and ui.get(ref.quick_peek[2]) then exploit = "\a" .. rgba_to_hex(r, g, b, 255) .. "PEEK-ASSIST" end
                local width = vector(renderer.measure_text("c", exploit))
                renderer.text((X / 2) + (24 * scope), (Y / 2) + 15, r, g, b, 255, "c", 0, "anyagang")
                renderer.text((X / 2) + ((width.x / 2) * scope), ((Y / 2) + 15 + 25) - 8, 255, 255, 255, 255, "c-", 0, exploit)
                renderer.text((X / 2) + (17 * scope), (Y / 2) + 15 + 8, 255, 255, 255, 255, "c-", 0, binds)
            end,
            render = function()
                local me = entity.get_local_player()
                if not entity.is_alive(me) then return end
                if entity.get_prop(me, "m_bIsScoped") == 1 then
                    scope_xdxd = ctx.notify.clamp(scope_xdxd + (globals.frametime() / 0.3), 0, 1)
                else
                    scope_xdxd = ctx.notify.clamp(scope_xdxd - (globals.frametime() / 0.3), 0, 1)
                end

                local fraction = ctx.notify.easeInOut(scope_xdxd)
                if ui.get(inds) then ctx.inds.default(fraction) end
            end
        }
        return ctx
    end)()
    local references = {
        minimum_damage = ui.reference("RAGE", "Aimbot", "Minimum damage"),
        minimum_damage_override = {ui.reference("RAGE", "Aimbot", "Minimum damage override")}
    }

    local screen_size = {client.screen_size()}
    
    -- Новая функция для отображения индикатора
    local function draw_min_damage()
        local localplayer = entity.get_local_player()
        if (localplayer == nil) or not entity.is_alive(localplayer) then 
            return 
        end
        
        local min_damage_value = 0
        local is_override_active = ui.get(references.minimum_damage_override[2])
        
        if is_override_active then
            -- Если оверрайд включён — берём значение оверрайда
            min_damage_value = ui.get(references.minimum_damage_override[3])
            -- Если в оверрайде 0, показываем обычный мин. дамаг
            if min_damage_value == 0 then
                min_damage_value = ui.get(references.minimum_damage)
            end
        else
            -- Если оверрайд выключен — показываем обычный мин. дамаг
            min_damage_value = ui.get(references.minimum_damage)
        end
        
        -- Показываем только если значение больше 0
        if min_damage_value > 0 then
            renderer.text((screen_size[1] / 2) + 2, (screen_size[2] / 2) - 14, 255, 255, 255, 225, "d", 0, tostring(min_damage_value))
        end
    end

    local ui_callback = function(self)
        local enabled = ui.get(self)
        if enabled then
            client.set_event_callback("paint", draw_min_damage)
        else
            client.unset_event_callback("paint", draw_min_damage)
        end
    end

    ui.set_callback(mindamageind, ui_callback)
    ui_callback(mindamageind)
    client.set_event_callback("paint", function()
        ctx.watermark.render()
        ctx.slowed_down:paint()
        ctx.inds.render()
    end)

    function new_notify(string, r, g, b, a)
        local notification = {
            text = string,
            timer = globals.realtime(),
            color = {r, g, b, a},
            alpha = 0,
            fraction = 0,
            time_left = 0
        }

        if #notify_data == 0 then
            notification.y = Y + 20
        else
            local lastNotification = notify_data[#notify_data]
            notification.y = lastNotification.y + 20
        end

        table.insert(notify_data, notification)
    end

    local function import(text)
        local status, config = pcall(function() return json.parse(base64.decode(text)) end)
        if not status or (status == nil) then
            client.color_log(255, 0, 0, "anyagang~")
            client.color_log(200, 200, 200, " error while importing!")
            return
        end

        if config ~= nil then
            for k, v in pairs(config) do
                k = ({
                    [1] = "integers"
                })[k]

                for k2, v2 in pairs(v) do
                    if k == "integers" then
                        local ui_element = data[k] and data[k][k2]
                        if ui_element then
                            ui.set(ui_element, v2)
                        else
                            client.color_log(255, 255, 0, "Warning: UI element not found: " .. tostring(k2))
                        end
                    end
                end
            end
        end

        client.color_log(124, 252, 0, "anyagang ~ \0")
        client.color_log(200, 200, 200, " config successfully imported!")
    end

    client.set_event_callback("setup_command", function(cmd)
        local self = entity.get_local_player()
        if entity.get_player_weapon(self) == nil then return end
        local using = false
        local anti_aim_on_use = false
        local inverted = (entity.get_prop(self, "m_flPoseParameter", 11) * 120) - 60
        local is_planting = (entity.get_prop(self, "m_bInBombZone") == 1) and (entity.get_classname(entity.get_player_weapon(self)) == "CC4") and (entity.get_prop(self, "m_iTeamNum") == 2)
        local CPlantedC4 = entity.get_all("CPlantedC4")[1]
        local eye_x, eye_y, eye_z = client.eye_position()
        local pitch, yaw = client.camera_angles()
        local sin_pitch = math.sin(math.rad(pitch))
        local cos_pitch = math.cos(math.rad(pitch))
        local sin_yaw = math.sin(math.rad(yaw))
        local cos_yaw = math.cos(math.rad(yaw))
        local direction_vector = {cos_pitch * cos_yaw, cos_pitch * sin_yaw, -sin_pitch}
        local fraction, entity_index = client.trace_line(self, eye_x, eye_y, eye_z, eye_x + (direction_vector[1] * 8192), eye_y + (direction_vector[2] * 8192), eye_z + (direction_vector[3] * 8192))
        if CPlantedC4 ~= nil then
            dist_to_c4 = vector(entity.get_prop(self, "m_vecOrigin")):dist(vector(entity.get_prop(CPlantedC4, "m_vecOrigin")))
            if entity.get_prop(CPlantedC4, "m_bBombDefused") == 1 then dist_to_c4 = 56 end
            is_defusing = (dist_to_c4 < 56) and (entity.get_prop(self, "m_iTeamNum") == 3)
        end

        if entity_index ~= -1 then if vector(entity.get_prop(self, "m_vecOrigin")):dist(vector(entity.get_prop(entity_index, "m_vecOrigin"))) < 146 then using = (entity.get_classname(entity_index) ~= "CWorld") and (entity.get_classname(entity_index) ~= "CFuncBrush") and (entity.get_classname(entity_index) ~= "CCSPlayer") end end
        if (cmd.in_use == 1) and not using and not is_planting and not is_defusing and ui.get(anti_aim_settings[10].override_state) then
            cmd.buttons = bit.band(cmd.buttons, bit.bnot(bit.lshift(1, 5)))
            anti_aim_on_use = true
            state_id = 10
        elseif ((ui.get(reference.double_tap[1]) and ui.get(reference.double_tap[2])) == false) and ((ui.get(reference.on_shot_anti_aim[1]) and ui.get(reference.on_shot_anti_aim[2])) == false) and ui.get(anti_aim_settings[9].override_state) then
            anti_aim_on_use = false
            state_id = 9
        elseif ((cmd.in_jump == 1) or (bit.band(entity.get_prop(self, "m_fFlags"), 1) == 0)) and (entity.get_prop(self, "m_flDuckAmount") > 0.8) and ui.get(anti_aim_settings[8].override_state) then
            anti_aim_on_use = false
            state_id = 8
        elseif ((cmd.in_jump == 1) or (bit.band(entity.get_prop(self, "m_fFlags"), 1) == 0)) and (entity.get_prop(self, "m_flDuckAmount") < 0.8) and ui.get(anti_aim_settings[7].override_state) then
            anti_aim_on_use = false
            state_id = 7
        elseif (bit.band(entity.get_prop(self, "m_fFlags"), 1) ~= 0) and ((entity.get_prop(self, "m_flDuckAmount") > 0.8) or ui.get(reference.duck_peek_assist)) and (vector(entity.get_prop(self, "m_vecVelocity")):length() > 2) and ui.get(anti_aim_settings[6].override_state) then
            anti_aim_on_use = false
            state_id = 6
        elseif (bit.band(entity.get_prop(self, "m_fFlags"), 1) ~= 0) and (entity.get_prop(self, "m_flDuckAmount") > 0.8) and (vector(entity.get_prop(self, "m_vecVelocity")):length() < 2) and ui.get(anti_aim_settings[5].override_state) then
            anti_aim_on_use = false
            state_id = 5
        elseif (bit.band(entity.get_prop(self, "m_fFlags"), 1) ~= 0) and (vector(entity.get_prop(self, "m_vecVelocity")):length() > 2) and (entity.get_prop(self, "m_flDuckAmount") < 0.8) and ((ui.get(reference.slow_motion[1]) and ui.get(reference.slow_motion[2])) == true) and ui.get(anti_aim_settings[4].override_state) then
            anti_aim_on_use = false
            state_id = 4
        elseif (bit.band(entity.get_prop(self, "m_fFlags"), 1) ~= 0) and (vector(entity.get_prop(self, "m_vecVelocity")):length() > 2) and (entity.get_prop(self, "m_flDuckAmount") < 0.8) and ((ui.get(reference.slow_motion[1]) and ui.get(reference.slow_motion[2])) == false) and ui.get(anti_aim_settings[3].override_state) then
            anti_aim_on_use = false
            state_id = 3
        elseif (bit.band(entity.get_prop(self, "m_fFlags"), 1) ~= 0) and (vector(entity.get_prop(self, "m_vecVelocity")):length() < 2) and (entity.get_prop(self, "m_flDuckAmount") < 0.8) and ui.get(anti_aim_settings[2].override_state) then
            anti_aim_on_use = false
            state_id = 2
        else
            anti_aim_on_use = false
            state_id = 1
        end

        if (cmd.in_jump == 1) or (bit.band(entity.get_prop(self, "m_fFlags"), 1) == 0) then
            freestanding_state_id = 5
        elseif ((entity.get_prop(self, "m_flDuckAmount") > 0.8) or ui.get(reference.duck_peek_assist)) and (bit.band(entity.get_prop(self, "m_fFlags"), 1) ~= 0) then
            freestanding_state_id = 4
        elseif (bit.band(entity.get_prop(self, "m_fFlags"), 1) ~= 0) and (vector(entity.get_prop(self, "m_vecVelocity")):length() > 2) and ((ui.get(reference.slow_motion[1]) and ui.get(reference.slow_motion[2])) == true) then
            freestanding_state_id = 3
        elseif (bit.band(entity.get_prop(self, "m_fFlags"), 1) ~= 0) and (vector(entity.get_prop(self, "m_vecVelocity")):length() > 2) and ((ui.get(reference.slow_motion[1]) and ui.get(reference.slow_motion[2])) == false) then
            freestanding_state_id = 2
        elseif (bit.band(entity.get_prop(self, "m_fFlags"), 1) ~= 0) and (vector(entity.get_prop(self, "m_vecVelocity")):length() < 2) then
            freestanding_state_id = 1
        end

        ui.set(settings.manual_forward, "On hotkey")
        ui.set(settings.manual_right, "On hotkey")
        ui.set(settings.manual_left, "On hotkey")
        cmd.force_defensive = ui.get(anti_aim_settings[state_id].defensive_anti_aimbot)
        if ui.get(defensive1) then cmd.force_defensive = ui.get(defensive1) end
        ui.set(reference.pitch[1], ui.get(anti_aim_settings[state_id].pitch1))
        ui.set(reference.pitch[2], ui.get(anti_aim_settings[state_id].pitch2))
        ui.set(reference.yaw_base, (((direction == 180) or (direction == 90) or (direction == -90)) and (anti_aim_on_use == false) and "Local view") or ui.get(anti_aim_settings[state_id].yaw_base))
        ui.set(reference.yaw[1], (((direction == 180) or (direction == 90) or (direction == -90)) and (anti_aim_on_use == false) and "180") or ui.get(anti_aim_settings[state_id].yaw1))
        if (ui.get(anti_aim_settings[state_id].yaw1) ~= "Off") and (ui.get(anti_aim_settings[state_id].yaw_jitter1) == "Delay") then
            if inverted > 0 then
                if ui.get(settings.manual_left) and ((last_press + 0.2) < globals.realtime()) then
                    direction = ((direction == -90) and ui.get(anti_aim_settings[state_id].yaw_jitter2_left)) or -90
                    last_press = globals.realtime()
                elseif ui.get(settings.manual_right) and ((last_press + 0.2) < globals.realtime()) then
                    direction = ((direction == 90) and ui.get(anti_aim_settings[state_id].yaw_jitter2_left)) or 90
                    last_press = globals.realtime()
                elseif ui.get(settings.manual_forward) and ((last_press + 0.2) < globals.realtime()) then
                    direction = ((direction == 180) and ui.get(anti_aim_settings[state_id].yaw_jitter2_left)) or 180
                    last_press = globals.realtime()
                end
            elseif ui.get(settings.manual_left) and ((last_press + 0.2) < globals.realtime()) then
                direction = ((direction == -90) and ui.get(anti_aim_settings[state_id].yaw_jitter2_right)) or -90
                last_press = globals.realtime()
            elseif ui.get(settings.manual_right) and ((last_press + 0.2) < globals.realtime()) then
                direction = ((direction == 90) and ui.get(anti_aim_settings[state_id].yaw_jitter2_right)) or 90
                last_press = globals.realtime()
            elseif ui.get(settings.manual_forward) and ((last_press + 0.2) < globals.realtime()) then
                direction = ((direction == 180) and ui.get(anti_aim_settings[state_id].yaw_jitter2_right)) or 180
                last_press = globals.realtime()
            end
        elseif inverted > 0 then
            if ui.get(settings.manual_left) and ((last_press + 0.2) < globals.realtime()) then
                direction = ((direction == -90) and ui.get(anti_aim_settings[state_id].yaw2_left)) or -90
                last_press = globals.realtime()
            elseif ui.get(settings.manual_right) and ((last_press + 0.2) < globals.realtime()) then
                direction = ((direction == 90) and ui.get(anti_aim_settings[state_id].yaw2_left)) or 90
                last_press = globals.realtime()
            elseif ui.get(settings.manual_forward) and ((last_press + 0.2) < globals.realtime()) then
                direction = ((direction == 180) and ui.get(anti_aim_settings[state_id].yaw2_left)) or 180
                last_press = globals.realtime()
            end
        elseif ui.get(settings.manual_left) and ((last_press + 0.2) < globals.realtime()) then
            direction = ((direction == -90) and ui.get(anti_aim_settings[state_id].yaw2_right)) or -90
            last_press = globals.realtime()
        elseif ui.get(settings.manual_right) and ((last_press + 0.2) < globals.realtime()) then
            direction = ((direction == 90) and ui.get(anti_aim_settings[state_id].yaw2_right)) or 90
            last_press = globals.realtime()
        elseif ui.get(settings.manual_forward) and ((last_press + 0.2) < globals.realtime()) then
            direction = ((direction == 180) and ui.get(anti_aim_settings[state_id].yaw2_right)) or 180
            last_press = globals.realtime()
        end

        if (ui.get(anti_aim_settings[state_id].yaw1) ~= "Off") and (ui.get(anti_aim_settings[state_id].yaw_jitter1) == "Delay") then
            if math.random(0, 1) ~= 0 then
                yaw_jitter2_left = ui.get(anti_aim_settings[state_id].yaw_jitter2_left) - math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
                yaw_jitter2_right = ui.get(anti_aim_settings[state_id].yaw_jitter2_right) - math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
            else
                yaw_jitter2_left = ui.get(anti_aim_settings[state_id].yaw_jitter2_left) + math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
                yaw_jitter2_right = ui.get(anti_aim_settings[state_id].yaw_jitter2_right) + math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
            end

            if inverted > 0 then
                if yaw_jitter2_left == 180 then
                    yaw_jitter2_left = -180
                elseif yaw_jitter2_left == 90 then
                    yaw_jitter2_left = 89
                elseif yaw_jitter2_left == -90 then
                    yaw_jitter2_left = -89
                end

                if not ((direction == 180) or (direction == 90) or (direction == -90)) then direction = yaw_jitter2_left end
            else
                if yaw_jitter2_right == 180 then
                    yaw_jitter2_right = -180
                elseif yaw_jitter2_right == 90 then
                    yaw_jitter2_right = 89
                elseif yaw_jitter2_right == -90 then
                    yaw_jitter2_right = -89
                end

                if not ((direction == 180) or (direction == 90) or (direction == -90)) then direction = yaw_jitter2_right end
            end
        elseif inverted > 0 then
            if math.random(0, 1) ~= 0 then
                yaw2_left = ui.get(anti_aim_settings[state_id].yaw2_left) - math.random(0, ui.get(anti_aim_settings[state_id].yaw2_randomize))
            else
                yaw2_left = ui.get(anti_aim_settings[state_id].yaw2_left) + math.random(0, ui.get(anti_aim_settings[state_id].yaw2_randomize))
            end

            if yaw2_left == 180 then
                yaw2_left = -180
            elseif yaw2_left == 90 then
                yaw2_left = 89
            elseif yaw2_left == -90 then
                yaw2_left = -89
            end

            if not ((direction == 90) or (direction == -90) or (direction == 180)) then direction = yaw2_left end
        else
            if math.random(0, 1) ~= 0 then
                yaw2_right = ui.get(anti_aim_settings[state_id].yaw2_right) - math.random(0, ui.get(anti_aim_settings[state_id].yaw2_randomize))
            else
                yaw2_right = ui.get(anti_aim_settings[state_id].yaw2_right) + math.random(0, ui.get(anti_aim_settings[state_id].yaw2_randomize))
            end

            if yaw2_right == 180 then
                yaw2_right = -180
            elseif yaw2_right == 90 then
                yaw2_right = 89
            elseif yaw2_right == -90 then
                yaw2_right = -89
            end

            if not ((direction == 90) or (direction == -90) or (direction == 180)) then direction = yaw2_right end
        end

        if anti_aim_on_use == true then
            if (ui.get(anti_aim_settings[state_id].yaw1) ~= "Off") and (ui.get(anti_aim_settings[state_id].yaw_jitter1) == "Delay") then
                if inverted > 0 then
                    if math.random(0, 1) ~= 0 then
                        anti_aim_on_use_direction = ui.get(anti_aim_settings[state_id].yaw_jitter2_left) - math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
                    else
                        anti_aim_on_use_direction = ui.get(anti_aim_settings[state_id].yaw_jitter2_left) + math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
                    end
                elseif math.random(0, 1) ~= 0 then
                    anti_aim_on_use_direction = ui.get(anti_aim_settings[state_id].yaw_jitter2_right) - math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
                else
                    anti_aim_on_use_direction = ui.get(anti_aim_settings[state_id].yaw_jitter2_right) + math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
                end
            elseif inverted > 0 then
                if math.random(0, 1) ~= 0 then
                    anti_aim_on_use_direction = ui.get(anti_aim_settings[state_id].yaw2_left) - math.random(0, ui.get(anti_aim_settings[state_id].yaw2_randomize))
                else
                    anti_aim_on_use_direction = ui.get(anti_aim_settings[state_id].yaw2_left) + math.random(0, ui.get(anti_aim_settings[state_id].yaw2_randomize))
                end
            elseif math.random(0, 1) ~= 0 then
                anti_aim_on_use_direction = ui.get(anti_aim_settings[state_id].yaw2_right) - math.random(0, ui.get(anti_aim_settings[state_id].yaw2_randomize))
            else
                anti_aim_on_use_direction = ui.get(anti_aim_settings[state_id].yaw2_right) + math.random(0, ui.get(anti_aim_settings[state_id].yaw2_randomize))
            end
        end

        if (direction > 180) or (direction < -180) then direction = -180 end
        if (anti_aim_on_use_direction > 180) or (anti_aim_on_use_direction < -180) then anti_aim_on_use_direction = -180 end
        ui.set(reference.yaw[2], ((anti_aim_on_use == false) and direction) or anti_aim_on_use_direction)
        ui.set(reference.yaw_jitter[1], (((((direction == 180) or (direction == 90) or (direction == -90)) and contains(settings.tweaks, "Off jitter on manual") and (anti_aim_on_use == false)) or (ui.get(anti_aim_settings[state_id].yaw_jitter1) == "Delay") or (ui.get(anti_aim_settings[state_id].yaw1) == "Off")) and "Off") or ui.get(anti_aim_settings[state_id].yaw_jitter1))
        if inverted > 0 then
            if math.random(0, 1) ~= 0 then
                yaw_jitter2_left = ui.get(anti_aim_settings[state_id].yaw_jitter2_left) - math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
            else
                yaw_jitter2_left = ui.get(anti_aim_settings[state_id].yaw_jitter2_left) + math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
            end

            if (yaw_jitter2_left > 180) or (yaw_jitter2_left < -180) then yaw_jitter2_left = -180 end
            ui.set(reference.yaw_jitter[2], ((ui.get(anti_aim_settings[state_id].yaw1) ~= "Off") and yaw_jitter2_left) or 0)
        else
            if math.random(0, 1) ~= 0 then
                yaw_jitter2_right = ui.get(anti_aim_settings[state_id].yaw_jitter2_right) - math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
            else
                yaw_jitter2_right = ui.get(anti_aim_settings[state_id].yaw_jitter2_right) + math.random(0, ui.get(anti_aim_settings[state_id].yaw_jitter2_randomize))
            end

            if (yaw_jitter2_right > 180) or (yaw_jitter2_right < -180) then yaw_jitter2_right = -180 end
            ui.set(reference.yaw_jitter[2], ((ui.get(anti_aim_settings[state_id].yaw1) ~= "Off") and yaw_jitter2_right) or 0)
        end

        if (ui.get(anti_aim_settings[state_id].yaw1) ~= "Off") and (ui.get(anti_aim_settings[state_id].yaw_jitter1) == "Delay") then
            if ((ui.get(reference.double_tap[1]) and ui.get(reference.double_tap[2])) == true) or ((ui.get(reference.on_shot_anti_aim[1]) and ui.get(reference.on_shot_anti_aim[2])) == true) then
                ui.set(reference.body_yaw[1], (((direction == 180) or (direction == 90) or (direction == -90)) and contains(settings.tweaks, "Off jitter on manual") and (anti_aim_on_use == false) and "Opposite") or "Static")
            else
                ui.set(reference.body_yaw[1], (((direction == 180) or (direction == 90) or (direction == -90)) and contains(settings.tweaks, "Off jitter on manual") and (anti_aim_on_use == false) and "Opposite") or "Jitter")
            end
        else
            ui.set(reference.body_yaw[1], (((direction == 180) or (direction == 90) or (direction == -90)) and contains(settings.tweaks, "Off jitter on manual") and (anti_aim_on_use == false) and "Opposite") or ui.get(anti_aim_settings[state_id].body_yaw1))
        end

        if ((cmd.command_number % ui.get(anti_aim_settings[state_id].yaw_jitter2_delay)) + 1) > (ui.get(anti_aim_settings[state_id].yaw_jitter2_delay) - 1) then delayed_jitter = not delayed_jitter end
        if (ui.get(anti_aim_settings[state_id].yaw1) ~= "Off") and (ui.get(anti_aim_settings[state_id].yaw_jitter1) == "Delay") then
            if ((ui.get(reference.double_tap[1]) and ui.get(reference.double_tap[2])) == true) or ((ui.get(reference.on_shot_anti_aim[1]) and ui.get(reference.on_shot_anti_aim[2])) == true) then
                ui.set(reference.body_yaw[2], (delayed_jitter and -90) or 90)
            else
                ui.set(reference.body_yaw[2], -40)
            end
        else
            ui.set(reference.body_yaw[2], ui.get(anti_aim_settings[state_id].body_yaw2))
        end

        ui.set(reference.freestanding_body_yaw, ((ui.get(anti_aim_settings[state_id].yaw1) ~= "Off") and (ui.get(anti_aim_settings[state_id].yaw_jitter1) == "Delay") and false) or ui.get(anti_aim_settings[state_id].freestanding_body_yaw))
        if ui.get(anti_aim_settings[state_id].defensive_anti_aimbot) and is_defensive_active and ((ui.get(reference.double_tap[1]) and ui.get(reference.double_tap[2])) or (ui.get(reference.on_shot_anti_aim[1]) and ui.get(reference.on_shot_anti_aim[2]))) and not ((direction == 180) or (direction == 90) or (direction == -90)) then
            ui.set(reference.pitch[1], ui.get(anti_aim_settings[state_id].defensive_pitch1))
            if ui.get(anti_aim_settings[state_id].defensive_pitch1) == "Random" then
                ui.set(reference.pitch[1], "Custom")
                ui.set(reference.pitch[2], math.random(ui.get(anti_aim_settings[state_id].defensive_pitch2), ui.get(anti_aim_settings[state_id].defensive_pitch3)))
            else
                ui.set(reference.pitch[2], ui.get(anti_aim_settings[state_id].defensive_pitch2))
            end

            ui.set(reference.yaw_jitter[1], "Off")
            ui.set(reference.body_yaw[1], "Opposite")
            if ui.get(anti_aim_settings[state_id].defensive_yaw1) == "180" then
                ui.set(reference.yaw[1], "180")
                ui.set(reference.yaw[2], ui.get(anti_aim_settings[state_id].defensive_yaw2))
            elseif ui.get(anti_aim_settings[state_id].defensive_yaw1) == "Spin" then
                ui.set(reference.yaw[1], "Spin")
                ui.set(reference.yaw[2], ui.get(anti_aim_settings[state_id].defensive_yaw2))
            elseif ui.get(anti_aim_settings[state_id].defensive_yaw1) == "180 Z" then
                ui.set(reference.yaw[1], "180 Z")
                ui.set(reference.yaw[2], ui.get(anti_aim_settings[state_id].defensive_yaw2))
            elseif ui.get(anti_aim_settings[state_id].defensive_yaw1) == "Sideways" then
                ui.set(reference.yaw[1], "180")
                if (cmd.command_number % 4) >= 2 then
                    ui.set(reference.yaw[2], math.random(85, 100))
                else
                    ui.set(reference.yaw[2], math.random(-100, -85))
                end
            elseif ui.get(anti_aim_settings[state_id].defensive_yaw1) == "Random" then
                ui.set(reference.yaw[1], "180")
                ui.set(reference.yaw[2], math.random(-180, 180))
            end
        end

        if ui.get(settings.safe_head_in_air) and ((cmd.in_jump == 1) or (bit.band(entity.get_prop(self, "m_fFlags"), 1) == 0)) and (entity.get_prop(self, "m_flDuckAmount") > 0.8) and ((entity.get_classname(entity.get_player_weapon(self)) == "CKnife") or (entity.get_classname(entity.get_player_weapon(self)) == "CWeaponTaser")) and (anti_aim_on_use == false) and not ((direction == 180) or (direction == 90) or (direction == -90)) then
            ui.set(reference.pitch[1], "Down")
            ui.set(reference.yaw[1], "180")
            ui.set(reference.yaw[2], 0)
            ui.set(reference.yaw_jitter[1], "Off")
            ui.set(reference.body_yaw[1], "Off")
        end

        if ui.get(settings.freestanding) and ((contains(settings.freestanding_conditions, "Standing") and (freestanding_state_id == 1)) or (contains(settings.freestanding_conditions, "Moving") and (freestanding_state_id == 2)) or (contains(settings.freestanding_conditions, "Slow motion") and (freestanding_state_id == 3)) or (contains(settings.freestanding_conditions, "Crouching") and (freestanding_state_id == 4)) or (contains(settings.freestanding_conditions, "In air") and (freestanding_state_id == 5))) and (anti_aim_on_use == false) and not ((direction == 180) or (direction == 90) or (direction == -90)) then
            ui.set(reference.freestanding[1], true)
            ui.set(reference.freestanding[2], "Always on")
            if contains(settings.tweaks, "Off jitter while freestanding") then
                ui.set(reference.yaw[1], "180")
                ui.set(reference.yaw[2], 0)
                ui.set(reference.yaw_jitter[1], "Off")
                ui.set(reference.body_yaw[1], "Opposite")
                ui.set(reference.body_yaw[2], 0)
                ui.set(reference.freestanding_body_yaw, true)
            end
        else
            ui.set(reference.freestanding[1], false)
            ui.set(reference.freestanding[2], "On hotkey")
        end

        if ui.get(settings.avoid_backstab) and (anti_aim_on_use == false) and not ((direction == 180) or (direction == 90) or (direction == -90)) then
            local players = entity.get_players(true)
            if players ~= nil then
                for i, enemy in pairs(players) do
                    for h = 0, 18 do
                        local head_x, head_y, head_z = entity.hitbox_position(players[i], h)
                        local wx, wy = renderer.world_to_screen(head_x, head_y, head_z)
                        local fractions, entindex_hit = client.trace_line(self, eye_x, eye_y, eye_z, head_x, head_y, head_z)
                        if (250 >= vector(entity.get_prop(enemy, "m_vecOrigin")):dist(vector(entity.get_prop(self, "m_vecOrigin")))) and entity.is_alive(enemy) and (entity.get_player_weapon(enemy) ~= nil) and (entity.get_classname(entity.get_player_weapon(enemy)) == "CKnife") and ((entindex_hit == players[i]) or (fractions == 1)) and not entity.is_dormant(players[i]) then
                            ui.set(reference.yaw[1], "180")
                            ui.set(reference.yaw[2], -180)
                        end
                    end
                end
            end
        end
    end)

    client.set_event_callback("paint_ui", function()
        if entity.get_local_player() == nil then cheked_ticks = 0 end
        if ui.is_menu_open() then
            ui.set_visible(reference.aa_enable, false)
            ui.set_visible(reference.pitch[1], false)
            ui.set_visible(reference.pitch[2], false)
            ui.set_visible(reference.yaw_base, false)
            ui.set_visible(reference.yaw[1], false)
            ui.set_visible(reference.yaw[2], false)
            ui.set_visible(reference.yaw_jitter[1], false)
            ui.set_visible(reference.yaw_jitter[2], false)
            ui.set_visible(reference.body_yaw[1], false)
            ui.set_visible(reference.body_yaw[2], false)
            ui.set_visible(reference.freestanding_body_yaw, false)
            ui.set_visible(reference.edge_yaw, false)
            ui.set_visible(reference.freestanding[1], false)
            ui.set_visible(reference.freestanding[2], false)
            ui.set_visible(reference.roll, false)
            ui.set_visible(current_state_menu, ui.get(current_tab) == "Anti-Aim")
            ui.set_visible(settings.anti_aim_state, (ui.get(current_tab) == "Anti-Aim") and (ui.get(current_state_menu) == "builder"))
            ui.set_visible(settings.avoid_backstab, (ui.get(current_tab) == "Anti-Aim") and (ui.get(current_state_menu) == "other"))
            ui.set_visible(settings.safe_head_in_air, (ui.get(current_tab) == "Anti-Aim") and (ui.get(current_state_menu) == "other"))
            ui.set_visible(defensive1, (ui.get(current_tab) == "Anti-Aim") and (ui.get(current_state_menu) == "other"))
            ui.set_visible(settings.manual_forward, (ui.get(current_tab) == "Anti-Aim") and (ui.get(current_state_menu) == "keybinds"))
            ui.set_visible(settings.manual_right, (ui.get(current_tab) == "Anti-Aim") and (ui.get(current_state_menu) == "keybinds"))
            ui.set_visible(settings.manual_left, (ui.get(current_tab) == "Anti-Aim") and (ui.get(current_state_menu) == "keybinds"))
            ui.set_visible(settings.freestanding, (ui.get(current_tab) == "Anti-Aim") and (ui.get(current_state_menu) == "keybinds"))
            ui.set_visible(settings.warmup_disabler, (ui.get(current_tab) == "Anti-Aim") and (ui.get(current_state_menu) == "other"))
            ui.set_visible(settings.freestanding_conditions, (ui.get(current_tab) == "Anti-Aim") and (ui.get(current_state_menu) == "keybinds"))
            ui.set_visible(settings.tweaks, (ui.get(current_tab) == "Anti-Aim") and (ui.get(current_state_menu) == "keybinds"))
            ui.set_visible(master_switch, ui.get(current_tab) == "Visuals")
            ui.set_visible(femboypng, ui.get(current_tab) == "Visuals")
            ui.set_visible(console_filter, ui.get(current_tab) == "Misc")
            ui.set_visible(animations, ui.get(current_tab) == "Misc")
            ui.set_visible(animations, ui.get(animationsEnabled) == true)
            ui.set_visible(animationsEnabled, ui.get(current_tab) == "Misc")
            ui.set_visible(fastladder, ui.get(current_tab) == "Misc")
            ui.set_visible(jittero, ui.get(current_tab) == "Misc")
            ui.set_visible(recharge, ui.get(current_tab) == "Misc")
            ui.set_visible(inds, ui.get(current_tab) == "Visuals")
            ui.set_visible(aspectratio, ui.get(current_tab) == "Visuals")
            ui.set_visible(thirdperson, ui.get(current_tab) == "Visuals")
            ui.set_visible(pusto2, ui.get(current_tab) == "Visuals")
            ui.set_visible(clanTag, ui.get(current_tab) == "Visuals")
            ui.set_visible(viewmodel, ui.get(current_tab) == "Visuals")
            ui.set_visible(misc_, ui.get(current_tab) == "Misc")
            ui.set_visible(line3, ui.get(current_tab) == "Misc")
            ui.set_visible(damage_ind, ui.get(current_tab) == "Visuals")
            ui.set_visible(mindamageind, ui.get(current_tab) == "Visuals")
            ui.set_visible(indcolors, ui.get(current_tab) == "Visuals")
            local function update_visibility()
                local is_visuals_tab = ui.get(current_tab) == "Visuals"
                local is_misc_tab = ui.get(current_tab) == "Misc"
                ui.set_visible(trashTalk, is_visuals_tab)
                ui.set_visible(watermarkEnable, is_visuals_tab)
                local is_trash_talk_enabled = is_visuals_tab and ui.get(trashTalk)
                ui.set_visible(trashTalk_vibor, is_trash_talk_enabled)
                local is_watermark_enabled = is_visuals_tab and ui.get(watermarkEnable)
                ui.set_visible(watermark_mode, is_watermark_enabled)
                local is_animations_enabled = is_misc_tab and ui.get(animationsEnabled)
                ui.set_visible(animations, is_animations_enabled)
                ui.set_visible(aspect_ratio_slider, is_visuals_tab and ui.get(aspectratio))
                ui.set_visible(thirdperson_distance, is_visuals_tab and ui.get(thirdperson))
                ui.set_visible(viewmodel_fov, is_visuals_tab and ui.get(viewmodel))
                ui.set_visible(viewmodel_offset_x, is_visuals_tab and ui.get(viewmodel))
                ui.set_visible(viewmodel_offset_y, is_visuals_tab and ui.get(viewmodel))
                ui.set_visible(viewmodel_offset_z, is_visuals_tab and ui.get(viewmodel))
            end

            update_visibility()
            ui.set_callback(current_tab, update_visibility)
            ui.set_callback(watermarkEnable, update_visibility)
            ui.set_callback(trashTalk, update_visibility)
            ui.set_callback(animationsEnabled, update_visibility)
            ui.set_visible(nile2, ui.get(current_tab) == "Visuals")
            ui.set_visible(polosa, ui.get(current_tab) == "Visuals")
            ui.set_visible(other_, ui.get(current_tab) == "Visuals")
            ui.set_visible(visual_, ui.get(current_tab) == "Visuals")
            ui.set_visible(unsafecharhge, ui.get(current_tab) == "Misc")
            for i = 1, #anti_aim_states do
                ui.set_visible(anti_aim_settings[i].override_state, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(current_state_menu) == "builder"))
                ui.set(anti_aim_settings[1].override_state, true)
                ui.set_visible(anti_aim_settings[1].override_state, false)
                ui.set_visible(anti_aim_settings[i].pitch1, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].pitch2, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].pitch1) == "Custom") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].yaw_base, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].yaw1, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].yaw2_left, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].yaw1) ~= "Off") and (ui.get(anti_aim_settings[i].yaw_jitter1) ~= "Delay") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].yaw2_right, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].yaw1) ~= "Off") and (ui.get(anti_aim_settings[i].yaw_jitter1) ~= "Delay") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].yaw2_randomize, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].yaw1) ~= "Off") and (ui.get(anti_aim_settings[i].yaw_jitter1) ~= "Delay") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].yaw_jitter1, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].yaw1) ~= "Off") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].yaw_jitter2_left, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].yaw1) ~= "Off") and (ui.get(anti_aim_settings[i].yaw_jitter1) ~= "Off") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].yaw_jitter2_right, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].yaw1) ~= "Off") and (ui.get(anti_aim_settings[i].yaw_jitter1) ~= "Off") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].yaw_jitter2_randomize, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].yaw1) ~= "Off") and (ui.get(anti_aim_settings[i].yaw_jitter1) ~= "Off") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].yaw_jitter2_delay, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].yaw1) ~= "Off") and (ui.get(anti_aim_settings[i].yaw_jitter1) == "Delay") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].body_yaw1, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].yaw_jitter1) ~= "Delay") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].body_yaw2, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].body_yaw1) ~= "Off") and (ui.get(anti_aim_settings[i].body_yaw1) ~= "Opposite") and (ui.get(anti_aim_settings[i].yaw_jitter1) ~= "Delay") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].freestanding_body_yaw, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(anti_aim_settings[i].body_yaw1) ~= "Off") and (ui.get(anti_aim_settings[i].yaw_jitter1) ~= "Delay") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[i].defensive_anti_aimbot, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[9].defensive_anti_aimbot, false)
                ui.set_visible(anti_aim_settings[i].defensive_pitch1, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and ui.get(anti_aim_settings[i].defensive_anti_aimbot) and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[9].defensive_pitch1, false)
                ui.set_visible(anti_aim_settings[i].defensive_pitch2, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and ui.get(anti_aim_settings[i].defensive_anti_aimbot) and ((ui.get(anti_aim_settings[i].defensive_pitch1) == "Random") or (ui.get(anti_aim_settings[i].defensive_pitch1) == "Custom")) and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[9].defensive_pitch2, false)
                ui.set_visible(anti_aim_settings[i].defensive_pitch3, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and ui.get(anti_aim_settings[i].defensive_anti_aimbot) and (ui.get(anti_aim_settings[i].defensive_pitch1) == "Random") and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[9].defensive_pitch3, false)
                ui.set_visible(anti_aim_settings[i].defensive_yaw1, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and ui.get(anti_aim_settings[i].defensive_anti_aimbot) and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[9].defensive_yaw1, false)
                ui.set_visible(anti_aim_settings[i].defensive_yaw2, (ui.get(current_tab) == "Anti-Aim") and (ui.get(settings.anti_aim_state) == anti_aim_states[i]) and ui.get(anti_aim_settings[i].defensive_anti_aimbot) and ((ui.get(anti_aim_settings[i].defensive_yaw1) == "180") or (ui.get(anti_aim_settings[i].defensive_yaw1) == "Spin") or (ui.get(anti_aim_settings[i].defensive_yaw1) == "180 Z")) and (ui.get(current_state_menu) == "builder"))
                ui.set_visible(anti_aim_settings[9].defensive_yaw2, false)
            end
        end
    end)

    local refs = {
        slowmotion = ui.reference("AA", "Other", "Slow motion"),
        OSAAA = ui.reference("AA", "Other", "On shot anti-aim"),
        Legmoves = ui.reference("AA", "Other", "Leg movement"),
        legit = ui.reference("LEGIT", "Aimbot", "Enabled"),
        minimum_damage_override = {ui.reference("Rage", "Aimbot", "Minimum damage override")},
        fakeDuck = ui.reference("RAGE", "Other", "Duck peek assist"),
        minimum_damage = ui.reference("Rage", "Aimbot", "Minimum damage"),
        hitChance = ui.reference("RAGE", "Aimbot", "Minimum hit chance"),
        safePoint = ui.reference("RAGE", "Aimbot", "Force safe point"),
        forceBaim = ui.reference("RAGE", "Aimbot", "Force body aim"),
        dtLimit = ui.reference("RAGE", "Aimbot", "Double tap fake lag limit"),
        quickPeek = {ui.reference("RAGE", "Other", "Quick peek assist")},
        dt = {ui.reference("RAGE", "Aimbot", "Double tap")},
        enabled = ui.reference("AA", "Anti-aimbot angles", "Enabled"),
        pitch = {ui.reference("AA", "Anti-aimbot angles", "pitch")},
        roll = ui.reference("AA", "Anti-aimbot angles", "roll"),
        yawBase = ui.reference("AA", "Anti-aimbot angles", "Yaw base"),
        yaw = {ui.reference("AA", "Anti-aimbot angles", "Yaw")},
        flLimit = ui.reference("AA", "Fake lag", "Limit"),
        flamount = ui.reference("AA", "Fake lag", "Amount"),
        flenabled = ui.reference("AA", "Fake lag", "Enabled"),
        flVariance = ui.reference("AA", "Fake lag", "Variance"),
        AAfake = ui.reference("AA", "Other", "Fake peek"),
        fsBodyYaw = ui.reference("AA", "anti-aimbot angles", "Freestanding body yaw"),
        edgeYaw = ui.reference("AA", "Anti-aimbot angles", "Edge yaw"),
        yawJitter = {ui.reference("AA", "Anti-aimbot angles", "Yaw jitter")},
        bodyYaw = {ui.reference("AA", "Anti-aimbot angles", "Body yaw")},
        freeStand = {ui.reference("AA", "Anti-aimbot angles", "Freestanding")},
        os = {ui.reference("AA", "Other", "On shot anti-aim")},
        slow = {ui.reference("AA", "Other", "Slow motion")},
        fakeLag = {ui.reference("AA", "Fake lag", "Limit")},
        legMovement = ui.reference("AA", "Other", "Leg movement"),
        indicators = {ui.reference("VISUALS", "Other ESP", "Feature indicators")},
        ping = {ui.reference("MISC", "Miscellaneous", "Ping spike")}
    }

    local func = {
        render_text = function(x, y, ...)
            local x_Offset = 0
            local args = {...}
            for i, line in pairs(args) do
                local r, g, b, a, text = unpack(line)
                local size = vector(renderer.measure_text("-d", text))
                renderer.text(x + x_Offset, y, r, g, b, a, "-d", 0, text)
                x_Offset = x_Offset + size.x
            end
        end,
        easeInOut = function(t) return ((t > 0.5) and ((4 * ((t - 1) ^ 3)) + 1)) or (4 * (t ^ 3)) end,
        rec = function(x, y, w, h, radius, color)
            radius = math.min(x / 2, y / 2, radius)
            local r, g, b, a = unpack(color)
            renderer.rectangle(x, y + radius, w, h - (radius * 2), r, g, b, a)
            renderer.rectangle(x + radius, y, w - (radius * 2), radius, r, g, b, a)
            renderer.rectangle(x + radius, (y + h) - radius, w - (radius * 2), radius, r, g, b, a)
            renderer.circle(x + radius, y + radius, r, g, b, a, radius, 180, 0.25)
            renderer.circle((x - radius) + w, y + radius, r, g, b, a, radius, 90, 0.25)
            renderer.circle((x - radius) + w, (y - radius) + h, r, g, b, a, radius, 0, 0.25)
            renderer.circle(x + radius, (y - radius) + h, r, g, b, a, radius, -90, 0.25)
        end,
        rec_outline = function(x, y, w, h, radius, thickness, color)
            radius = math.min(w / 2, h / 2, radius)
            local r, g, b, a = unpack(color)
            if radius == 1 then
                renderer.rectangle(x, y, w, thickness, r, g, b, a)
                renderer.rectangle(x, (y + h) - thickness, w, thickness, r, g, b, a)
            else
                renderer.rectangle(x + radius, y, w - (radius * 2), thickness, r, g, b, a)
                renderer.rectangle(x + radius, (y + h) - thickness, w - (radius * 2), thickness, r, g, b, a)
                renderer.rectangle(x, y + radius, thickness, h - (radius * 2), r, g, b, a)
                renderer.rectangle((x + w) - thickness, y + radius, thickness, h - (radius * 2), r, g, b, a)
                renderer.circle_outline(x + radius, y + radius, r, g, b, a, radius, 180, 0.25, thickness)
                renderer.circle_outline(x + radius, (y + h) - radius, r, g, b, a, radius, 90, 0.25, thickness)
                renderer.circle_outline((x + w) - radius, y + radius, r, g, b, a, radius, -90, 0.25, thickness)
                renderer.circle_outline((x + w) - radius, (y + h) - radius, r, g, b, a, radius, 0, 0.25, thickness)
            end
        end,
        clamp = function(x, min, max) return ((x < min) and min) or ((x > max) and max) or x end,
        table_contains = function(tbl, value)
            for i = 1, #tbl do
                if tbl[i] == value then return true end
            end
            return false
        end,
        setAATab = function(ref)
            ui.set_visible(refs.enabled, ref)
            ui.set_visible(refs.pitch[1], ref)
            ui.set_visible(refs.pitch[2], ref)
            ui.set_visible(refs.roll, ref)
            ui.set_visible(refs.slowmotion, ref)
            ui.set_visible(refs.Legmoves, ref)
            ui.set_visible(refs.yawBase, ref)
            ui.set_visible(refs.yaw[1], ref)
            ui.set_visible(refs.yaw[2], ref)
            ui.set_visible(refs.yawJitter[1], ref)
            ui.set_visible(refs.yawJitter[2], ref)
            ui.set_visible(refs.bodyYaw[1], ref)
            ui.set_visible(refs.bodyYaw[2], ref)
            ui.set_visible(refs.freeStand[1], ref)
            ui.set_visible(refs.freeStand[2], ref)
            ui.set_visible(refs.fsBodyYaw, ref)
            ui.set_visible(refs.edgeYaw, ref)
            ui.set_visible(refs.flLimit, ref)
            ui.set_visible(refs.flamount, ref)
            ui.set_visible(refs.flVariance, ref)
            ui.set_visible(refs.flenabled, ref)
            ui.set_visible(refs.AAfake, ref)
            ui.set_visible(refs.OSAAA, ref)
        end,
        findDist = function(x1, y1, z1, x2, y2, z2) return math.sqrt(((x2 - x1) ^ 2) + ((y2 - y1) ^ 2) + ((z2 - z1) ^ 2)) end,
        resetAATab = function()
            ui.set(refs.OSAAa, false)
            ui.set(refs.enabled, false)
            ui.set(refs.pitch[1], "Off")
            ui.set(refs.pitch[2], 0)
            ui.set(refs.roll, 0)
            ui.set(refs.slowmotion, false)
            ui.set(refs.yawBase, "local view")
            ui.set(refs.yaw[1], "Off")
            ui.set(refs.yaw[2], 0)
            ui.set(refs.yawJitter[1], "Off")
            ui.set(refs.yawJitter[2], 0)
            ui.set(refs.bodyYaw[1], "Off")
            ui.set(refs.bodyYaw[2], 0)
            ui.set(refs.freeStand[1], false)
            ui.set(refs.freeStand[2], "On hotkey")
            ui.set(refs.fsBodyYaw, false)
            ui.set(refs.edgeYaw, false)
            ui.set(refs.flLimit, false)
            ui.set(refs.flamount, false)
            ui.set(refs.flenabled, false)
            ui.set(refs.flVariance, false)
            ui.set(refs.AAfake, false)
        end,
        type_from_string = function(input)
            if type(input) ~= "string" then return input end
            local value = input:lower()
            if value == "true" then
                return true
            elseif value == "false" then
                return false
            elseif tonumber(value) ~= nil then
                return tonumber(value)
            else
                return tostring(input)
            end
        end,
        lerp = function(start, vend, time) return start + ((vend - start) * time) end,
        vec_angles = function(angle_x, angle_y)
            local sy = math.sin(math.rad(angle_y))
            local cy = math.cos(math.rad(angle_y))
            local sp = math.sin(math.rad(angle_x))
            local cp = math.cos(math.rad(angle_x))
            return cp * cy, cp * sy, -sp
        end,
        hex = function(arg)
            local result = "\a"
            for key, value in next, arg do
                local output = ""
                while value > 0 do
                    local index = math.fmod(value, 16) + 1
                    value = math.floor(value / 16)
                    output = string.sub("0123456789ABCDEF", index, index) .. output
                end

                if #output == 0 then
                    output = "00"
                elseif #output == 1 then
                    output = "0" .. output
                end

                result = result .. output
            end
            return result .. "FF"
        end,
        split = function(inputstr, sep)
            if sep == nil then sep = "%s" end
            local t = {}
            for str in string.gmatch(inputstr, "([^" .. sep .. "]+)") do
                table.insert(t, str)
            end
            return t
        end,
        RGBAtoHEX = function(redArg, greenArg, blueArg, alphaArg) return string.format("%.2x%.2x%.2x%.2x", redArg, greenArg, blueArg, alphaArg) end,
        create_color_array = function(r, g, b, string)
            local colors = {}
            for i = 0, #string do
                local color = {r, g, b, 255 * math.abs(1 * math.cos(((2 * math.pi * globals.curtime()) / 4) + ((i * 5) / 30)))}
                table.insert(colors, color)
            end
            return colors
        end,
        textArray = function(string)
            local result = {}
            for i = 1, #string do
                result[i] = string.sub(string, i, i)
            end
            return result
        end,
        includes = function(tbl, value)
            for i = 1, #tbl do
                if tbl[i] == value then return true end
            end
            return false
        end,
        gradient_text = function(r1, g1, b1, a1, r2, g2, b2, a2, text)
            local output = ""
            local len = #text - 1
            local rinc = (r2 - r1) / len
            local ginc = (g2 - g1) / len
            local binc = (b2 - b1) / len
            local ainc = (a2 - a1) / len
            for i = 1, len + 1 do
                output = output .. ("\a%02x%02x%02x%02x%s"):format(r1, g1, b1, a1, text:sub(i, i))
                r1 = r1 + rinc
                g1 = g1 + ginc
                b1 = b1 + binc
                a1 = a1 + ainc
            end
            return output
        end,
        time_to_ticks = function(t) return math.floor(0.5 + (t / globals.tickinterval())) end,
        headVisible = function(enemy)
            local_player = entity.get_local_player()
            if local_player == nil then return end
            local ex, ey, ez = entity.hitbox_position(enemy, 1)
            local hx, hy, hz = entity.hitbox_position(local_player, 1)
            local head_fraction, head_entindex_hit = client.trace_line(enemy, ex, ey, ez, hx, hy, hz)
            if (head_entindex_hit == local_player) or (head_fraction == 1) then
                return true
            else
                return false
            end
        end
    }

    local legsSaved = false
    local legsTypes = {
        [1] = "Off",
        [2] = "Always slide",
        [3] = "Never slide"
    }

    local ground_ticks = 0
    client.set_event_callback("pre_render", function()
        if not ui.get(animationsEnabled) then return end
        if not entity.get_local_player() then return end
        local flags = entity.get_prop(entity.get_local_player(), "m_fFlags")
        ground_ticks = ((bit.band(flags, 1) == 0) and 0) or ((ground_ticks < 5) and (ground_ticks + 1)) or ground_ticks
        if func.table_contains(ui.get(animations), "Static legs") then entity.set_prop(entity.get_local_player(), "m_flPoseParameter", 1, 6) end
        if func.table_contains(ui.get(animations), "Kinguru") then
            entity.set_prop(entity.get_local_player(), "m_flPoseParameter", math.random(0, 10) / 10, 3)
            entity.set_prop(entity.get_local_player(), "m_flPoseParameter", math.random(0, 10) / 10, 7)
            entity.set_prop(entity.get_local_player(), "m_flPoseParameter", math.random(0, 10) / 10, 6)
        end

        if func.table_contains(ui.get(animations), "Leg fucker") then
            if not legsSaved then legsSaved = ui.get(refs.legMovement) end
            ui.set_visible(refs.legMovement, false)
            if func.table_contains(ui.get(animations), "Leg fucker") then
                ui.set(refs.legMovement, legsTypes[math.random(1, 3)])
                entity.set_prop(entity.get_local_player(), "m_flPoseParameter", 9, 0)
            end
        elseif (legsSaved == "Off") or (legsSaved == "Always slide") or (legsSaved == "Never slide") then
            ui.set_visible(refs.legMovement, true)
            ui.set(refs.legMovement, legsSaved)
            legsSaved = false
        end

        if func.table_contains(ui.get(animations), "0 pitch on landing") then
            ground_ticks = ((bit.band(flags, 1) == 1) and (ground_ticks + 1)) or 0
            if (ground_ticks > 20) and (ground_ticks < 150) then entity.set_prop(entity.get_local_player(), "m_flPoseParameter", 0.5, 12) end
        end

        if func.table_contains(ui.get(animations), "Moonwalk") then
            if not legsSaved then legsSaved = ui.get(refs.legMovement) end
            ui.set_visible(refs.legMovement, false)
            entity.set_prop(entity.get_local_player(), "m_flPoseParameter", 0, 7)
            local me = entity.get_local_player()
            local onground = bit.band(flags, 1) ~= 0
            ui.set(refs.legMovement, "Off")
        elseif (legsSaved == "Off") or (legsSaved == "Always slide") or (legsSaved == "Never slide") then
            ui.set_visible(refs.legMovement, true)
            ui.set(refs.legMovement, legsSaved)
            legsSaved = false
        end
    end)

    import_btn = ui.new_button("AA", "Anti-aimbot angles", "Import", function() import(clipboard.get()) end)
    export_btn = ui.new_button("AA", "Anti-aimbot angles", "Export", function()
        local code = {{}}
        for i, integers in pairs(data.integers) do
            table.insert(code[1], ui.get(integers))
        end

        clipboard.set(base64.encode(json.stringify(code)))
        client.color_log(124, 252, 0, "anyagang      ~\0")
        client.color_log(200, 200, 200, " config successfully exported!")
    end)

    default_btn = ui.new_button("AA", "Anti-aimbot angles", "Default", function() import("W1siSW4gYWlyIix0cnVlLHRydWUsdHJ1ZSxmYWxzZSx0cnVlLHRydWUsdHJ1ZSx0cnVlLHRydWUsZmFsc2UsIk9mZiIsIkRvd24iLCJEb3duIiwiT2ZmIiwiRG93biIsIkRvd24iLCJEb3duIiwiRG93biIsIkRvd24iLCJPZmYiLDAsMCwwLDAsMCwwLDAsMCwwLDAsIkxvY2FsIHZpZXciLCJMb2NhbCB2aWV3IiwiQXQgdGFyZ2V0cyIsIkxvY2FsIHZpZXciLCJBdCB0YXJnZXRzIiwiQXQgdGFyZ2V0cyIsIkF0IHRhcmdldHMiLCJBdCB0YXJnZXRzIiwiQXQgdGFyZ2V0cyIsIkxvY2FsIHZpZXciLCJPZmYiLCIxODAiLCIxODAiLCJPZmYiLCIxODAiLCIxODAiLCIxODAiLCIxODAiLCIxODAiLCJPZmYiLDAsLTI2LDAsMCwtMzYsMCwyOSwtMjgsMCwwLDAsMzAsMCwwLDI4LDAsLTIyLDQyLDAsMCwwLDAsMCwwLDAsMCw3LDAsMCwwLCJPZmYiLCJEZWxheSIsIkRlbGF5IiwiT2ZmIiwiRGVsYXkiLCJEZWxheSIsIkRlbGF5IiwiRGVsYXkiLCJEZWxheSIsIk9mZiIsMCwtMzMsLTMzLDAsLTUyLC0zOCwtMjQsLTM1LC0zMiwwLDAsNDIsNDQsMCw0MiwzMiwzMywyNCwzNiwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMiw2LDcsMiw0LDcsOCw0LDYsMiwiT2ZmIiwiT2ZmIiwiT2ZmIiwiT2ZmIiwiT2ZmIiwiT2ZmIiwiT2ZmIiwiT2ZmIiwiT2ZmIiwiT2ZmIiwwLDAsMCwwLDAsMCwwLDAsMCwwLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLHRydWUsdHJ1ZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSwiT2ZmIiwiRG93biIsIkRvd24iLCJPZmYiLCJEb3duIiwiRG93biIsIkRvd24iLCJEb3duIiwiRG93biIsIk9mZiIsMSwwLDAsMCwtODksLTg5LC00MSwtODksMCwwLDEsMCwwLDAsLTg5LC04OSwtNDEsLTg5LDAsMCwiMTgwIiwiU3BpbiIsIlNwaW4iLCIxODAiLCJTcGluIiwiU3BpbiIsIlNwaW4iLCJTcGluIiwiU2lkZXdheXMiLCIxODAiLDEsMCwwLDAsLTg5LC04OSwtNDEsLTg5LDAsMCx0cnVlLHRydWUsdHJ1ZSx7fSx7fSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV1d") end)
    client.set_event_callback("paint_ui", function()
        if entity.get_local_player() == nil then cheked_ticks = 0 end
        ui.set_visible(export_btn, ui.get(current_tab) == "Config")
        ui.set_visible(import_btn, ui.get(current_tab) == "Config")
        ui.set_visible(default_btn, ui.get(current_tab) == "Config")
    end)

    ui.set_callback(console_filter, function()
        cvar.con_filter_text:set_string("cool text")
        cvar.con_filter_enable:set_int(1)
    end)

-- auto teleport from bluhgang (any weapon)
do
    dt_state = nil
    dt_was_off = nil
    
    function can_teleport()
        lp = entity.get_local_player()
        if not lp or not entity.is_alive(lp) then return false end
        
        -- Убрана проверка на оружие! Работает с любым
        
        vel_z = entity.get_prop(lp, "m_vecVelocity[2]") or 0
        if vel_z <= 18 then return false end
        
        for _, enemy in ipairs(entity.get_players(true)) do
            if entity.is_enemy(enemy) and entity.is_alive(enemy) then
                x, y, z = entity.hitbox_position(enemy, 1)
                if client.visible(x, y, z + 20) then
                    return true
                end
            end
        end
        return false
    end
    
    function do_teleport(cmd)
        if not ui.get(unsafecharhge) then
            if dt_was_off and dt_state ~= nil then
                ui.set(ref.doubletap[1], dt_state)
                dt_was_off = nil
                dt_state = nil
            end
            return
        end
        
        if can_teleport() then
            if dt_was_off == nil then
                dt_state = ui.get(ref.doubletap[1])
                dt_was_off = true
            end
            ui.set(ref.doubletap[1], false)
            cmd.in_jump = 0
            cmd.discharge_pending = true
            client.delay_call(0.01, function()
                if dt_state ~= nil and ui.get(unsafecharhge) then
                    ui.set(ref.doubletap[1], dt_state)
                    dt_was_off = nil
                    dt_state = nil
                end
            end)
        elseif dt_was_off and dt_state ~= nil then
            ui.set(ref.doubletap[1], dt_state)
            dt_was_off = nil
            dt_state = nil
        end
    end
    
    client.set_event_callback("setup_command", do_teleport)
end
    local console_command = client.exec
    local client_userid_to_entindex = client.userid_to_entindex
    local client_draw_debug_text = client.draw_debug_text
    local client_draw_hitboxes = client.draw_hitboxes
    local client_random_int = client.random_int
    local client_random_float = client.random_float
    local client_draw_text = client.draw_text
    local client_draw_rectangle = client.draw_rectangle
    local client_draw_line = client.draw_line
    local client_world_to_screen = client.world_to_screen
    local client_is_local_player = client.is_local_player
    local client_delay_call = client.delay_call
    local clatency = client.latency
    local indicator = client.draw_indicator
    local client_visible = client.visible
    local cvar_is = client.get_cvar
    local cvar = client.set_cvar
    local entity_get_local_player, entity_is_enemy, entity_hitbox_position, entity_get_player_name, entity_get_steam64, entity_get_bounding_box, entity_get_all, entity_set_prop = entity.get_local_player, entity.is_enemy, entity.hitbox_position, entity.get_player_name, entity.get_steam64, entity.get_bounding_box, entity.get_all, entity.set_prop
    local entity_get_local_player = entity.get_local_player
    local entity_get_all = entity.get_all
    local entity_get_players = entity.get_players
    local entity_get_classname = entity.get_classname
    local entity_set_prop = entity.set_prop
    local entity_get_prop = entity.get_prop
    local entity_is_enemy = entity.is_enemy
    local entity_get_player_name = entity.get_player_name
    local entity_get_player_weapon = entity.get_player_weapon
    local delay_time = 0
    local client_draw_rectangle = client.draw_rectangle
    local client_draw_text = client.draw_text
    local ui_new_checkbox = ui.new_checkbox
    local ui_new_combobox = ui.new_combobox
    local ui_get = ui.get
    local math_fmod = math.fmod
    local screen_width, screen_height = client.screen_size()
    local to_number = tonumber
    local math_floor = math.floor
    local math_random = math.random
    local table_insert = table.insert
    local table_remove = table.remove
    local table_size = table.getn
    local string_format = string.format
    local chat_spammer = {}
chat_spammer.phrases = {
    kill = {
        {"12"}, 
        {"это лц хуевый"}, 
        {"сельчанин спи"}, 
        {"1"}, 
        {"1e", "гремлин ебаный"}, 
        {"1", "толстый уебок"}, 
        {"1 by УПОЛНОМОЧЕННЫЙ КАЗАХ"}, 
        {"доминация"}, 
        {"12"}, 
        {"скачать сиськи дексти онлайн без регистрации"}, 
        {"пропагандирую анягенг"}, 
        {"ez", "owned"}, 
        {"Load 'ANYAGANG LIVE' . . . Успешно!"}, 
        {"1e"}, 
        {"@everyone", "вы видели как я его выебал?"}, 
        {"опять ты упал", "ливни уже нахуй с сервера"}, 
        {"помиссай", "сын шлюхи"}, 
        {"ё1"}, 
        {"опять в моих ногах", "аашки в анягенге бустят"}, 
        {"с дефолт пресетом ебу тебя клопа ебаного"}, 
        {"с чем ебу тебя?", "анягенг луа называется"}, 
        {"1ь"}, 
        {" $$$ ANYAGANG $$$"}, 
        {"купи и не позорься шакал ебаный - dsc.gg/anyagang"}, 
        {"иди работай в доставке хач ебаный", "а то луашку не купил, конфиг не купил, а я то голодный"}, 
        {"членяку пососал", "опять", "ебанат когда уже играть научишься"}, 
        {" WORLD FUCK HAHA ANYAGANG LUA"}, 
        {"ебать изи убил", "спросишь как?", "я с анягенг"}, 
        {"Unload 'ANYAGANG LIVE' . . . Невозможно!"}, 
        {"ё1"}, 
        {"W I N N E R WITH A N Y A G A N G"}
    },
    death = {
        {"gbljh t,fysq", "пидор ебаный"}, 
        {"говно ебаное", "фу"}, 
        {"ненене", "везучий долбаеб"}, 
        {"да ебаная терпила", "фу блять"}, 
        {"iq iq", "сын шлюхи"}, 
        {"понадейся на чит", "хуевый"}, 
        {"ДА ФУ", "СЫН ШЛЮХИ", "ЕБАНОЙ"}, 
        {"говно ебаное", "без анягенга"}, 
        {"шлюха"}, 
        {"бомж с статиками"}, 
        {",JV;", "ЗАРЫГАННАЯ ШЛЮХА"}, 
        {"фу нахуй", "я тебя забаню ща", "идиот"}, 
        {"фу бля", "уебище", "закрой ебало"}, 
        {"эх эх", "анягенг не спасла"}, 
        {"педик хуевый", "мать ебал твою", "моча"}, 
        {"да гоблин ебаный", "что ты делаешь"}, 
        {"ЫЗВЗХПХЫЗ", "НУ ЧТО ЗА БОТ"}, 
        {"ну бот", "везучий", "я те глотку вырву"}
    }
}

chat_spammer.phrase_count = {
    death = 0,
    kill = 0
}

    chat_spammer.handle = function(e)
        if not ui.get(trashTalk) then return end
        local player = entity.get_local_player()
        if player == nil then return end
        local victim = client.userid_to_entindex(e.userid)
        if victim == nil then return end
        local attacker = client.userid_to_entindex(e.attacker)
        if attacker == nil then return end
        chat_spammer.phrase_count.death = chat_spammer.phrase_count.death + 1
        if chat_spammer.phrase_count.death > #chat_spammer.phrases.death then chat_spammer.phrase_count.death = 1 end
        chat_spammer.phrase_count.kill = chat_spammer.phrase_count.kill + 1
        if chat_spammer.phrase_count.kill > #chat_spammer.phrases.kill then chat_spammer.phrase_count.kill = 1 end
        local phrase = {
            death = chat_spammer.phrases.death[chat_spammer.phrase_count.death],
            kill = chat_spammer.phrases.kill[chat_spammer.phrase_count.kill]
        }

        if func.includes(ui.get(trashTalk_vibor), "Kill") then
            if (attacker == player) and (victim ~= player) then
                for i = 1, #phrase.kill do
                    client.delay_call(i * 2, function() client.exec(("say %s"):format(phrase.kill[i])) end)
                end
            end
        end

        if func.includes(ui.get(trashTalk_vibor), "Death") then
            if (attacker ~= player) and (victim == player) then
                for i = 1, #phrase.death do
                    client.delay_call(i * 2, function() client.exec(("say %s"):format(phrase.death[i])) end)
                end
            end
        end
    end

    client.set_event_callback("player_death", chat_spammer.handle)
    client.set_event_callback("setup_command", function()
        if entity.get_local_player() == nil then return end
        gamerulesproxy = entity.get_all("CCSGameRulesProxy")[1]
        warmup = entity.get_prop(gamerulesproxy, "m_bWarmupPeriod")
        if ui.get(settings.warmup_disabler) and (warmup == 1) then
            ui.set(reference.body_yaw[1], "Off")
            ui.set(reference.yaw[2], math.random(-180, 180))
            ui.set(reference.yaw_jitter[1], "Random")
            ui.set(reference.pitch[1], "Random")
        end
    end)

    local clantag_anim = function(text, indices)
        local text_anim = "               " .. text .. ""
        local tickinterval = globals.tickinterval()
        local tickcount = globals.tickcount() + func.time_to_ticks(client.latency())
        local i = tickcount / func.time_to_ticks(0.2)
        i = math.floor(i % #indices)
        i = indices[i + 1] + 1
        return string.sub(text_anim, i, i + 15)
    end

    local clantag = {
        steam = steamworks.ISteamFriends,
        prev_ct = "",
        orig_ct = "",
        enb = false
    }

    local function get_original_clantag()
        local clan_count = clantag.steam.GetClanCount()
        for i = 0, clan_count do
            local group_id = clantag.steam.GetClanByIndex(i)
            if group_id == clan_id then return clantag.steam.GetClanTag(group_id) end
        end
    end

    local function clantag_set()
        local lua_name = "anyagang"
        if ui.get(clanTag) then
            if ui.get(ui.reference("Misc", "Miscellaneous", "Clan tag spammer")) then return end
            local clan_tag = clantag_anim(lua_name, {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11, 11, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25})
            if entity.get_prop(entity.get_game_rules(), "m_gamePhase") == 5 then
                clan_tag = clantag_anim("anyagang", {10})
                client.set_clan_tag(clan_tag)
            elseif entity.get_prop(entity.get_game_rules(), "m_timeUntilNextPhaseStarts") ~= 0 then
                clan_tag = clantag_anim("anyagang", {10})
                client.set_clan_tag(clan_tag)
            elseif clan_tag ~= clantag.prev_ct then
                client.set_clan_tag(clan_tag)
            end

            clantag.prev_ct = clan_tag
            clantag.enb = true
        elseif clantag.enb == true then
            client.set_clan_tag(get_original_clantag())
            clantag.enb = false
        end
    end

    clantag.paint = function() if entity.get_local_player() ~= nil then if (globals.tickcount() % 2) == 0 then clantag_set() end end end
    clantag.run_command = function(e) if entity.get_local_player() ~= nil then if e.chokedcommands == 0 then clantag_set() end end end
    clantag.player_connect_full = function(e) if client.userid_to_entindex(e.userid) == entity.get_local_player() then clantag.orig_ct = get_original_clantag() end end
    clantag.shutdown = function() client.set_clan_tag(get_original_clantag()) end
    client.set_event_callback("paint", clantag.paint)
    client.set_event_callback("run_command", clantag.run_command)
    client.set_event_callback("player_connect_full", clantag.player_connect_full)
    client.set_event_callback("shutdown", clantag.shutdown)


------------------------------
-- Модуль логов выстрелов

-- Объявляем переменные, если их нет
if hit_data_store == nil then
    hit_data_store = {}
end

if hitgroup_names == nil then
    hitgroup_names = {"generic", "head", "chest", "stomach", "left arm", "right arm", "left leg", "right leg", "neck", "?", "gear"}
end

client.set_event_callback("aim_fire", function(e)
    if not ui.get(master_switch) then return end
    
    -- Сохраняем тик выстрела и тик цели
    hit_data_store[e.id] = {
        handle_time = globals.realtime(),
        hit_chance = math.max(math.floor((e.hit_chance or 0) + 0.5), 0),
        fire_tick = globals.tickcount(),  -- тик когда произошёл выстрел
        target_tick = e.tick,             -- тик цели (важно для бектрека!)
        damage = e.damage,
        target = e.target
    }
end)

client.set_event_callback("aim_hit", function(e)
    if not ui.get(master_switch) or (e.id == nil) then return end
    
    local group = hitgroup_names[e.hitgroup + 1] or "?"
    local pre_data = hit_data_store[e.id]
    
    if not pre_data then return end
    
    local hit_chance = pre_data.hit_chance or 0
    
    -- Вычисляем бектрек: разница между тиком выстрела и тиком цели
    local backtrack = 0
    if pre_data.fire_tick and pre_data.target_tick then
        backtrack = pre_data.fire_tick - pre_data.target_tick
        if backtrack < 0 then backtrack = 0 end
    end
    
    local target_name = entity.get_player_name(e.target)
    local remaining_hp = entity.get_prop(e.target, "m_iHealth")
    
    -- Консоль (одна строка)
    local console_msg = string.format("Hit %s in %s for %d dmg (%d hp)", target_name, group, e.damage, remaining_hp)
    if hit_chance > 0 then
        console_msg = console_msg .. string.format(" (hs=%d%%)", hit_chance)
    end
    if backtrack > 0 then
        console_msg = console_msg .. string.format(" (bt=%d)", backtrack)
    end
    client.color_log(124, 252, 0, "anyagang ~ " .. console_msg)
    
    -- Экран
    local extra = ""
    if hit_chance > 0 then
        extra = string.format(" (hs=%d%%)", hit_chance)
    end
    if backtrack > 0 then
        extra = extra .. string.format(" (bt=%d)", backtrack)
    end
    local screen_text = string.format("Hit %s in %s for %d dmg (%d hp)%s", target_name, group, e.damage, remaining_hp, extra)
    new_notify(screen_text, 124, 252, 0, 255)
    
    hit_data_store[e.id] = nil
end)

client.set_event_callback("aim_miss", function(e)
    if not ui.get(master_switch) then return end
    
    local group = hitgroup_names[e.hitgroup + 1] or "?"
    local pre_data = hit_data_store[e.id]
    
    if not pre_data then return end
    
    local hit_chance = pre_data.hit_chance or 0
    
    -- Вычисляем бектрек: разница между тиком выстрела и тиком цели
    local backtrack = 0
    if pre_data.fire_tick and pre_data.target_tick then
        backtrack = pre_data.fire_tick - pre_data.target_tick
        if backtrack < 0 then backtrack = 0 end
    end
    
    local target_name = entity.get_player_name(e.target)
    local miss_reason = e.reason
    if miss_reason == "?" then miss_reason = "spread" end
    
    -- Консоль (одна строка)
    local console_msg = string.format("Missed %s (%s) due to %s", target_name, group, miss_reason)
    if hit_chance > 0 then
        console_msg = console_msg .. string.format(" (hs=%d%%)", hit_chance)
    end
    if backtrack > 0 then
        console_msg = console_msg .. string.format(" (bt=%d)", backtrack)
    end
    client.color_log(219, 99, 96, "anyagang ~ " .. console_msg)
    
    -- Экран
    local extra = ""
    if hit_chance > 0 then extra = string.format(" (hs=%d%%)", hit_chance) end
    if backtrack > 0 then extra = extra .. string.format(" (bt=%d)", backtrack) end
    local screen_text = string.format("Missed %s (%s) due to %s%s", target_name, group, miss_reason, extra)
    new_notify(screen_text, 219, 99, 96, 255)
    
    hit_data_store[e.id] = nil
end)

client.set_event_callback("paint", function()
    local current_time = globals.realtime()
    for id, data in pairs(hit_data_store) do
        if current_time - data.handle_time > 5 then
            hit_data_store[id] = nil
        end
    end
end)
---------------------------
---------------------------
    client.set_event_callback("paint_ui", function()
        local r, g, b, a = ui.get(current_color)
        color_r = r
        color_g = g
        color_b = b
        color_a = a
        ui.set(text1, text_fade_animation(3, r, g, b, a, "A N Y A G A N G"))
        ui.set(text2, text_fade_animation(3, r, g, b, a, steamname))
        ui.set(text3, text_fade_animation(3, r, g, b, a, "last upd ~ 23.04.2026"))
        ctx.notify.render()
    end)
---------------------------

    client.set_event_callback("paint", function() end)
    client.set_event_callback("setup_command", function(cmd)
        if not ui.get(recharge) then return end
        local lp = entity.get_local_player()
        if not lp or not entity.is_alive(lp) then return end
        local weapon = entity.get_player_weapon(lp)
        local is_revolver = weapon and weapons(weapon).is_revolver
        local recharge_delay = (is_revolver and 17) or 14
        local dt_active = ui.get(ref.doubletap[2])
        local os_active = ui.get(reference.on_shot_anti_aim[2])
        if dt_active or os_active then
            if globals.tickcount() >= (recharge_timer + recharge_delay) then
                ui.set(ref.aimbot_enabled, true)
            else
                ui.set(ref.aimbot_enabled, false)
            end
        else
            recharge_timer = globals.tickcount()
            ui.set(ref.aimbot_enabled, true)
        end
    end)

--------------------------------

local femboy_visible = false
local femboy_x = 20
local femboy_y = 100
local femboy_w = 205
local femboy_h = 205

local animation_time = 0
local blink_timer = 0
local is_blinking = false

local function draw_outline(x, y, w, h, r, g, b, a)
    renderer.rectangle(x, y, w, 2, r, g, b, a)
    renderer.rectangle(x, y + h - 2, w, 2, r, g, b, a)
    renderer.rectangle(x, y, 2, h, r, g, b, a)
    renderer.rectangle(x + w - 2, y, 2, h, r, g, b, a)
end

local function draw_gradient_rect(x, y, w, h, r1, g1, b1, r2, g2, b2, a)
    for i = 0, h do
        local t = i / h
        local r = r1 + (r2 - r1) * t
        local g = g1 + (g2 - g1) * t
        local b = b1 + (b2 - b1) * t
        renderer.rectangle(x, y + i, w, 1, r, g, b, a)
    end
end

local function draw_head(x, y, w, h, pulse, is_blinking, time)
    -- Фон лица
    draw_gradient_rect(x + 15, y + 15, w - 30, h - 38, 255, 200, 210, 255, 220, 230, 200)

    -- Волосы
    draw_gradient_rect(x + 20, y + 10, w - 40, 40, 80, 50, 120, 140, 80, 150, 220)
    draw_gradient_rect(x + 15, y + 20, w - 30, 50, 90, 60, 130, 150, 90, 160, 220)
    renderer.rectangle(x + 18, y + 50, 20, 70, 100, 70, 140, 220)
    renderer.rectangle(x + w - 38, y + 50, 20, 70, 100, 70, 140, 220)

    -- Кошачьи уши
    renderer.triangle(x + 30, y + 15, x + 50, y - 5, x + 70, y + 15, 150, 120, 200, 255)
    renderer.triangle(x + w - 70, y + 15, x + w - 50, y - 5, x + w - 30, y + 15, 150, 120, 200, 255)
    renderer.triangle(x + 40, y + 15, x + 50, y + 2, x + 60, y + 15, 255, 180, 220, 255)
    renderer.triangle(x + w - 60, y + 15, x + w - 50, y + 2, x + w - 40, y + 15, 255, 180, 220, 255)

    -- Лицо
    renderer.rectangle(x + 40, y + 40, w - 80, 90, 255, 220, 200, 255)

    -- Глаза
    local eye_y = y + 65
    local eye_alpha = 255
    if is_blinking then eye_alpha = 0 end
    renderer.rectangle(x + 55, eye_y, 25, 18, 50, 40, 90, eye_alpha)
    renderer.rectangle(x + w - 80, eye_y, 25, 18, 50, 40, 90, eye_alpha)
    if not is_blinking then
        renderer.rectangle(x + 60, eye_y + 4, 6, 6, 255, 255, 255, 220)
        renderer.rectangle(x + w - 75, eye_y + 4, 6, 6, 255, 255, 255, 220)
        renderer.rectangle(x + 72, eye_y + 9, 4, 4, 255, 255, 255, 180)
        renderer.rectangle(x + w - 63, eye_y + 9, 4, 4, 255, 255, 255, 180)
    end
    renderer.rectangle(x + 52, eye_y - 2, 30, 2, 40, 30, 80, 255)
    renderer.rectangle(x + w - 82, eye_y - 2, 30, 2, 40, 30, 80, 255)

    -- Румянец
    renderer.rectangle(x + 48, y + 90, 20, 8, 255, 150, 170, 180)
    renderer.rectangle(x + w - 68, y + 90, 20, 8, 255, 150, 170, 180)

    -- Рот
    renderer.rectangle(x + 80, y + 105, 20, 4, 220, 100, 120, 255)
    renderer.rectangle(x + 83, y + 109, 14, 2, 220, 100, 120, 255)

    -- Сердечко
    local heart_scale = 0.7 + pulse * 0.4
    local heart_size = 12 * heart_scale
    local heart_x = x + w - 25
    local heart_y = y + 10
    renderer.circle(heart_x - 4, heart_y - 3, 255, 80, 120, 200, heart_size/2)
    renderer.circle(heart_x + 4, heart_y - 3, 255, 80, 120, 200, heart_size/2)
    renderer.rectangle(heart_x - 4, heart_y - 3, 8, heart_size, 255, 80, 120, 200)
    renderer.rectangle(heart_x - 2, heart_y - 6, 4, heart_size + 3, 255, 80, 120, 200)
end

local function draw_femboy()
    if not femboy_visible then return end

    animation_time = animation_time + globals.frametime()
    local pulse = (math.sin(animation_time * 3) + 1) / 2
    local glow = math.sin(animation_time * 2) * 0.3 + 0.7

    blink_timer = blink_timer + globals.frametime()
    if blink_timer > 2.0 then
        is_blinking = true
        if blink_timer > 2.1 then
            is_blinking = false
            blink_timer = 0
        end
    end

    draw_gradient_rect(femboy_x, femboy_y, femboy_w, femboy_h,
                       40 + 20 * glow, 20, 60 + 30 * glow,
                       30, 15, 80 + 40 * glow, 230)

    local border_r = 255
    local border_g = 100 + 55 * pulse
    local border_b = 150 + 50 * pulse
    draw_outline(femboy_x, femboy_y, femboy_w, femboy_h, border_r, border_g, border_b, 255)

    local corner = 12
    renderer.rectangle(femboy_x, femboy_y, corner, 2, border_r, border_g, border_b, 255)
    renderer.rectangle(femboy_x, femboy_y, 2, corner, border_r, border_g, border_b, 255)
    renderer.rectangle(femboy_x + femboy_w - corner, femboy_y, corner, 2, border_r, border_g, border_b, 255)
    renderer.rectangle(femboy_x + femboy_w - 2, femboy_y, 2, corner, border_r, border_g, border_b, 255)
    renderer.rectangle(femboy_x, femboy_y + femboy_h - 2, corner, 2, border_r, border_g, border_b, 255)
    renderer.rectangle(femboy_x, femboy_y + femboy_h - corner, 2, corner, border_r, border_g, border_b, 255)
    renderer.rectangle(femboy_x + femboy_w - corner, femboy_y + femboy_h - 2, corner, 2, border_r, border_g, border_b, 255)
    renderer.rectangle(femboy_x + femboy_w - 2, femboy_y + femboy_h - corner, 2, corner, border_r, border_g, border_b, 255)

    draw_head(femboy_x, femboy_y, femboy_w, femboy_h, pulse, is_blinking, animation_time)

    local text_alpha = 150 + 105 * pulse
    renderer.text(femboy_x + femboy_w/2, femboy_y + femboy_h - 35,
                  border_r, border_g, border_b, text_alpha, "cb", 0, "67")

    local text_alpha = 150 + 105 * pulse
    renderer.text(femboy_x + femboy_w/2, femboy_y + femboy_h - 10,
                  border_r, border_g, border_b, text_alpha, "cb", 0, "🐱 FEMBOY 🐱")

    local time = globals.realtime()
    for i = 1, 3 do
        local offset = time * 2.5 + i
        local x_offset = math.sin(offset) * 10
        local y_offset = math.cos(offset * 1.2) * 6
        local heart_alpha = 150 + math.sin(offset * 4) * 105
        local heart_x = femboy_x + 10 + x_offset + (i-1) * 50
        local heart_y = femboy_y + femboy_h - 45 + y_offset - i * 3   -- поднял на 10 пикселей
        renderer.text(heart_x, heart_y, 255, 80, 120, heart_alpha, "c", 0, "❤")
    end
end

local dragging = false
local drag_x, drag_y = 0, 0

local function handle_drag()
    if not femboy_visible then return end
    local mx, my = ui.mouse_position()
    local in_area = (mx >= femboy_x and mx <= femboy_x + femboy_w and
                     my >= femboy_y and my <= femboy_y + femboy_h)
    if ui.is_menu_open() then
        if client.key_state(1) then
            if not dragging and in_area then
                dragging = true
                drag_x = mx - femboy_x
                drag_y = my - femboy_y
            elseif dragging then
                femboy_x = mx - drag_x
                femboy_y = my - drag_y
                local sw, sh = client.screen_size()
                femboy_x = math.max(5, math.min(femboy_x, sw - femboy_w - 5))
                femboy_y = math.max(5, math.min(femboy_y, sh - femboy_h - 5))
            end
        else
            dragging = false
        end
    else
        dragging = false
    end
end

local function update_femboy_visibility()
    if femboypng then
        femboy_visible = ui.get(femboypng)
    end
end

if femboypng then
    ui.set_callback(femboypng, update_femboy_visibility)
end
update_femboy_visibility()

client.set_event_callback("paint", function()
    handle_drag()
    draw_femboy()
end)

client.color_log(255, 150, 200, "Stay Femboy")

-------------------------------------------
-- НОВЫЙ 3D HITMARKER (компактная версия)
-------------------------------------------
local shot_data_3d = {}

local function paint_3d_hitmarker()
    if not ui_get(damage_ind) then return end
    
    local size, size2 = 2.5, 2.5
    for tick, data in pairs(shot_data_3d) do
        if data.draw then
            if globals.curtime() >= data.time then
                data.alpha = data.alpha - 2
            end
            if data.alpha <= 0 then
                data.draw = false
            end
            
            local sx, sy = renderer.world_to_screen(data.x, data.y, data.z)
            if sx then
                renderer.line(sx + size, sy + size, sx + (size * size2), sy + (size * size2), 0, 0, 0, data.alpha)
                renderer.line(sx + size, sy + size, sx + (size * size2), sy + (size * size2), 255, 255, 255, math.max(0, data.alpha-35))
                renderer.line(sx - size, sy + size, sx - (size * size2), sy + (size * size2), 0, 0, 0, data.alpha)
                renderer.line(sx - size, sy + size, sx - (size * size2), sy + (size * size2), 255, 255, 255, math.max(0, data.alpha-35))
                renderer.line(sx + size, sy - size, sx + (size * size2), sy - (size * size2), 0, 0, 0, data.alpha)
                renderer.line(sx + size, sy - size, sx + (size * size2), sy - (size * size2), 255, 255, 255, math.max(0, data.alpha-35))
                renderer.line(sx - size, sy - size, sx - (size * size2), sy - (size * size2), 0, 0, 0, data.alpha)
                renderer.line(sx - size, sy - size, sx - (size * size2), sy - (size * size2), 255, 255, 255, math.max(0, data.alpha-35))
            end
        end
    end
end

local function player_hurt_3d(e)
    if not ui_get(damage_ind) then return end
    if client.userid_to_entindex(e.attacker) ~= entity.get_local_player() then return end
    
    local tick = globals.tickcount()
    local data = shot_data_3d[tick]
    if not data or not data.impacts then return end
    
    local hitgroups = {[1]={0,1},[2]={4,5,6},[3]={2,3},[4]={13,15,16},[5]={14,17,18},[6]={7,9,11},[7]={8,10,12}}
    local hitboxes = hitgroups[e.hitgroup]
    if not hitboxes then return end
    
    local hit, closest = nil, math.huge
    for i=1, #data.impacts do
        local impact = data.impacts[i]
        for j=1, #hitboxes do
            local x, y, z = entity.hitbox_position(client.userid_to_entindex(e.userid), hitboxes[j])
            local dist = math.sqrt((impact.x - x)^2 + (impact.y - y)^2 + (impact.z - z)^2)
            if dist < closest then
                hit, closest = impact, dist
            end
        end
    end
    
    if hit then
        shot_data_3d[tick] = {
            x = hit.x, y = hit.y, z = hit.z,
            time = globals.curtime() + 0.75,
            alpha = 255, draw = true,
            hs = e.hitgroup == 0 or e.hitgroup == 1
        }
    end
end

local function bullet_impact_3d(e)
    if not ui_get(damage_ind) then return end
    if client.userid_to_entindex(e.userid) ~= entity.get_local_player() then return end
    
    local tick = globals.tickcount()
    if not shot_data_3d[tick] then shot_data_3d[tick] = {impacts = {}} end
    table.insert(shot_data_3d[tick].impacts, {x = e.x, y = e.y, z = e.z})
end

local function round_start_3d()
    shot_data_3d = {}
end

client.set_event_callback("paint", paint_3d_hitmarker)
client.set_event_callback("player_hurt", player_hurt_3d)
client.set_event_callback("bullet_impact", bullet_impact_3d)
client.set_event_callback("round_start", round_start_3d)
end


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
    
const OWNER_ID = process.env.OWNER_ID;

// Проверка: или ты владелец, или у тебя роль админа
if (['gen', 'del', 'list', 'reset'].includes(interaction.commandName)) {
    const isOwner = interaction.user.id === OWNER_ID;
    const isAdmin = interaction.member.roles.cache.has(ADMIN_ROLE_ID);
    
    if (!isOwner && !isAdmin) {
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
