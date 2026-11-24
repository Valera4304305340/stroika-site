// ============================================
// 1. ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initSwiper();
    initScrollTop();
    initSmoothScroll();
    initOrderForm();
    initCallbackForm();
    initAuthForms();
    initImageHandling();
    initActiveNavLinks();
    initCabinet();
    checkSession();
});

// ============================================
// 2. SWIPER СЛАЙДЕР
// ============================================
function initSwiper() {
    const swiperElement = document.querySelector('.testimonialSwiper');
    if (!swiperElement) return;
    
    new Swiper('.testimonialSwiper', {
        slidesPerView: 1,
        spaceBetween: 20,
        loop: true,
        autoplay: { delay: 5000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        breakpoints: {
            640: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
        },
    });
}

// ============================================
// 3. КНОПКА "ВВЕРХ"
// ============================================
function initScrollTop() {
    const button = document.getElementById('scrollTopButton');
    if (!button) return;
    
    window.addEventListener('scroll', function() {
        button.style.display = window.scrollY > 300 ? 'flex' : 'none';
    });
    
    button.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ============================================
// 4. ПЛАВНАЯ ПРОКРУТКА
// ============================================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#!') {
                e.preventDefault();
                return;
            }
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                
                const collapse = document.querySelector('.navbar-collapse');
                if (collapse && collapse.classList.contains('show')) {
                    new bootstrap.Collapse(collapse, { toggle: false }).hide();
                }
                
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// ============================================
// 5. ФОРМА ЗАКАЗА
// ============================================
function initOrderForm() {
    const form = document.getElementById('orderForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const token = localStorage.getItem('token');
        if (!token) {
            showToast('Пожалуйста, войдите в аккаунт перед оформлением заказа', 'danger');
            return;
        }

        const data = {
            service_id: document.getElementById('orderService').value,
            quantity: 1,
            address: document.getElementById('orderAddress').value.trim(),
            description: document.getElementById('orderDescription').value.trim()
        };
        
        if (!data.service_id || !data.address) {
            showToast('Пожалуйста, выберите услугу и укажите адрес', 'danger');
            return;
        }
        
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Отправка...';
        
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            
            if (result.success) {
                showToast('Заказ успешно отправлен!', 'success');
                form.reset();
            } else {
                showToast(result.message || 'Ошибка отправки', 'danger');
            }
        } catch (error) {
            showToast('Ошибка соединения с сервером', 'danger');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Отправить заявку';
        }
    });
}

// ============================================
// 6. ФОРМА ОБРАТНОГО ЗВОНКА
// ============================================
function initCallbackForm() {
    const form = document.getElementById('callbackForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const phone = document.getElementById('callbackPhone').value.trim();
        if (!phone || phone.length < 10) {
            showToast('Введите корректный номер телефона', 'danger');
            return;
        }
        
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Отправка...';
        
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: 'srv_callback',
                    quantity: 1,
                    address: 'Не указан',
                    description: `Обратный звонок на номер: ${phone}`
                })
            });
            const result = await response.json();
            
            if (result.success) {
                showToast('Спасибо! Мы перезвоним вам в ближайшее время.', 'success');
                form.reset();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('callModal'));
                if (modal) modal.hide();
            } else {
                showToast(result.message || 'Ошибка отправки', 'danger');
            }
        } catch (error) {
            showToast('Ошибка соединения с сервером', 'danger');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Заказать звонок';
        }
    });
}

