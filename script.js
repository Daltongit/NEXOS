const app = {
    currentUser: null,
    isLoginMode: true,

    init() {
        this.simulateLoading();
        this.checkTheme();
        this.bindEvents();
        setTimeout(() => this.checkAuth(), 1200); // Esperar que termine el loader
    },

    simulateLoading() {
        setTimeout(() => {
            const loader = document.getElementById('loader');
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }, 1000);
    },

    bindEvents() {
        document.getElementById('theme-toggle').addEventListener('click', (e) => {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('nexo_theme', isDark ? 'dark' : 'light');
            e.currentTarget.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        });

        document.getElementById('switch-auth').addEventListener('click', () => {
            this.isLoginMode = !this.isLoginMode;
            document.getElementById('auth-title').innerText = this.isLoginMode ? 'Bienvenido de nuevo' : 'Crea tu cuenta';
            document.getElementById('auth-submit').innerText = this.isLoginMode ? 'Ingresar al sistema' : 'Registrarse';
            document.getElementById('switch-auth').innerText = this.isLoginMode ? 'Crea tu cuenta' : 'Inicia sesión';
            document.getElementById('auth-message').innerText = ''; // Limpiar mensajes
        });

        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('auth-username').value.trim();
            const pass = document.getElementById('auth-password').value.trim();
            if(!user || !pass) return;
            
            const btn = document.getElementById('auth-submit');
            const originalText = btn.innerText;
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Procesando...';
            
            setTimeout(() => {
                this.isLoginMode ? this.login(user, pass) : this.register(user, pass);
                btn.innerText = originalText;
            }, 800); // Simulación de petición al servidor
        });
    },

    checkTheme() {
        const isDark = localStorage.getItem('nexo_theme') === 'dark';
        if (isDark) {
            document.body.classList.add('dark');
            document.getElementById('theme-toggle').innerHTML = '<i class="fa-solid fa-sun"></i>';
        }
    },

    // --- Autenticación ---
    register(user, pass) {
        let users = JSON.parse(localStorage.getItem('nexo_users')) || {};
        if (users[user]) {
            this.showMessage('El usuario ya existe.', 'error');
            return;
        }
        users[user] = { password: pass, notes: [], results: [], moodHistory: [] };
        localStorage.setItem('nexo_users', JSON.stringify(users));
        this.showMessage('Cuenta creada con éxito.', 'success');
        setTimeout(() => this.login(user, pass), 1000);
    },

    login(user, pass) {
        let users = JSON.parse(localStorage.getItem('nexo_users')) || {};
        if (users[user] && users[user].password === pass) {
            this.currentUser = user;
            localStorage.setItem('nexo_currentUser', user);
            this.loadApp();
        } else {
            this.showMessage('Credenciales incorrectas.', 'error');
        }
    },

    logout() {
        this.currentUser = null;
        localStorage.removeItem('nexo_currentUser');
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('main-nav').classList.add('hidden');
        
        const authView = document.getElementById('view-auth');
        authView.classList.add('active');
        document.getElementById('auth-form').reset();
        document.getElementById('auth-message').innerText = '';
    },

    checkAuth() {
        const user = localStorage.getItem('nexo_currentUser');
        if (user) {
            this.currentUser = user;
            this.loadApp();
        }
    },

    showMessage(msg, type) {
        const msgEl = document.getElementById('auth-message');
        msgEl.innerText = msg;
        msgEl.style.color = type === 'error' ? '#ef4444' : '#10b981';
    },

    // --- Navegación SPA Fluida ---
    loadApp() {
        document.getElementById('view-auth').classList.remove('active');
        document.getElementById('main-nav').classList.remove('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('welcome-msg').innerText = `Hola, ${this.currentUser}`;
        this.navigate('dashboard', document.querySelectorAll('.nav-item')[0]);
    },

    navigate(viewId, navElement) {
        // Actualizar UI del menú
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if(navElement) navElement.classList.add('active');

        // Ocultar todas las vistas
        document.querySelectorAll('.view').forEach(v => {
            v.classList.remove('active');
            // Resetear animación removiendo y añadiendo clase
            const wrapper = v.querySelector('.content-wrapper');
            if(wrapper) {
                wrapper.classList.remove('fade-in-up');
                void wrapper.offsetWidth; // Trigger reflow
            }
        });

        // Mostrar la nueva vista
        const activeView = document.getElementById(`view-${viewId}`);
        activeView.classList.add('active');
        const activeWrapper = activeView.querySelector('.content-wrapper');
        if(activeWrapper) activeWrapper.classList.add('fade-in-up');
        
        // Ejecutar lógicas específicas de cada vista
        if (viewId === 'diario') this.loadNotes();
        if (viewId === 'resultados') this.loadResults();
        if (viewId === 'diagnostico') this.startQuiz();
    },

    // --- Base de Datos Local ---
    getUserData() {
        return JSON.parse(localStorage.getItem('nexo_users'))[this.currentUser];
    },
    saveUserData(data) {
        let users = JSON.parse(localStorage.getItem('nexo_users'));
        users[this.currentUser] = data;
        localStorage.setItem('nexo_users', JSON.stringify(users));
    },

    // --- Módulo: Semáforo ---
    saveMood(color, state) {
        let data = this.getUserData();
        const date = new Date().toLocaleString();
        data.moodHistory.push({ color, state, date });
        this.saveUserData(data);
        
        const toast = document.getElementById('mood-feedback');
        toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> Estado guardado: ${color}`;
        toast.classList.remove('hidden');
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.classList.add('hidden');
                toast.style.opacity = '1';
            }, 500);
        }, 3000);
    },

    // --- Módulo: Diario ---
    saveNote() {
        const text = document.getElementById('diary-text').value;
        if (!text.trim()) return;
        
        let data = this.getUserData();
        const now = new Date();
        const formatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        
        data.notes.unshift({ 
            date: now.toLocaleDateString('es-ES', formatOptions), 
            text 
        });
        this.saveUserData(data);
        document.getElementById('diary-text').value = '';
        this.loadNotes();
    },

    loadNotes() {
        const data = this.getUserData();
        const container = document.getElementById('notes-list');
        if(data.notes.length === 0) {
            container.innerHTML = "<p style='color: var(--text-muted)'>Aún no tienes notas. ¡Escribe tu primer pensamiento arriba!</p>";
            return;
        }
        
        container.innerHTML = data.notes.map((n, index) => `
            <div class="timeline-item" style="animation-delay: ${index * 0.1}s">
                <span class="date"><i class="fa-solid fa-clock"></i> ${n.date}</span>
                <p>${n.text}</p>
            </div>
        `).join('');
    },

    // --- Módulo: Diagnóstico (Test de Estrés) ---
    questions: [
        { q: "¿Cómo describirías tu calidad de sueño estos últimos 3 días?", opts: [{t: "Profundo y reparador", s: 3}, {t: "Interrumpido pero aceptable", s: 2}, {t: "No logro descansar", s: 1}] },
        { q: "Físicamente, ¿cómo se siente tu cuerpo?", opts: [{t: "Relajado y con energía", s: 3}, {t: "Un poco pesado o con tensión leve", s: 2}, {t: "Dolor muscular, opresión o agotamiento", s: 1}] },
        { q: "Al pensar en tus responsabilidades actuales...", opts: [{t: "Siento que las tengo bajo control", s: 3}, {t: "Me generan algo de preocupación", s: 2}, {t: "Me siento paralizado o abrumado", s: 1}] },
        { q: "¿Has sentido ganas de aislarte de las personas?", opts: [{t: "No, disfruto la compañía", s: 3}, {t: "A veces prefiero estar solo", s: 2}, {t: "Sí, no quiero hablar con nadie", s: 1}] },
        { q: "¿Qué tan fácil te resulta concentrarte hoy?", opts: [{t: "Me concentro sin problemas", s: 3}, {t: "Me distraigo pero logro terminar", s: 2}, {t: "Mi mente está nublada y dispersa", s: 1}] }
    ],

    currentQuizScore: 0,
    currentQuestionIndex: 0,
    randomizedQuestions: [],

    startQuiz() {
        this.randomizedQuestions = this.questions.sort(() => 0.5 - Math.random()).slice(0, 4); // 4 preguntas aleatorias
        this.currentQuestionIndex = 0;
        this.currentQuizScore = 0;
        this.renderQuestion();
    },

    renderQuestion() {
        if (this.currentQuestionIndex >= this.randomizedQuestions.length) {
            this.finishQuiz();
            return;
        }
        
        // Actualizar barra de progreso
        const progress = ((this.currentQuestionIndex) / this.randomizedQuestions.length) * 100;
        document.getElementById('quiz-progress').style.width = `${progress}%`;

        const q = this.randomizedQuestions[this.currentQuestionIndex];
        document.getElementById('quiz-question').innerText = q.q;
        const optsContainer = document.getElementById('quiz-options');
        
        optsContainer.innerHTML = '';
        q.opts.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.innerHTML = opt.t;
            btn.style.animation = `slideInRight 0.3s ease forwards ${index * 0.1}s`;
            btn.style.opacity = '0';
            btn.onclick = () => this.answerQuiz(opt.s);
            optsContainer.appendChild(btn);
        });
    },

    answerQuiz(score) {
        this.currentQuizScore += score;
        this.currentQuestionIndex++;
        this.renderQuestion();
    },

    finishQuiz() {
        document.getElementById('quiz-progress').style.width = `100%`;
        
        let result = "";
        let solution = "";
        let icon = "";
        
        if (this.currentQuizScore >= 10) {
            result = "Equilibrio Emocional Óptimo";
            solution = "Tus niveles de estrés son bajos. Sigue manteniendo tus hábitos saludables. Aprovecha esta energía para avanzar en tus proyectos.";
            icon = '<i class="fa-solid fa-face-smile-beam" style="color: var(--primary); font-size: 3rem; margin-bottom:15px;"></i>';
        } else if (this.currentQuizScore >= 6) {
            result = "Fatiga Moderada";
            solution = "Estás lidiando con cargas, pero aún tienes control. Es el momento perfecto para tomarte una tarde libre, hidratarte y hacer una pausa activa.";
            icon = '<i class="fa-solid fa-face-meh" style="color: #f97316; font-size: 3rem; margin-bottom:15px;"></i>';
        } else {
            result = "Sobrecarga Emocional / Estrés Alto";
            solution = "Tu cuerpo y mente están pidiendo un freno. No te exijas más de la cuenta hoy. Delega tareas si es posible, usa la técnica del semáforo para monitorearte y considera hablar con alguien cercano o un profesional.";
            icon = '<i class="fa-solid fa-face-frown" style="color: #ef4444; font-size: 3rem; margin-bottom:15px;"></i>';
        }

        let data = this.getUserData();
        const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        data.results.unshift({ date: dateStr, result, solution });
        this.saveUserData(data);
        
        document.getElementById('quiz-container').innerHTML = `
            <div class="text-center fade-in-up">
                ${icon}
                <h3 style="font-size: 1.8rem; margin-bottom: 10px;">${result}</h3>
                <p style="color: var(--text-muted); margin-bottom: 20px; line-height: 1.6;">${solution}</p>
                <button onclick="app.navigate('resultados', document.querySelectorAll('.nav-item')[4])" class="primary-btn">Ir al Historial Completo</button>
                <button onclick="app.startQuiz()" class="primary-btn" style="background: transparent; color: var(--primary); border: 2px solid var(--primary); margin-top: 15px;">Repetir Test</button>
            </div>
        `;
    },

    loadResults() {
        const data = this.getUserData();
        const container = document.getElementById('results-list');
        if(data.results.length === 0) {
            container.innerHTML = "<p style='color: var(--text-muted)'>Aún no has realizado ningún test.</p>";
            return;
        }
        
        container.innerHTML = data.results.map((r, index) => `
            <div class="timeline-item" style="animation-delay: ${index * 0.1}s">
                <span class="date"><i class="fa-solid fa-calendar-check"></i> ${r.date}</span>
                <h4 style="margin-bottom: 8px; font-size: 1.1rem;">${r.result}</h4>
                <p style="color: var(--text-muted); font-size: 0.95rem;">${r.solution}</p>
            </div>
        `).join('');
    }
};

// Arrancar la maquinaria
document.addEventListener('DOMContentLoaded', () => app.init());
