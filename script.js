const app = {
    currentUser: null,
    isLoginMode: true,

    init() {
        this.checkTheme();
        this.bindEvents();
        this.checkAuth();
    },

    bindEvents() {
        document.getElementById('theme-toggle').addEventListener('click', () => {
            document.body.classList.toggle('dark');
            localStorage.setItem('nexo_theme', document.body.classList.contains('dark') ? 'dark' : 'light');
        });

        document.getElementById('switch-auth').addEventListener('click', () => {
            this.isLoginMode = !this.isLoginMode;
            document.getElementById('auth-title').innerText = this.isLoginMode ? 'Iniciar Sesión' : 'Registrarse';
            document.getElementById('auth-submit').innerText = this.isLoginMode ? 'Entrar' : 'Crear Cuenta';
            document.getElementById('switch-auth').innerText = this.isLoginMode ? 'Regístrate aquí' : 'Inicia sesión aquí';
        });

        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('auth-username').value;
            const pass = document.getElementById('auth-password').value;
            this.isLoginMode ? this.login(user, pass) : this.register(user, pass);
        });

        // Lógica de respiración
        setInterval(() => {
            const text = document.getElementById('breathe-text');
            text.innerText = text.innerText === 'Inhala' ? 'Exhala' : 'Inhala';
        }, 4000);
    },

    checkTheme() {
        if (localStorage.getItem('nexo_theme') === 'dark') {
            document.body.classList.add('dark');
        }
    },

    // --- Sistema de Autenticación Local ---
    register(user, pass) {
        let users = JSON.parse(localStorage.getItem('nexo_users')) || {};
        if (users[user]) {
            this.showMessage('El usuario ya existe.', 'error');
            return;
        }
        users[user] = { password: pass, notes: [], results: [], moodHistory: [] };
        localStorage.setItem('nexo_users', JSON.stringify(users));
        this.showMessage('Registro exitoso. Iniciando...', 'success');
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
        document.getElementById('view-auth').classList.add('active');
        document.getElementById('auth-form').reset();
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
        msgEl.style.color = type === 'error' ? '#ef4444' : '#22c55e';
    },

    // --- Navegación SPA ---
    loadApp() {
        document.getElementById('view-auth').classList.remove('active');
        document.getElementById('main-nav').classList.remove('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        document.getElementById('welcome-msg').innerText = `Hola, ${this.currentUser}`;
        this.navigate('dashboard');
    },

    navigate(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewId}`).classList.add('active');
        
        if (viewId === 'diario') this.loadNotes();
        if (viewId === 'resultados') this.loadResults();
        if (viewId === 'diagnostico') this.loadQuiz();
    },

    // --- Lógica de Base de Datos Local ---
    getUserData() {
        return JSON.parse(localStorage.getItem('nexo_users'))[this.currentUser];
    },
    saveUserData(data) {
        let users = JSON.parse(localStorage.getItem('nexo_users'));
        users[this.currentUser] = data;
        localStorage.setItem('nexo_users', JSON.stringify(users));
    },

    // --- Semáforo ---
    saveMood(color, state) {
        let data = this.getUserData();
        const date = new Date().toLocaleString();
        data.moodHistory.push({ color, state, date });
        this.saveUserData(data);
        document.getElementById('mood-feedback').innerText = `Registrado: Estado ${color} - ${date}`;
        setTimeout(() => document.getElementById('mood-feedback').innerText = '', 3000);
    },

    // --- Diario ---
    saveNote() {
        const text = document.getElementById('diary-text').value;
        if (!text.trim()) return;
        
        let data = this.getUserData();
        data.notes.unshift({ date: new Date().toLocaleDateString(), text });
        this.saveUserData(data);
        document.getElementById('diary-text').value = '';
        this.loadNotes();
    },

    loadNotes() {
        const data = this.getUserData();
        const container = document.getElementById('notes-list');
        container.innerHTML = data.notes.map(n => `<div class="list-item"><small><i class="fa-solid fa-clock"></i> ${n.date}</small><p>${n.text}</p></div>`).join('');
    },

    // --- Diagnóstico Dinámico ---
    questions: [
        { q: "¿Cómo has dormido últimamente?", opts: [{t: "Muy bien", s: 3}, {t: "Regular, me despierto a veces", s: 2}, {t: "Mal, casi no duermo", s: 1}] },
        { q: "¿Sientes tensión muscular (cuello, espalda)?", opts: [{t: "No, para nada", s: 3}, {t: "Un poco a veces", s: 2}, {t: "Sí, constantemente", s: 1}] },
        { q: "¿Cómo te sientes frente a tus tareas diarias?", opts: [{t: "Motivado", s: 3}, {t: "Es un poco pesado", s: 2}, {t: "Me siento incapaz o abrumado", s: 1}] },
        { q: "¿Has tenido pensamientos intrusivos?", opts: [{t: "No", s: 3}, {t: "Algunos", s: 2}, {t: "Muchos y constantes", s: 1}] }
    ],

    currentQuizScore: 0,
    currentQuestionIndex: 0,
    randomizedQuestions: [],

    loadQuiz() {
        // Selecciona 3 preguntas al azar
        this.randomizedQuestions = this.questions.sort(() => 0.5 - Math.random()).slice(0, 3);
        this.currentQuestionIndex = 0;
        this.currentQuizScore = 0;
        this.renderQuestion();
    },

    renderQuestion() {
        if (this.currentQuestionIndex >= this.randomizedQuestions.length) {
            this.finishQuiz();
            return;
        }
        const q = this.randomizedQuestions[this.currentQuestionIndex];
        document.getElementById('quiz-question').innerText = q.q;
        const optsContainer = document.getElementById('quiz-options');
        optsContainer.innerHTML = q.opts.map(opt => `<button onclick="app.answerQuiz(${opt.s})">${opt.t}</button>`).join('');
    },

    answerQuiz(score) {
        this.currentQuizScore += score;
        this.currentQuestionIndex++;
        this.renderQuestion();
    },

    finishQuiz() {
        let result = "";
        let solution = "";
        
        if (this.currentQuizScore >= 8) {
            result = "Tu nivel de estrés parece bajo. Mantienes un buen equilibrio.";
            solution = "Continúa con tus rutinas de autocuidado y disfruta el momento.";
        } else if (this.currentQuizScore >= 5) {
            result = "Muestras signos de fatiga emocional moderada.";
            solution = "Intenta hacer pausas activas. Prueba la herramienta de relajación en esta app.";
        } else {
            result = "Indicadores altos de estrés y agotamiento emocional.";
            solution = "Es crucial que descanses. Te sugerimos hablar con alguien de confianza o un profesional, y reducir tus cargas inmediatas.";
        }

        let data = this.getUserData();
        data.results.unshift({ date: new Date().toLocaleDateString(), result, solution });
        this.saveUserData(data);
        
        document.getElementById('quiz-container').innerHTML = `
            <h3>Evaluación Completada</h3>
            <p>Tus resultados se han guardado en el historial.</p>
            <button onclick="app.navigate('resultados')" class="primary-btn mt-3">Ver Resultados</button>
        `;
    },

    loadResults() {
        const data = this.getUserData();
        const container = document.getElementById('results-list');
        if(data.results.length === 0) {
            container.innerHTML = "<p>Aún no tienes diagnósticos guardados.</p>";
            return;
        }
        container.innerHTML = data.results.map(r => `
            <div class="list-item">
                <small><i class="fa-solid fa-calendar"></i> ${r.date}</small>
                <p><strong>Diagnóstico:</strong> ${r.result}</p>
                <p><strong>Recomendación:</strong> ${r.solution}</p>
            </div>
        `).join('');
    }
};

// Inicializar la app
app.init();