// ============================================
// 7. АУТЕНТИФИКАЦИЯ (С ПОДТВЕРЖДЕНИЕМ ПОЧТЫ)
// ============================================
function initAuthForms() {
    const registerForm = document.getElementById('registerForm');
    const step1 = document.getElementById('registerStep1');
    const step2 = document.getElementById('registerStep2');
    const sentToEmail = document.getElementById('sentToEmail');
    const backToStep1 = document.getElementById('backToStep1');

    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const password = document.getElementById('registerPassword').value;
            const confirm = document.getElementById('confirmPassword').value;
            
            if (password !== confirm) {
                showMessage('registerMessage', 'Пароли не совпадают', 'danger');
                return;
            }
            if (password.length < 6) {
                showMessage('registerMessage', 'Пароль должен содержать минимум 6 символов', 'danger');
                return;
            }
            
            const data = {
                firstName: document.getElementById('firstName').value.trim(),
                lastName: document.getElementById('lastName').value.trim(),
                email: document.getElementById('registerEmail').value.trim(),
                phone: document.getElementById('registerPhone').value.trim(),
                password: password
            };
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                
                showMessage('registerMessage', result.message, result.success ? 'success' : 'danger');
                
                if (result.success) {
                    // Переключаем на Шаг 2 (ввод кода)
                    if (step1 && step2 && sentToEmail) {
                        step1.classList.add('d-none');
                        step2.classList.remove('d-none');
                        sentToEmail.textContent = data.email;
                    }
                }
            } catch (error) {
                showMessage('registerMessage', 'Ошибка соединения с сервером', 'danger');
            }
        });
    }

    // Кнопка "Назад"
    if (backToStep1) {
        backToStep1.addEventListener('click', () => {
            step2.classList.add('d-none');
            step1.classList.remove('d-none');
            document.getElementById('registerMessage').classList.add('d-none');
        });
    }

    // Кнопка "Подтвердить код"
    const verifyBtn = document.getElementById('verifyBtn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', async () => {
            const email = document.getElementById('registerEmail').value;
            const code = document.getElementById('verificationCode').value;
            
            if (code.length !== 6) {
                showMessage('registerMessage', 'Введите 6-значный код', 'danger');
                return;
            }

            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Проверка...';

            try {
                const res = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, code })
                });
                const data = await res.json();
                
                showMessage('registerMessage', data.message, data.success ? 'success' : 'danger');
                
                if (data.success) {
                    setTimeout(() => {
                        bootstrap.Modal.getInstance(document.getElementById('registerModal')).hide();
                        registerForm.reset();
                        step2.classList.add('d-none');
                        step1.classList.remove('d-none');
                        document.getElementById('verificationCode').value = '';
                    }, 2000);
                }
            } catch (error) {
                showMessage('registerMessage', 'Ошибка соединения с сервером', 'danger');
            } finally {
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Подтвердить код';
            }
        });
    }

    // Вход
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const data = {
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value
            };
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                showMessage('loginMessage', result.message, result.success ? 'success' : 'danger');
                if (result.success) {
                    localStorage.setItem('user', JSON.stringify(result.user));
                    localStorage.setItem('token', result.token);
                    updateUserInterface(result.user);
                    setTimeout(() => {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                        if (modal) modal.hide();
                        loginForm.reset();
                    }, 1000);
                }
            } catch (error) {
                showMessage('loginMessage', 'Ошибка соединения с сервером', 'danger');
            }
        });
    }

    // Выход
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            try {
                const token = localStorage.getItem('token');
                await fetch('/api/auth/logout', { 
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                updateUserInterface(null);
                showToast('Вы вышли из системы', 'success');
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
}

// ============================================
// 8. ЛИЧНЫЙ КАБИНЕТ
// ============================================
function initCabinet() {
    const btn = document.getElementById('cabinetBtn');
    if (!btn) return;

    btn.addEventListener('click', async function() {
        const token = localStorage.getItem('token');
        if (!token) return;

        const list = document.getElementById('cabinetOrdersList');
        if (!list) return;

        list.innerHTML = '<div class="text-center p-4"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">Загрузка заказов...</p></div>';

        try {
            const response = await fetch('/api/orders/my', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (data.success && data.orders && data.orders.length > 0) {
                list.innerHTML = `<div class="list-group">` + data.orders.map(o => {
                    let statusText = o.status;
                    if (o.status === 'pending') statusText = 'Ожидание';
                    if (o.status === 'confirmed') statusText = 'Подтвержден';
                    if (o.status === 'in_progress') statusText = 'В работе';
                    if (o.status === 'completed') statusText = 'Завершен';
                    if (o.status === 'cancelled') statusText = 'Отменен';

                    return `
                    <div class="list-group-item mb-2 border rounded shadow-sm">
                        <div class="d-flex w-100 justify-content-between align-items-center">
                            <h6 class="mb-1 text-primary">${o.service_name || 'Услуга'}</h6>
                            <small class="text-muted">${new Date(o.created_at).toLocaleDateString()}</small>
                        </div>
                        <p class="mb-1"><strong>Адрес:</strong> ${o.address}</p>
                        <p class="mb-1"><strong>Стоимость:</strong> ${o.total_price} ₽</p>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <small class="text-muted">Статус: <span class="badge bg-secondary">${statusText}</span></small>
                        </div>
                    </div>
                `}).join('') + `</div>`;
            } else {
                list.innerHTML = '<div class="alert alert-info">У вас пока нет заказов.</div>';
            }
        } catch (error) {
            list.innerHTML = '<div class="alert alert-danger">Ошибка загрузки заказов.</div>';
        }
    });
}

// ============================================
// 9. ФУНКЦИИ ИНТЕРФЕЙСА
// ============================================
function updateUserInterface(user) {
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const loginBtn = document.getElementById('showLoginBtn');
    const registerBtn = document.getElementById('showRegisterBtn');
    const adminBtn = document.getElementById('adminPanelBtn');
    const cabinetBtn = document.getElementById('cabinetBtn');
    
    if (user) {
        userInfo.classList.remove('d-none');
        userName.textContent = user.fullName || user.full_name || user.name || 'Пользователь';
        loginBtn.classList.add('d-none');
        registerBtn.classList.add('d-none');
        
        if (user.role === 'admin') {
            if (adminBtn) adminBtn.classList.remove('d-none');
            if (cabinetBtn) cabinetBtn.classList.add('d-none');
        } else {
            if (adminBtn) adminBtn.classList.add('d-none');
            if (cabinetBtn) cabinetBtn.classList.remove('d-none');
        }
    } else {
        userInfo.classList.add('d-none');
        loginBtn.classList.remove('d-none');
        registerBtn.classList.remove('d-none');
        if (adminBtn) adminBtn.classList.add('d-none');
        if (cabinetBtn) cabinetBtn.classList.add('d-none');
    }
}

async function checkSession() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (data.success && data.user) {
            localStorage.setItem('user', JSON.stringify(data.user));
            updateUserInterface(data.user);
        } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            updateUserInterface(null);
        }
    } catch (error) {
        console.error('Session check error:', error);
    }
}

function showMessage(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = message;
    el.className = `alert alert-${type}`;
    el.classList.remove('d-none');
    setTimeout(() => el.classList.add('d-none'), 5000);
}

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('successToast');
    if (!toastEl) {
        alert(message);
        return;
    }
    
    const body = document.getElementById('toastMessage');
    if (body) body.textContent = message;
    
    toastEl.className = `toast align-items-center text-white bg-${type === 'success' ? 'success' : 'danger'} border-0`;
    
    const toast = new bootstrap.Toast(toastEl, { autohide: true, delay: 5000 });
    toast.show();
}

function initImageHandling() {
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('load', function() {
            this.style.opacity = '1';
        });
        img.addEventListener('error', function() {
            this.style.display = 'none';
        });
        if (img.complete && img.naturalHeight !== 0) {
            img.style.opacity = '1';
        }
    });
}

function initActiveNavLinks() {
    window.addEventListener('scroll', function() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        let current = '';
        sections.forEach(section => {
            const top = section.offsetTop;
            if (window.scrollY >= top - 200) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
}

// Загрузка пользователя из localStorage при старте
const savedUser = localStorage.getItem('user');
if (savedUser) {
    updateUserInterface(JSON.parse(savedUser));
}