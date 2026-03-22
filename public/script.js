const socket = io();

// 1. ИНИЦИАЛИЗАЦИЯ
let userName = localStorage.getItem('lemonName') || ""; 
let userAvatar = localStorage.getItem('lemonAva') || "https://cdn-icons-png.flaticon.com/512/149/149071.png"; 

const notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');

const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const loader = document.getElementById('loader');
const authOverlay = document.getElementById('auth-overlay');
const profileOverlay = document.getElementById('profile-overlay');
const viewProfileOverlay = document.getElementById('view-profile-overlay');
const menuBtn = document.getElementById('menu-btn');
const menuContent = document.getElementById('menu-content');

// 2. ЛОГИКА ЗАГРУЗКИ + АВТОВХОД
window.addEventListener('load', async () => {
    // Если в памяти есть имя, пробуем скрыть окно входа
    if (userName) {
        authOverlay.style.display = 'none';
        const headerStatus = document.getElementById('typing-status');
        if(headerStatus) headerStatus.innerText = "С возвращением! 🍋";
        loadHistory(); // Подгружаем старые сообщения
    }

    if (loader) {
        setTimeout(() => {
            loader.classList.add('loader-hidden'); 
            setTimeout(() => { loader.style.display = 'none'; }, 600);
        }, 1500);
    }
});

// НОВАЯ ФУНКЦИЯ: Загрузка истории с сервера
async function loadHistory() {
    try {
        const response = await fetch('/messages');
        const data = await response.json();
        if (response.ok) {
            messages.innerHTML = ''; // Чистим перед загрузкой
            data.forEach(msg => {
                renderMessage(msg, msg.name === userName);
            });
        }
    } catch (err) {
        console.log("Не удалось загрузить историю");
    }
}

// 3. ПОИСК ПОЛЬЗОВАТЕЛЕЙ (Без изменений, оставляем твой рабочий код)
const searchInput = document.getElementById('search-user');
const searchResults = document.getElementById('search-results');

if (searchInput) {
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            if (!query) return;
            searchResults.innerHTML = `<span style="font-size:11px; opacity:0.5;">Ищем лимончик...</span>`;
            try {
                const response = await fetch(`/search/${query}`);
                const result = await response.json();
                if (response.ok) {
                    searchResults.innerHTML = `
                        <div class="found-user-card" id="found-user" style="background: #1a1a1a; padding: 12px; border-radius: 12px; cursor: pointer; border: 1px solid #D4E157; display: flex; align-items: center; gap: 10px; animation: slideIn 0.3s ease;">
                            <img src="${result.user.avatar}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #D4E157;">
                            <div style="text-align: left;">
                                <div style="font-weight: bold; font-size: 14px; color: #D4E157;">${result.user.username}</div>
                                <div style="font-size: 10px; opacity: 0.6;">Нажми, чтобы посмотреть</div>
                            </div>
                        </div>
                    `;
                    document.getElementById('found-user').onclick = () => {
                        showOtherProfile(result.user);
                        searchResults.innerHTML = "";
                        searchInput.value = "";
                    };
                } else {
                    searchResults.innerHTML = `<span style="color: #ff5555; font-size: 11px;">Никто не найден 🍋💨</span>`;
                }
            } catch (err) {
                searchResults.innerHTML = `<span style="color: #ff5555; font-size: 11px;">Ошибка сервера</span>`;
            }
        }
    });
}

