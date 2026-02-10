const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
const { Client, GatewayIntentBits } = require('discord.js');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'metaonfire';

const DATA_DIR = path.join(__dirname, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

const {
    DISCORD_CLIENT_ID,
    DISCORD_CLIENT_SECRET,
    DISCORD_REDIRECT_URI,
    SESSION_SECRET,
    DISCORD_BOT_TOKEN,
    DISCORD_GUILD_ID
} = process.env;

if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
    console.warn('Missing Discord OAuth env vars. See .env.example for required values.');
}

app.set('trust proxy', 1);

const presenceCache = new Map();
const lastOnlineCache = new Map();
let botClient = null;

function formatDateTime(date) {
    if (!date) {
        return 'Unknown';
    }
    return new Date(date).toLocaleString('it-IT', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function startBot() {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
        console.warn('Bot token or guild id missing; bot presence disabled.');
        return;
    }

    botClient = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildPresences
        ]
    });

    botClient.on('ready', () => {
        console.log(`Bot logged in as ${botClient.user.tag}`);
    });

    botClient.on('presenceUpdate', (oldPresence, newPresence) => {
        if (!newPresence || !newPresence.userId) {
            return;
        }
        const status = newPresence.status || 'offline';
        presenceCache.set(newPresence.userId, status);
        if (status !== 'offline') {
            lastOnlineCache.set(newPresence.userId, Date.now());
        } else if (oldPresence && oldPresence.status && oldPresence.status !== 'offline') {
            lastOnlineCache.set(newPresence.userId, Date.now());
        }
    });

    botClient.on('guildMemberAdd', (member) => {
        if (member && member.presence && member.presence.status) {
            presenceCache.set(member.id, member.presence.status);
            if (member.presence.status !== 'offline') {
                lastOnlineCache.set(member.id, Date.now());
            }
        }
    });

    await botClient.login(DISCORD_BOT_TOKEN);
}

app.use(
    session({
        secret: SESSION_SECRET || 'change-me-in-env',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax'
        }
    })
);

app.use(express.json());
app.use(express.static(path.join(__dirname)));

