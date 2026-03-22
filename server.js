const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');

// --- 1. НАСТРОЙКИ SUPABASE ---

// 1. Твоя ссылка (она остается прежней)
const SUPABASE_URL = 'https://nrvqzqaqojwcwvhvdkdn.supabase.co'; 

// 2. Твой ANON PUBLIC KEY (тот, что ты только что скинула)
const SUPABASE_KEY = 'sb_publishable_LP73SZr28DYDKs3ExAMAVg_l1Y6ogI2'; 

// 3. Создание связи с базой
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// --- 2. НАСТРОЙКИ СЕРВЕРА ---
app.use(express.json({ limit: '10mb' })); 
app.use(express.static(path.join(__dirname, 'public'))); 

// --- 3. РЕГИСТРАЦИЯ ---
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Пустые поля!" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const { error } = await supabase
            .from('users')
            .insert([{ 
                username, 
                password: hashedPassword, 
                avatar: '', 
                bio: '', 
                birth: '', 
                status: 'Не указано' 
            }]);

        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        console.error("Ошибка регистрации:", e.message);
        res.status(400).json({ error: "Этот никнейм уже занят или ошибка БД" });
    }
});

// --- 4. ВХОД ---
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (user && await bcrypt.compare(password, user.password)) {
            return res.json({ 
                success: true, 
                user: {
                    username: user.username,
                    avatar: user.avatar,
                    bio: user.bio,
                    birth: user.birth,
                    status: user.status
                }
            });
        }
        res.status(401).json({ error: "Неверный логин или пароль" });
    } catch (e) {
        res.status(500).json({ error: "Ошибка сервера при входе" });
    }
});

// --- 5. ОБНОВЛЕНИЕ ПРОФИЛЯ ---
app.post('/update-profile', async (req, res) => {
    const { username, avatar, bio, birth, status } = req.body;
    try {
        const { error } = await supabase
            .from('users')
            .update({ avatar, bio, birth, status })
            .eq('username', username);

        if (error) throw error;
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Ошибка сохранения профиля" });
    }
});

// --- 6. ПОИСК ПОЛЬЗОВАТЕЛЯ ---
app.get('/search/:username', async (req, res) => {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('username, avatar, bio, status, birth')
            .eq('username', req.params.username)
            .single();

        if (user) {
            res.json({ user });
        } else {
            res.status(404).json({ error: "Лимончик не найден" });
        }
    } catch (err) {
        res.status(500).json({ error: "Ошибка поиска" });
    }
});

// --- 7. ЗАГРУЗКА ИСТОРИИ СООБЩЕНИЙ ---
app.get('/messages', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('id', { ascending: true })
            .limit(50);
        res.json(data || []);
    } catch (e) {
        res.json([]);
    }
});

// --- 8. СОКЕТЫ (ЧАТ В РЕАЛЬНОМ ВРЕМЕНИ) ---
io.on('connection', (socket) => {
    socket.on('chat message', async (data) => {
        try {
            // Сохраняем сообщение в Supabase
            await supabase.from('messages').insert([{
                username: data.name,
                text: data.text,
                time: data.time,
                avatar: data.avatar
            }]);
        } catch (e) { 
            console.error("Ошибка сохранения сообщения в облако:", e.message); 
        }

        // Отправляем сообщение всем остальным пользователям
        socket.broadcast.emit('chat message', data);
    });

    socket.on('typing', (data) => {
        socket.broadcast.emit('typing', data);
    });
});

// --- 9. ЗАПУСК СЕРВЕРА ---
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`
    🍋====================================🍋
    |  LIMONNIK CLOUD SERVER IS ONLINE |
    |  PORT: ${PORT}                      |
    |  DATABASE: Supabase Cloud          |
    🍋====================================🍋
    `);
});