// 4. АВТОРИЗАЦИЯ (Добавлено сохранение в localStorage)
async function handleAuth(type) {
    const userField = document.getElementById('auth-user');
    const passField = document.getElementById('auth-pass');
    const user = userField.value.trim();
    const pass = passField.value.trim();

    if (!user || !pass) return alert("Заполни поля!");

    try {
        const response = await fetch(`/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass })
        });
        const result = await response.json();

        if (response.ok) {
            userName = user;
            // Сохраняем в браузер, чтобы не вводить снова
            localStorage.setItem('lemonName', user);
            
            if (result.user) {
                userAvatar = result.user.avatar || userAvatar;
                localStorage.setItem('lemonAva', userAvatar);
                document.getElementById('profile-pic').src = userAvatar;
                document.getElementById('prof-bio').value = result.user.bio || "";
                document.getElementById('prof-birth').value = result.user.birth || "";
                document.getElementById('prof-status').value = result.user.status || "Не указано";
            }
            authOverlay.style.display = 'none';
            input.focus();
            loadHistory();
            
            const headerStatus = document.getElementById('typing-status');
            if(headerStatus) headerStatus.innerText = "В сети 🍋";
            
        } else {
            alert(result.error || "Ошибка аутентификации");
        }
    } catch (err) {
        alert("Сервер просыпается... Попробуй еще раз через 10 секунд 🍋");
    }
}

document.getElementById('btn-login').onclick = () => handleAuth('login');
document.getElementById('btn-reg').onclick = () => handleAuth('register');

// 5. МОЙ ПРОФИЛЬ (Без изменений)
document.getElementById('open-profile')?.addEventListener('click', (e) => {
    e.preventDefault();
    profileOverlay.style.display = 'flex';
});

document.getElementById('close-profile')?.addEventListener('click', () => {
    profileOverlay.style.display = 'none';
});

document.getElementById('file-input').onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            userAvatar = event.target.result;
            document.getElementById('profile-pic').src = userAvatar;
            localStorage.setItem('lemonAva', userAvatar);
        };
        reader.readAsDataURL(file);
    }
};

document.getElementById('save-profile')?.addEventListener('click', async () => {
    const data = {
        username: userName,
        avatar: userAvatar,
        bio: document.getElementById('prof-bio').value,
        birth: document.getElementById('prof-birth').value,
        status: document.getElementById('prof-status').value
    };

    try {
        const response = await fetch('/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            const btn = document.getElementById('save-profile');
            btn.innerText = "СОХРАНЕНО...";
            setTimeout(() => {
                btn.innerText = "СОХРАНИТЬ";
                profileOverlay.style.display = 'none';
            }, 1000);
        }
    } catch (err) { console.error(err); }
});

// 6. ОТПРАВКА СООБЩЕНИЙ
form.onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text && userName) {
        const data = {
            name: userName,
            avatar: userAvatar,
            text: text,
            bio: document.getElementById('prof-bio').value,
            birth: document.getElementById('prof-birth').value,
            status: document.getElementById('prof-status').value,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        socket.emit('chat message', data);
        renderMessage(data, true); 
        input.value = '';
    }
};

// 7. ПРИЕМ И ОТОБРАЖЕНИЕ
socket.on('chat message', (data) => {
    if (data.name !== userName) {
        renderMessage(data, false); 
        notificationSound.play().catch(() => {});
    }
});

function renderMessage(data, isMe) {
    const item = document.createElement('li');
    item.className = isMe ? 'my' : 'other';
    const ava = data.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    
    if (isMe) {
        item.innerHTML = `
            <div class="msg-body">
                <span>${data.text}</span>
                <small style="display:block; font-size:9px; opacity:0.7; text-align:right; margin-top:4px;">${data.time}</small>
            </div>
        `;
    } else {
        item.innerHTML = `
            <div class="avatar-wrapper">
                <img src="${ava}" class="msg-avatar-click">
                <span class="status-online"></span>
            </div>
            <div class="msg-body">
                <b style="color: #D4E157; display:block; font-size: 11px; margin-bottom: 2px;">${data.name}</b>
                <div>${data.text}</div>
                <small style="display:block; font-size:9px; opacity:0.6; margin-top:4px;">${data.time}</small>
            </div>
        `;
        item.querySelector('.msg-avatar-click').onclick = () => showOtherProfile(data);
    }
    messages.appendChild(item);
    messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
}

// 8. ПРОФИЛЬ ДРУГИХ
function showOtherProfile(data) {
    const user = data.user || data; 
    document.getElementById('view-ava').src = user.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    document.getElementById('view-name').innerText = user.username || user.name;
    document.getElementById('view-birth').innerText = user.birth || "Скрыто 🍋";
    document.getElementById('view-status').innerText = user.status || "Без статуса";
    document.getElementById('view-bio').innerText = user.bio || "Пользователь скромничает.";
    viewProfileOverlay.style.display = 'flex';
}

document.getElementById('close-view-profile').onclick = () => viewProfileOverlay.style.display = 'none';

// 9. ВЫХОД (Очистка памяти)
document.getElementById('logout')?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.clear();
    location.reload(); 
});