function ensureDataDir() {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadProducts() {
    try {
        const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (err) {
        return [];
    }
}

function saveProducts(products) {
    ensureDataDir();
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

function slugify(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .slice(0, 80);
}

function normalizeProduct(input) {
    const available = Boolean(input.available);
    const name = String(input.name || '').trim() || 'Unnamed';
    return {
        name,
        description: String(input.description || '').trim(),
        price: String(input.price || '').trim() || '—',
        originalPrice: String(input.originalPrice || '').trim(),
        image: String(input.image || '').trim(),
        badge: String(input.badge || '').trim(),
        status: String(input.status || '').trim() || (available ? 'Available' : 'Out of stock'),
        available,
        cta: String(input.cta || '').trim() || 'Buy Now',
        link: String(input.link || '').trim()
    };
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized' });
}

function getBaseUrl(req) {
    const protoHeader = req.headers['x-forwarded-proto'];
    const proto = Array.isArray(protoHeader) ? protoHeader[0] : protoHeader;
    const scheme = proto || req.protocol || 'http';
    return `${scheme}://${req.get('host')}`;
}

function getRedirectUri(req) {
    if (DISCORD_REDIRECT_URI) {
        return DISCORD_REDIRECT_URI;
    }
    return `${getBaseUrl(req)}/auth/discord/callback`;
}

function getDiscordAuthUrl(req) {
    const scopesEnv = process.env.DISCORD_SCOPES;
    const scopes = scopesEnv
        ? scopesEnv.split(/[,\s]+/).filter(Boolean)
        : ['identify'];
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID || '',
        redirect_uri: getRedirectUri(req),
        response_type: 'code',
        scope: scopes.join(' ')
    });
    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

function avatarUrl(user) {
    if (user.avatar) {
        const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
        return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=256`;
    }
    const defaultIndex = Number(BigInt(user.id) % 5n);
    return `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
}

function snowflakeToDate(id) {
    const DISCORD_EPOCH = 1420070400000n;
    const snowflake = BigInt(id);
    const timestamp = (snowflake >> 22n) + DISCORD_EPOCH;
    return new Date(Number(timestamp));
}

async function addUserToGuild(accessToken, userId) {
    if (!DISCORD_BOT_TOKEN || !DISCORD_GUILD_ID) {
        return false;
    }
    try {
        const res = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/members/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bot ${DISCORD_BOT_TOKEN}`
            },
            body: JSON.stringify({ access_token: accessToken })
        });
        if (!res.ok) {
            console.warn('Failed to add user to guild', await res.text());
            return false;
        }
        return true;
    } catch (err) {
        console.warn('Guild join error', err);
        return false;
    }
}

async function getPresenceInfo(userId) {
    if (!botClient || !DISCORD_GUILD_ID) {
        return { status: 'Unavailable (bot)', lastOnline: 'Unavailable (bot)' };
    }
    try {
        const guild = await botClient.guilds.fetch(DISCORD_GUILD_ID);
        const member = await guild.members.fetch(userId);
        const status = member.presence?.status || 'offline';
        presenceCache.set(userId, status);
        if (status !== 'offline') {
            lastOnlineCache.set(userId, Date.now());
        }
        const lastOnlineTs = lastOnlineCache.get(userId);
        const lastOnlineText = status === 'offline' ? formatDateTime(lastOnlineTs) : 'Online now';
        return { status, lastOnline: lastOnlineText };
    } catch (err) {
        return { status: 'Unavailable (bot)', lastOnline: 'Unavailable (bot)' };
    }
}

app.get('/auth/discord', (req, res) => {
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !DISCORD_REDIRECT_URI) {
        return res.status(500).send('Missing Discord OAuth env vars. Check .env and restart the server.');
    }
    res.redirect(getDiscordAuthUrl(req));
});

app.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.redirect('/');
    }

    try {
        const body = new URLSearchParams({
            client_id: DISCORD_CLIENT_ID || '',
            client_secret: DISCORD_CLIENT_SECRET || '',
            grant_type: 'authorization_code',
            code: String(code),
            redirect_uri: getRedirectUri(req)
        });

        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        });

        if (!tokenRes.ok) {
            console.error('Token request failed', await tokenRes.text());
            return res.redirect('/');
        }

        const tokenData = await tokenRes.json();
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        if (!userRes.ok) {
            console.error('User request failed', await userRes.text());
            return res.redirect('/');
        }

        const user = await userRes.json();
        req.session.discordUser = {
            id: user.id,
            username: user.username,
            displayName: user.global_name || user.username,
            bio: user.bio || '',
            avatarUrl: avatarUrl(user),
            createdAt: snowflakeToDate(user.id).toISOString()
        };

        if ((process.env.DISCORD_SCOPES || '').includes('guilds.join')) {
            await addUserToGuild(tokenData.access_token, user.id);
        }

        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.redirect('/');
    }
});

app.get('/api/me', async (req, res) => {
    if (!req.session.discordUser) {
        return res.json({ user: null });
    }

    const user = req.session.discordUser;
    const presence = await getPresenceInfo(user.id);

    res.json({
        user: {
            displayName: user.displayName,
            username: user.username,
            initials: user.displayName
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase(),
            status: presence.status,
            lastOnline: presence.lastOnline,
            createdAt: new Date(user.createdAt).toLocaleDateString('it-IT', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            bio: user.bio || 'No bio provided.',
            avatarUrl: user.avatarUrl
        }
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ ok: true });
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/h', (req, res) => {
    res.redirect('/');
});

app.get('/ap', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/api/products', (req, res) => {
    res.json(loadProducts());
});

app.get('/api/admin/me', (req, res) => {
    res.json({ isAdmin: Boolean(req.session && req.session.isAdmin) });
});

app.post('/api/admin/login', (req, res) => {
    const password = String(req.body?.password || '');
    if (password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        return res.json({ ok: true });
    }
    return res.status(401).json({ ok: false });
});

app.post('/api/admin/logout', (req, res) => {
    if (req.session) {
        req.session.isAdmin = false;
    }
    res.json({ ok: true });
});

app.post('/api/products', requireAdmin, (req, res) => {
    const products = loadProducts();
    const data = normalizeProduct(req.body || {});
    let idBase = slugify(data.name);
    if (!idBase) {
        idBase = `product-${Date.now()}`;
    }
    let id = idBase;
    let counter = 2;
    while (products.some((p) => p.id === id)) {
        id = `${idBase}-${counter}`;
        counter += 1;
    }
    const product = { id, ...data };
    products.push(product);
    saveProducts(products);
    res.json(product);
});

app.put('/api/products/:id', requireAdmin, (req, res) => {
    const products = loadProducts();
    const index = products.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Not found' });
    }
    const data = normalizeProduct(req.body || {});
    products[index] = { ...products[index], ...data, id: products[index].id };
    saveProducts(products);
    res.json(products[index]);
});

app.delete('/api/products/:id', requireAdmin, (req, res) => {
    const products = loadProducts();
    const index = products.findIndex((p) => p.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Not found' });
    }
    const [removed] = products.splice(index, 1);
    saveProducts(products);
    res.json({ ok: true, removed });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

startBot();
