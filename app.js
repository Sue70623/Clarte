// app.js - V2.2 (Questionnaire + Bilan enrichi)
const app = {
    currentStep: 1,
    todayData: {},
    confirmCallback: null,
    cancelCallback: null,
    typingTimer: null,
    surveyStep: 1,
    surveyAnswers: {},
    isManualSurvey: false,
    surveyQuestions: [
        {
            id: 'q1_week_feeling',
            title: 'Comment était ta semaine ?',
            type: 'emoji',
            options: [
                { value: -2, label: '😣 Difficile' },
                { value: -1, label: '😕 Compliquée' },
                { value: 0, label: '😐 Neutre' },
                { value: 1, label: '🙂 Bonne' },
                { value: 2, label: '😄 Excellente' }
            ]
        },
        {
            id: 'q2_energy',
            title: 'Ton niveau d\'énergie global ?',
            type: 'scale',
            options: [
                { value: 1, label: '🔋 Vide' },
                { value: 2, label: '🔋🔋 Faible' },
                { value: 3, label: '🔋🔋🔋 Moyen' },
                { value: 4, label: '🔋🔋🔋🔋 Bon' },
                { value: 5, label: '🔋🔋🔋🔋🔋 Plein' }
            ]
        },
        {
            id: 'q3_clarity',
            title: 'Ta clarté mentale ?',
            type: 'scale',
            options: [
                { value: 1, label: '🌫️ Floue' },
                { value: 2, label: '⛅ Variable' },
                { value: 3, label: '☀️ Claire' },
                { value: 4, label: '✨ Très claire' }
            ]
        },
        {
            id: 'q4_change',
            title: 'As-tu remarqué un changement cette semaine ?',
            type: 'choice',
            options: [
                { value: 'positive', label: 'Oui, positif' },
                { value: 'negative', label: 'Oui, négatif' },
                { value: 'stable', label: 'Non, stable' },
                { value: 'unknown', label: 'Je ne sais pas' }
            ]
        },
        {
            id: 'q5_helped',
            title: 'Qu\'est-ce qui t\'a aidé le plus ?',
            type: 'text',
            placeholder: 'Ex: Nommer mon obstacle précisément',
            maxLength: 100
        },
        {
            id: 'q6_blocked',
            title: 'Qu\'est-ce qui t\'a freiné ?',
            type: 'text',
            placeholder: 'Ex: Fatigue, manque de temps',
            maxLength: 100
        },
        {
            id: 'q7_word',
            title: 'Un mot pour décrire ta semaine ?',
            type: 'text',
            placeholder: 'Ex: Mouvement, Stagnation, Clarté',
            maxLength: 20
        }
    ],
    
    init() {
        try {
            this.migrateOldData();
            this.loadTodayData();
            this.updateStats();
            this.setupEventListeners();
            this.restoreSession();
        } catch (error) {
            console.error('[INIT ERROR] Erreur fatale lors de l\'initialisation:', error);
            console.error('Stack:', error.stack);
            alert('Erreur lors du chargement de l\'application. Consultez la console.');
        }
    },

    migrateOldData() {
        console.log('[Migration] Vérification données V2.0...');
        let migrated = 0;
        const keysToMigrate = [];
        
        // Trouver toutes les anciennes clés (sans sessionIndex)
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('journey_') && !key.match(/_\d+$/)) {
                keysToMigrate.push(key);
            }
        }
        
        // Migrer chaque ancienne clé
        keysToMigrate.forEach(oldKey => {
            const data = localStorage.getItem(oldKey);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    const dateMatch = oldKey.match(/journey_(\d{4}-\d{2}-\d{2})/);
                    if (dateMatch) {
                        const date = dateMatch[1];
                        const newKey = `journey_${date}_1`;
                        const migratedData = {
                            date: date,
                            sessionIndex: 1,
                            moodBefore: null,
                            moodAfter: null,
                            ...parsed
                        };
                        
                        localStorage.setItem(newKey, JSON.stringify(migratedData));
                        localStorage.removeItem(oldKey);
                        migrated++;
                        console.log(`[Migration] ${oldKey} → ${newKey}`);
                    }
                } catch (e) {
                    console.error('[Migration] Erreur:', oldKey, e);
                }
            }
        });
        
        if (migrated > 0) {
            console.log(`[Migration] ✅ ${migrated} pratiques migrées`);
        } else {
            console.log('[Migration] Aucune donnée à migrer');
        }
    },

    setupEventListeners() {
        // Auto-save on input
        for (let i = 1; i <= 5; i++) {
            const textarea = document.getElementById(`step${i}`);
            textarea?.addEventListener('input', (e) => {
                this.todayData[`step${i}`] = e.target.value;
                this.saveTodayData();
                
                // Debounce - attendre que l'utilisateur arrête de taper
                clearTimeout(this.typingTimer);
                
                if (e.target.value.trim().length > 0 && i < 6 && !this.todayData.completedAt) {
                    this.typingTimer = setTimeout(() => this.nextStep(), 800);
                }
            });
        }

        // Mood before listeners
        document.querySelectorAll('#moodBefore .mood-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mood = parseInt(btn.dataset.mood);
                this.todayData.moodBefore = mood;
                this.saveTodayData();
                
                // Visual feedback
                document.querySelectorAll('#moodBefore .mood-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                // Auto-advance after 500ms
                setTimeout(() => {
                    document.getElementById('moodBefore')?.classList.add('hidden');
                    document.querySelector('[data-step="1"]')?.classList.remove('hidden');
                    this.currentStep = 1;
                }, 500);
            });
        });

        document.querySelector('#moodBefore .skip-btn')?.addEventListener('click', () => {
            this.todayData.moodBefore = null;
            this.saveTodayData();
            document.getElementById('moodBefore')?.classList.add('hidden');
            document.querySelector('[data-step="1"]')?.classList.remove('hidden');
            this.currentStep = 1;
        });

        // Mood after listeners
        document.querySelectorAll('#moodAfter .mood-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mood = parseInt(btn.dataset.mood);
                this.todayData.moodAfter = mood;
                this.saveTodayData();
                
                // Visual feedback
                document.querySelectorAll('#moodAfter .mood-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                
                // Auto-advance after 500ms
                setTimeout(() => {
                    document.getElementById('moodAfter')?.classList.add('hidden');
                    document.getElementById('completion')?.classList.remove('hidden');
                }, 500);
            });
        });

        document.querySelector('#moodAfter .skip-btn')?.addEventListener('click', () => {
            this.todayData.moodAfter = null;
            this.saveTodayData();
            document.getElementById('moodAfter')?.classList.add('hidden');
            document.getElementById('completion')?.classList.remove('hidden');
        });

        // Engagement buttons
        document.getElementById('notToday')?.addEventListener('click', () => this.completeJourney(false));
        document.getElementById('yesToday')?.addEventListener('click', () => this.completeJourney(true));
        
        // Completion actions
        document.getElementById('reviewPractice')?.addEventListener('click', () => this.reviewPractice());
        document.getElementById('newPractice')?.addEventListener('click', () => this.startNewPractice());

        // Navigation
        document.getElementById('navJourney')?.addEventListener('click', () => this.showView('journey'));
        document.getElementById('navHistory')?.addEventListener('click', () => this.showView('history'));
        document.getElementById('navInsights')?.addEventListener('click', () => this.showView('insights'));
        document.getElementById('navSettings')?.addEventListener('click', () => this.showView('settings'));

        // Settings actions
        document.getElementById('exportDataBtn')?.addEventListener('click', () => this.exportData());
        document.getElementById('importFile')?.addEventListener('change', (e) => this.importData(e));
        document.getElementById('resetDataBtn')?.addEventListener('click', () => this.confirmReset());

        // Manual survey button
        document.getElementById('manualSurveyBtn')?.addEventListener('click', () => this.startManualSurvey());

        // Modal
        document.getElementById('modalCancel')?.addEventListener('click', () => {
            if (this.cancelCallback) {
                this.cancelCallback();
                this.cancelCallback = null;
            }
            this.hideModal();
        });
        
        document.getElementById('modalConfirm')?.addEventListener('click', () => {
            if (this.confirmCallback) {
                this.confirmCallback();
                this.confirmCallback = null;
            }
            this.hideModal();
        });
    },

    renderSurvey() {
        const container = document.getElementById('surveyContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.surveyQuestions.forEach((q, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = `survey-question ${index === 0 ? 'active' : ''}`;
            questionDiv.dataset.questionId = q.id;
            
            let optionsHtml = '';
            
            if (q.type === 'text') {
                optionsHtml = `<textarea 
                    class="survey-text-input" 
                    placeholder="${q.placeholder || ''}" 
                    maxlength="${q.maxLength || 200}"
                    rows="3"
                ></textarea>`;
            } else {
                optionsHtml = '<div class="survey-options">';
                q.options.forEach(opt => {
                    optionsHtml += `<div class="survey-option" data-value="${opt.value}">${opt.label}</div>`;
                });
                optionsHtml += '</div>';
            }
            
            questionDiv.innerHTML = `
                <div class="question-title">${q.title}</div>
                ${optionsHtml}
            `;
            
            container.appendChild(questionDiv);
        });
        
        this.setupSurveyListeners();
    },

    setupSurveyListeners() {
        // Clone container to remove old listeners (deduplication)
        const container = document.getElementById('surveyContainer');
        if (container) {
            const newContainer = container.cloneNode(true);
            container.parentNode.replaceChild(newContainer, container);
        }
        
        // Re-attach listeners to cloned container
        const finalContainer = document.getElementById('surveyContainer');
        
        // Option clicks via event delegation
        finalContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('survey-option')) {
                const questionDiv = e.target.closest('.survey-question');
                if (!questionDiv) return;
                
                const questionId = questionDiv.dataset.questionId;
                const value = e.target.dataset.value;
                
                // Deselect others
                questionDiv.querySelectorAll('.survey-option').forEach(o => o.classList.remove('selected'));
                e.target.classList.add('selected');
                
                // Save answer
                this.surveyAnswers[questionId] = isNaN(value) ? value : parseFloat(value);
            }
        });
        
        // Text inputs
        finalContainer.querySelectorAll('.survey-text-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const questionDiv = e.target.closest('.survey-question');
                const questionId = questionDiv.dataset.questionId;
                this.surveyAnswers[questionId] = e.target.value.trim() || null;
            });
        });
        
        // Navigation buttons - cloner pour supprimer TOUS les anciens listeners
        const nextBtn = document.getElementById('surveyNext');
        const prevBtn = document.getElementById('surveyPrevious');
        const skipBtn = document.getElementById('surveySkip');

        if (nextBtn) {
            const newNext = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNext, nextBtn);
            document.getElementById('surveyNext').addEventListener('click', (e) => {
                e.stopImmediatePropagation();
                this.surveyNext();
            });
        }

        if (prevBtn) {
            const newPrev = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrev, prevBtn);
            document.getElementById('surveyPrevious').addEventListener('click', (e) => {
                e.stopImmediatePropagation();
                this.surveyPrevious();
            });
        }

        if (skipBtn) {
            const newSkip = skipBtn.cloneNode(true);
            skipBtn.parentNode.replaceChild(newSkip, skipBtn);
            document.getElementById('surveySkip').addEventListener('click', (e) => {
                e.stopImmediatePropagation();
                this.surveySkip();
            });
        }
    },

    surveyNext() {
        if (this.surveyStep >= 7) {
            // Dernière question - terminer
            this.completeSurvey(this.isManualSurvey || false);
            return;
        }
        
        // Passer à la question suivante
        this.surveyStep++;
        this.updateSurveyDisplay();
    },

    surveyPrevious() {
        if (this.surveyStep <= 1) return;
        this.surveyStep--;
        this.updateSurveyDisplay();
    },

    surveySkip() {
        if (this.surveyStep >= 7) {
            this.completeSurvey(this.isManualSurvey || false);
        } else {
            this.surveyNext();
        }
    },

    updateSurveyDisplay() {
        // Update progress
        const currentQ = document.getElementById('currentQuestion');
        if (currentQ) currentQ.textContent = this.surveyStep;
        
        // Show current question
        document.querySelectorAll('.survey-question').forEach((q, i) => {
            if (i === this.surveyStep - 1) {
                q.classList.add('active');
            } else {
                q.classList.remove('active');
            }
        });
        
        // Update buttons
        const prevBtn = document.getElementById('surveyPrevious');
        const nextBtn = document.getElementById('surveyNext');
        const skipBtn = document.getElementById('surveySkip');
        
        if (prevBtn) prevBtn.style.display = this.surveyStep > 1 ? 'block' : 'none';
        if (nextBtn) nextBtn.textContent = this.surveyStep === 7 ? 'Terminer ✓' : 'Suivant →';
        if (skipBtn) skipBtn.textContent = this.surveyStep === 7 ? 'Terminer sans répondre' : 'Passer';
    },

    completeSurvey(isManual = false) {
        // Guard anti-double-exécution
        if (this._completingSurvey) return;
        this._completingSurvey = true;

        const today = this.getToday();
        const weekNumber = this.getWeekNumber(new Date());
        const weekStart = this.getWeekStart(new Date());
        
        const survey = {
            weekStart: weekStart,
            weekNumber: weekNumber,
            isManual: isManual,
            responses: this.surveyAnswers,
            completedAt: new Date().toISOString()
        };
        
        // Clé différente si manuel pour ne pas écraser le bilan auto
        const key = isManual 
            ? `weekly_survey_manual_${new Date().getTime()}`
            : `weekly_survey_${weekNumber}`;
        
        localStorage.setItem(key, JSON.stringify(survey));
        
        // Reset survey
        this.surveyStep = 1;
        this.surveyAnswers = {};
        this.isManualSurvey = false;
        this._completingSurvey = false;
        
        // Go to insights
        this.showView('insights');
    },

    getWeekNumber(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    },

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi
        d.setDate(diff);
        return this.formatDate(d);
    },

    startManualSurvey() {
        // Reset survey state
        this.surveyStep = 1;
        this.surveyAnswers = {};
        this.isManualSurvey = true;
        
        // Render and show survey
        this.renderSurvey();
        this.showView('survey');
    },

    checkForSurvey() {
        const entries = this.getAllEntries();
        const uniqueDays = [...new Set(entries.map(e => e.date))];
        const practiceCount = uniqueDays.length;
        
        // Vérifier si on a 7+ pratiques
        if (practiceCount < 7) return false;
        
        // Vérifier si questionnaire déjà complété cette semaine
        const weekNumber = this.getWeekNumber(new Date());
        const existing = localStorage.getItem(`weekly_survey_${weekNumber}`);
        
        if (existing) return false;
        
        // Afficher le questionnaire
        this.isManualSurvey = false;
        this.renderSurvey();
        this.showView('survey');
        return true;
    },



    loadTodayData() {
        const today = this.getToday();
        
        // Trouver la dernière session du jour
        let maxSession = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(`journey_${today}_`)) {
                const sessionNum = parseInt(key.split('_')[3]);
                if (sessionNum > maxSession) {
                    maxSession = sessionNum;
                }
            }
        }
        
        // Charger la dernière session ou créer session 1
        if (maxSession > 0) {
            const saved = localStorage.getItem(`journey_${today}_${maxSession}`);
            if (saved) {
                try {
                    this.todayData = JSON.parse(saved);
                    this.todayData.sessionIndex = maxSession;
                } catch (e) {
                    console.error('[Init] Données corrompues:', e);
                    this.todayData = { sessionIndex: maxSession, date: today };
                }
                
                // Restore data to textareas
                for (let i = 1; i <= 5; i++) {
                    const textarea = document.getElementById(`step${i}`);
                    if (textarea && this.todayData[`step${i}`]) {
                        textarea.value = this.todayData[`step${i}`];
                    }
                }
            }
        } else {
            // Première session du jour
            this.todayData = { sessionIndex: 1, date: today };
        }
    },

    saveTodayData() {
        const today = this.getToday();
        const sessionIndex = this.todayData.sessionIndex || 1;
        const key = `journey_${today}_${sessionIndex}`;
        localStorage.setItem(key, JSON.stringify(this.todayData));
    },

    restoreSession() {
        // If practice not yet started, show mood before
        if (!this.todayData.step1 && !this.todayData.completedAt) {
            document.getElementById('moodBefore')?.classList.remove('hidden');
            document.querySelectorAll('.step').forEach(el => {
                if (el.id !== 'moodBefore') el.classList.add('hidden');
            });
            return;
        }
        
        // If already completed today, show completion with actions
        if (this.todayData.completedAt) {
            const completedDate = this.todayData.completedAt.split('T')[0];
            const today = this.getToday();
            
            // Show completion screen
            document.querySelectorAll('.step').forEach(el => {
                el.classList.add('completed');
                el.classList.add('hidden');
            });
            document.getElementById('completion')?.classList.remove('hidden');
            
            // Update button text based on date
            const newPracticeBtn = document.getElementById('newPractice');
            if (newPracticeBtn) {
                if (completedDate === today) {
                    newPracticeBtn.textContent = 'Nouvelle session';
                } else {
                    newPracticeBtn.textContent = 'Nouvelle journée';
                }
            }
            return;
        }

        // Find the last filled step
        let lastFilledStep = 0;
        for (let i = 1; i <= 5; i++) {
            if (this.todayData[`step${i}`] && this.todayData[`step${i}`].trim().length > 0) {
                lastFilledStep = i;
            }
        }

        // Show and mark completed steps
        for (let i = 1; i <= lastFilledStep; i++) {
            const stepEl = document.querySelector(`[data-step="${i}"]`);
            stepEl?.classList.remove('hidden');
            stepEl?.classList.add('completed');
        }

        // Show next step to fill
        if (lastFilledStep < 5) {
            const nextStep = lastFilledStep + 1;
            const nextStepEl = document.querySelector(`[data-step="${nextStep}"]`);
            nextStepEl?.classList.remove('hidden');
            this.currentStep = nextStep;
            
            // Scroll to current step
            setTimeout(() => {
                nextStepEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        } else {
            // All 5 steps filled, show engagement step
            const engagementStep = document.querySelector(`[data-step="6"]`);
            engagementStep?.classList.remove('hidden');
            this.currentStep = 6;
            
            setTimeout(() => {
                engagementStep?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    },

    nextStep() {
        if (this.currentStep >= 6) return;
        
        // Vérifier que le step actuel est bien rempli avant d'avancer
        const currentTextarea = document.getElementById(`step${this.currentStep}`);
        if (!currentTextarea || currentTextarea.value.trim().length === 0) {
            return; // Ne pas avancer si vide
        }
        
        const currentStepEl = document.querySelector(`[data-step="${this.currentStep}"]`);
        currentStepEl?.classList.add('completed');
        
        this.currentStep++;
        const nextStepEl = document.querySelector(`[data-step="${this.currentStep}"]`);
        nextStepEl?.classList.remove('hidden');
        
        // Smooth scroll
        setTimeout(() => {
            nextStepEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    },

    completeJourney(committed) {
        this.todayData.committed = committed;
        this.todayData.completedAt = new Date().toISOString();
        this.saveTodayData();
        
        // Hide all steps
        document.querySelectorAll('.step').forEach(el => el.classList.add('hidden'));
        
        // Show mood after instead of completion
        document.getElementById('moodAfter')?.classList.remove('hidden');
        
        // Set button text
        const newPracticeBtn = document.getElementById('newPractice');
        if (newPracticeBtn) {
            newPracticeBtn.textContent = 'Nouvelle session';
        }
        
        this.updateStats();
        
        // Check if survey should be shown
        setTimeout(() => {
            if (!this.checkForSurvey()) {
                // Si pas de questionnaire, afficher completion normalement
                document.getElementById('completion')?.classList.remove('hidden');
            }
        }, 1000);
    },

    reviewPractice() {
        // Show all completed steps in read-only mode
        document.getElementById('completion')?.classList.add('hidden');
        
        for (let i = 1; i <= 6; i++) {
            const stepEl = document.querySelector(`[data-step="${i}"]`);
            stepEl?.classList.remove('hidden');
            stepEl?.classList.add('completed');
            
            // Make textareas read-only
            if (i <= 5) {
                const textarea = document.getElementById(`step${i}`);
                if (textarea) {
                    textarea.disabled = true;
                }
            }
        }
        
        // Désactiver les boutons engagement pour éviter re-completion
        document.getElementById('notToday').disabled = true;
        document.getElementById('yesToday').disabled = true;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    startNewPractice() {
    const today = this.getToday();
    const completedDate = this.todayData.completedAt ? this.todayData.completedAt.split('T')[0] : null;
    
    if (completedDate === today) {
        // Trouver le prochain numéro de session
        let maxSession = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(`journey_${today}_`)) {
                const sessionNum = parseInt(key.split('_')[3]);
                if (sessionNum > maxSession) {
                    maxSession = sessionNum;
                }
            }
        }
        
        // Créer nouvelle session
        this.currentStep = 1;
        this.todayData = { 
            sessionIndex: maxSession + 1,
            date: today
        };
        
        // Reset UI
        document.querySelectorAll('.step').forEach((el, i) => {
            el.classList.remove('completed');
            if (i === 0) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
            
            const textarea = el.querySelector('textarea');
            if (textarea) {
                textarea.disabled = false;
                textarea.value = '';
            }
        });
        
        // Re-enable engagement buttons
        const notTodayBtn = document.getElementById('notToday');
        const yesTodayBtn = document.getElementById('yesToday');
        if (notTodayBtn) notTodayBtn.disabled = false;
        if (yesTodayBtn) yesTodayBtn.disabled = false;
        
        // Hide completion and show mood before
        document.getElementById('completion')?.classList.add('hidden');
        document.getElementById('moodBefore')?.classList.remove('hidden');
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        // Different day - safe to reset
        this.resetForNewDay();
    }
},

    resetForNewDay() {
        this.currentStep = 1;
        this.todayData = {};
        
        // Reset UI
        document.querySelectorAll('.step').forEach((el, i) => {
            el.classList.remove('completed');
            if (i === 0) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
            
            // Re-enable textareas
            const textarea = el.querySelector('textarea');
            if (textarea) {
                textarea.disabled = false;
            }
        });
        
        // Clear textareas
        for (let i = 1; i <= 5; i++) {
            const textarea = document.getElementById(`step${i}`);
            if (textarea) textarea.value = '';
        }
        
        document.getElementById('completion')?.classList.add('hidden');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        this.loadTodayData();
        this.restoreSession();
    },

    updateStats() {
        const entries = this.getAllEntries();
        
        // Jours distincts (ignorer sessionIndex)
        const uniqueDays = [...new Set(entries.map(e => e.date))];
        const practiceCount = uniqueDays.length;
        
        // Total engagements sur première session de chaque jour
        const committedCount = uniqueDays.filter(day => {
            const dayEntries = entries.filter(e => e.date === day);
            const firstSession = dayEntries.find(e => (e.sessionIndex || 1) === 1);
            return firstSession && firstSession.committed;
        }).length;
        
        document.getElementById('practiceCount').textContent = practiceCount;
        document.getElementById('committedCount').textContent = committedCount;
    },

    getAllEntries() {
        const entries = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('journey_')) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.completedAt) {
                            entries.push({
                                ...parsed
                            });
                        }
                    } catch (e) {
                        console.error('[getAllEntries] Données corrompues:', key, e);
                        // Continuer sans cette entrée corrompue
                    }
                }
            }
        }
        
        // Trier par date DESC puis sessionIndex DESC
        return entries.sort((a, b) => {
            if (a.date !== b.date) {
                return b.date.localeCompare(a.date);
            }
            return (b.sessionIndex || 1) - (a.sessionIndex || 1);
        });
    },

    showView(view) {
        // Hide all views
        document.getElementById('journeyView')?.classList.add('hidden');
        document.getElementById('historyView')?.classList.add('hidden');
        document.getElementById('insightsView')?.classList.add('hidden');
        document.getElementById('settingsView')?.classList.add('hidden');
        
        // Remove active from all nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        
        if (view === 'journey') {
            document.getElementById('journeyView')?.classList.remove('hidden');
            document.getElementById('navJourney')?.classList.add('active');
        } else if (view === 'history') {
            document.getElementById('historyView')?.classList.remove('hidden');
            document.getElementById('navHistory')?.classList.add('active');
            this.renderHistory();
        } else if (view === 'insights') {
            document.getElementById('insightsView')?.classList.remove('hidden');
            document.getElementById('navInsights')?.classList.add('active');
            this.renderInsights();
        } else if (view === 'settings') {
            document.getElementById('settingsView')?.classList.remove('hidden');
            document.getElementById('navSettings')?.classList.add('active');
        } else if (view === 'survey') {
            document.getElementById('surveyView')?.classList.remove('hidden');
            // No nav active - survey has no tab
        }
    },

    renderHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        const entries = this.getAllEntries().slice(0, 30);
        
        if (entries.length === 0) {
            historyList.innerHTML = '<div class="empty-state">Aucune entrée pour le moment.<br>Commencez votre pratique aujourd\'hui.</div>';
            return;
        }
        
        historyList.innerHTML = entries.map(entry => `
            <div class="history-item">
                <div class="history-date">${this.formatDateFr(entry.date)}</div>
                <div class="history-vision">${this.truncate(entry.step2 || 'Pas de vision enregistrée', 100)}</div>
                <div class="history-action">
                    ${entry.committed ? '✓ Action engagée' : '○ Pratique complétée'}
                    ${entry.step5 ? ': ' + this.truncate(entry.step5, 60) : ''}
                </div>
            </div>
        `).join('');
    },

    formatSurveyResponses(responses) {
        if (!responses) return '';
        let html = '';
        
        // Q1 - Humeur de la semaine
        if (responses.q1_week_feeling) {
            const weekEmojiMap = {'-2': '😣', '-1': '😕', '0': '😐', '1': '🙂', '2': '😄'};
            const emoji = weekEmojiMap[responses.q1_week_feeling] || responses.q1_week_feeling;
            html += `• Humeur : ${emoji}<br>`;
        }
        
        // Q2 - Énergie
        if (responses.q2_energy) {
            const energyLevel = parseInt(responses.q2_energy) || 0;
            const energyEmoji = '🔋'.repeat(Math.max(1, Math.min(5, energyLevel)));
            html += `• Énergie : ${energyEmoji}<br>`;
        }
        
        // Q3 - Clarté mentale
        if (responses.q3_clarity) {
            const clarityEmoji = {1: '🌫️', 2: '⛅', 3: '☀️', 4: '✨'};
            html += `• Clarté : ${clarityEmoji[responses.q3_clarity] || responses.q3_clarity}<br>`;
        }
        
        // Q4 - Changement perçu
        if (responses.q4_change) {
            const changeLabel = {
                'positive': 'Oui, positif',
                'negative': 'Oui, négatif',
                'stable': 'Non, stable',
                'unknown': 'Je ne sais pas'
            };
            html += `• Changement : ${changeLabel[responses.q4_change] || responses.q4_change}<br>`;
        }
        
        // Q5 - Ce qui a aidé
        if (responses.q5_helped) {
            html += `• Aidé par : "${responses.q5_helped}"<br>`;
        }
        
        // Q6 - Ce qui a freiné
        if (responses.q6_blocked) {
            html += `• Freiné par : "${responses.q6_blocked}"<br>`;
        }
        
        // Q7 - En un mot
        if (responses.q7_word) {
            html += `• En un mot : "${responses.q7_word}"`;
        }
        
        return html;
    },

    renderInsights() {
        const entries = this.getAllEntries();
        
        // Bilan hebdomadaire
        const weekNumber = this.getWeekNumber(new Date());
        const survey = localStorage.getItem(`weekly_survey_${weekNumber}`);
        const bilanCard = document.getElementById('weeklyBilan');
        
        if (survey && bilanCard) {
            let surveyData;
            try {
                surveyData = JSON.parse(survey);
            } catch (e) {
                console.error('[Survey] Données corrompues:', e);
                bilanCard.style.display = 'none';
                // Continue sans afficher le bilan si erreur
                surveyData = null;
            }
            
            if (!surveyData) {
                bilanCard.style.display = 'none';
            } else {
                bilanCard.style.display = 'block';
                
                const last7 = entries.slice(0, 7);
                const uniqueDays = [...new Set(last7.map(e => e.date))];
                const committed = uniqueDays.filter(day => {
                    const dayEntries = last7.filter(e => e.date === day);
                    const firstSession = dayEntries.find(e => e.sessionIndex === 1);
                    return firstSession && firstSession.committed;
                }).length;
                
                let bilanHtml = `<strong>✅ Constance</strong><br>`;
                bilanHtml += `${uniqueDays.length}/7 pratiques<br>`;
                bilanHtml += `${committed}/${uniqueDays.length} engagements<br><br>`;
                
                // Humeur
                const withMood = last7.filter(e => e.moodBefore !== null && e.moodAfter !== null);
                if (withMood.length > 0) {
                    const avgBefore = withMood.reduce((sum, e) => sum + e.moodBefore, 0) / withMood.length;
                    const avgAfter = withMood.reduce((sum, e) => sum + e.moodAfter, 0) / withMood.length;
                    
                    bilanHtml += `<strong>😊 Humeur</strong><br>`;
                    bilanHtml += `Arrivée : ${avgBefore.toFixed(1)}<br>`;
                    bilanHtml += `Départ : ${avgAfter.toFixed(1)}<br>`;
                    bilanHtml += `Impact : ${(avgAfter - avgBefore > 0 ? '+' : '')}${(avgAfter - avgBefore).toFixed(1)}<br><br>`;
                }
                
                // Réponses questionnaire
                if (surveyData.responses) {
                    const r = surveyData.responses;
                    bilanHtml += `<strong>🗨️ Cette semaine tu as dit :</strong><br>`;
                    
                    const feelingEmoji = {'-2': '😣', '-1': '😕', '0': '😐', '1': '🙂', '2': '😄'};
                    if (r.q1_week_feeling !== undefined) {
                        bilanHtml += `• Semaine : ${feelingEmoji[String(r.q1_week_feeling)]} <br>`;
                    }
                    if (r.q2_energy) {
                        bilanHtml += `• Énergie : ${'🔋'.repeat(r.q2_energy)}<br>`;
                    }
                    if (r.q3_clarity) {
                        const clarityEmoji = {1: '🌫️', 2: '⛅', 3: '☀️', 4: '✨'};
                        bilanHtml += `• Clarté : ${clarityEmoji[r.q3_clarity]}<br>`;
                    }
                    if (r.q4_change) {
                        const changeLabel = {
                            'positive': 'Oui, positif',
                            'negative': 'Oui, négatif',
                            'stable': 'Non, stable',
                            'unknown': 'Je ne sais pas'
                        };
                        bilanHtml += `• Changement : ${changeLabel[r.q4_change]}<br>`;
                    }
                    if (r.q5_helped) {
                        bilanHtml += `• Aidé par : "${r.q5_helped}"<br>`;
                    }
                    if (r.q6_blocked) {
                        bilanHtml += `• Freiné par : "${r.q6_blocked}"<br>`;
                    }
                    if (r.q7_word) {
                        bilanHtml += `• En un mot : "${r.q7_word}"`;
                    }
                }
                
                document.getElementById('bilanContent').innerHTML = bilanHtml;
                
                // Afficher les bilans manuels
                let manualBilansHtml = '';
                const manualSurveys = [];
                
                // Récupérer tous les bilans manuels
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('weekly_survey_manual_')) {
                        try {
                            const data = JSON.parse(localStorage.getItem(key));
                            if (data && data.completedAt) {
                                manualSurveys.push({
                                    key: key,
                                    timestamp: parseInt(key.replace('weekly_survey_manual_', '')),
                                    data: data
                                });
                            }
                        } catch (e) {
                            console.error('Erreur parsing bilan manuel:', e);
                        }
                    }
                }
                
                // Trier par date décroissante (plus récents en premier)
                manualSurveys.sort((a, b) => b.timestamp - a.timestamp);
                
                // Afficher les 3 plus récents
                if (manualSurveys.length > 0) {
                    const bilansToShow = manualSurveys.slice(0, 3);
                    manualBilansHtml = '<h3 style="margin-top: 20px;">📋 Bilans manuels récents</h3>';
                    bilansToShow.forEach(bilan => {
                        const date = new Date(bilan.timestamp);
                        const dateStr = date.toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        const responsesHtml = this.formatSurveyResponses(bilan.data.responses || {});
                        manualBilansHtml += `
                            <div class="insight-card" style="margin-bottom: 15px;">
                                <div style="font-size: 12px; color: #999; margin-bottom: 10px;">📅 ${dateStr}</div>
                                <div style="font-size: 13px; line-height: 1.6;">${responsesHtml}</div>
                            </div>
                        `;
                    });
                    document.getElementById('bilanContent').innerHTML += manualBilansHtml;
                }
            }
        } else if (bilanCard) {
            bilanCard.style.display = 'none';
        }
        
        const last30 = entries.slice(0, 30);
        
        // Constance
        const constanceCount = last30.length;
        document.getElementById('insightConstance').textContent = `${constanceCount}/30`;
        
        if (constanceCount === 0) {
            document.getElementById('insightConstanceText').textContent = 'Commencez votre pratique pour voir votre progression';
        } else if (constanceCount < 7) {
            document.getElementById('insightConstanceText').textContent = 'Vous êtes au début de votre parcours. Continuez.';
        } else if (constanceCount < 15) {
            document.getElementById('insightConstanceText').textContent = 'Votre constance se construit. Vous êtes sur la bonne voie.';
        } else if (constanceCount < 25) {
            document.getElementById('insightConstanceText').textContent = 'Votre pratique devient une habitude solide.';
        } else {
            document.getElementById('insightConstanceText').textContent = 'Vous êtes extrêmement constant. C\'est remarquable.';
        }
        
        // Mood insights (last 7 days)
        const last7 = entries.slice(0, 7);
        const moodsBefore = last7.filter(entry => entry.moodBefore !== null && entry.moodBefore !== undefined).map(e => e.moodBefore);
        const moodsAfter = last7.filter(entry => entry.moodAfter !== null && entry.moodAfter !== undefined).map(e => e.moodAfter);
        
        const moodInsightEl = document.getElementById('moodInsight');
        if (moodInsightEl) {
            if (moodsBefore.length > 0 && moodsAfter.length > 0) {
                const avgBefore = moodsBefore.reduce((a, b) => a + b, 0) / moodsBefore.length;
                const avgAfter = moodsAfter.reduce((a, b) => a + b, 0) / moodsAfter.length;
                const improvement = Math.round((avgAfter - avgBefore) * 10) / 10;
                const improvementPercent = Math.round((improvement / 4) * 100);
                
                // Emoji representation
                const moodEmojis = { '-2': '😢', '-1': '😟', '0': '😐', '1': '🙂', '2': '😊' };
                const beforeEmoji = moodEmojis[avgBefore.toFixed(1)] || moodEmojis[Math.round(avgBefore)];
                const afterEmoji = moodEmojis[avgAfter.toFixed(1)] || moodEmojis[Math.round(avgAfter)];
                
                moodInsightEl.innerHTML = `
                    <div style="text-align: center;">
                        <div style="font-size: 24px; margin: 10px 0;">${beforeEmoji} → ${afterEmoji}</div>
                        <div style="font-size: 14px; color: #666;">Avant → Après</div>
                        <div style="font-size: 18px; margin-top: 10px; font-weight: bold; color: ${improvement > 0 ? '#4CAF50' : '#FF6B6B'};">
                            ${improvement > 0 ? '+' : ''}${improvement.toFixed(1)}
                        </div>
                        <div style="font-size: 12px; color: #999;">Amélioration de l'humeur cette semaine</div>
                    </div>
                `;
            } else {
                moodInsightEl.innerHTML = '<div style="text-align: center; color: #999; font-size: 12px;">Enregistrez votre humeur pour voir votre progression 📊</div>';
            }
        }
        
        // Days grid (last 30 days)
        this.renderDaysGrid();
        
        // Top visions
        this.renderTopItems('step2', 'topVisions', 'Pas encore de visions enregistrées');
        
        // Top obstacles
        this.renderTopItems('step3', 'topObstacles', 'Aucun obstacle identifié pour le moment');
        
        // Top actions
        this.renderTopItems('step5', 'topActions', 'Aucune action enregistrée encore');
        
        // Power days
        this.renderPowerDays(entries);
        
        // Evolution
        this.renderEvolution(entries);
    },

    renderDaysGrid() {
        const grid = document.getElementById('daysGrid');
        if (!grid) return;
        
        const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
        let html = '';
        
        // Add day labels
        days.forEach(day => {
            html += `<div class="day-cell">${day}</div>`;
        });
        
        // Get data for last 30 days
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 29);
        
        // Calculate offset for first day
        const firstDayOfWeek = startDate.getDay();
        const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        
        // Add empty cells for offset
        for (let i = 0; i < offset; i++) {
            html += '<div class="day-cell"></div>';
        }
        
        // Add days
        for (let i = 0; i < 30; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = this.formatDate(date);
            
            // Check if any session was completed on this day
            let className = 'day-cell';
            let hasCompletedSession = false;
            let isCommitted = false;
            
            for (let j = 0; j < localStorage.length; j++) {
                const key = localStorage.key(j);
                if (key && key.startsWith(`journey_${dateStr}_`)) {
                    const data = localStorage.getItem(key);
                    if (data) {
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.completedAt) {
                                hasCompletedSession = true;
                                if (parsed.committed) {
                                    isCommitted = true;
                                    break; // Prioritize committed sessions
                                }
                            }
                        } catch (e) {
                            // Ignorer données corrompues
                        }
                    }
                }
            }
            
            if (hasCompletedSession) {
                className += isCommitted ? ' committed' : ' active';
            }
            
            html += `<div class="${className}">${date.getDate()}</div>`;
        }
        
        grid.innerHTML = html;
    },

    renderTopItems(field, elementId, emptyMessage) {
        const entries = this.getAllEntries();
        const items = {};
        
        entries.forEach(entry => {
            const text = entry[field];
            if (text && text.trim().length > 0) {
                // Extract key phrases (simple word frequency)
                const words = text.toLowerCase()
                    .replace(/[^\w\sàâäéèêëïîôùûüÿæœç]/g, '')
                    .split(/\s+/)
                    .filter(w => w.length > 4); // Only words > 4 chars
                
                words.forEach(word => {
                    items[word] = (items[word] || 0) + 1;
                });
            }
        });
        
        const sorted = Object.entries(items)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
        
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (sorted.length === 0) {
            element.innerHTML = `<li style="text-align: center; color: var(--text-light); border: none;">${emptyMessage}</li>`;
            return;
        }
        
        element.innerHTML = sorted.map(([word, count]) => 
            `<li>${word.charAt(0).toUpperCase() + word.slice(1)}<span class="count">${count}×</span></li>`
        ).join('');
    },

    renderPowerDays(entries) {
        const dayStats = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        const dayCommitted = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        
        entries.forEach(entry => {
            const date = new Date(entry.date + 'T00:00:00');
            const day = date.getDay();
            dayStats[day]++;
            if (entry.committed) {
                dayCommitted[day]++;
            }
        });
        
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const percentages = Object.keys(dayStats).map(day => ({
            day: parseInt(day),
            name: dayNames[day],
            total: dayStats[day],
            committed: dayCommitted[day],
            percentage: dayStats[day] > 0 ? Math.round((dayCommitted[day] / dayStats[day]) * 100) : 0
        }));
        
        const sorted = percentages
            .filter(d => d.total >= 2) // Need at least 2 occurrences
            .sort((a, b) => b.percentage - a.percentage);
        
        const element = document.getElementById('powerDaysText');
        if (!element) return;
        
        if (sorted.length === 0) {
            element.textContent = 'Continuez votre pratique pour identifier vos jours de puissance';
            return;
        }
        
        const top = sorted[0];
        element.textContent = `Votre jour le plus engagé : ${top.name} (${top.percentage}% d'engagement)`;
    },

    renderEvolution(entries) {
        const element = document.getElementById('evolutionText');
        if (!element) return;
        
        if (entries.length < 7) {
            element.textContent = 'Continuez votre pratique pour voir votre évolution';
            return;
        }
        
        // Compare first week vs last week
        const lastWeek = entries.slice(0, 7);
        const firstWeek = entries.slice(-7);
        
        const lastWeekAvgLength = lastWeek.reduce((sum, e) => sum + (e.step5 || '').length, 0) / 7;
        const firstWeekAvgLength = firstWeek.reduce((sum, e) => sum + (e.step5 || '').length, 0) / 7;
        
        if (lastWeekAvgLength > firstWeekAvgLength * 1.2) {
            element.textContent = 'Vos micro-pas deviennent plus précis et détaillés au fil du temps.';
        } else if (entries.length >= 14) {
            const recentCommitment = lastWeek.filter(e => e.committed).length;
            const olderCommitment = firstWeek.filter(e => e.committed).length;
            
            if (recentCommitment > olderCommitment) {
                element.textContent = 'Votre taux d\'engagement augmente. Vous passez de plus en plus à l\'action.';
            } else {
                element.textContent = 'Votre pratique est stable. La constance crée la transformation.';
            }
        } else {
            element.textContent = 'Votre pratique progresse. Continuez sur cette voie.';
        }
    },

    exportData() {
        const allData = this.getAllEntries();
        
        if (allData.length === 0) {
            alert('Aucune donnée à exporter');
            return;
        }
        
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `clarte_export_${this.getToday()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                
                if (!Array.isArray(imported)) {
                    alert('Format de fichier invalide');
                    return;
                }
                
                // Merge imported data
                let importedCount = 0;
                imported.forEach(entry => {
                    if (entry.completedAt) {
                        const sessionIndex = entry.sessionIndex || 1;
                        const date = entry.date || entry.completedAt.split('T')[0];
                        const key = `journey_${date}_${sessionIndex}`;
                        const existing = localStorage.getItem(key);
                        if (!existing) {
                            localStorage.setItem(key, JSON.stringify({
                                ...entry,
                                date: date,
                                sessionIndex: sessionIndex
                            }));
                            importedCount++;
                        }
                    }
                });
                
                alert(`${importedCount} pratique(s) importée(s) avec succès`);
                this.updateStats();
                
                // Reset file input
                event.target.value = '';
            } catch (err) {
                alert('Erreur lors de l\'import : fichier invalide');
            }
        };
        reader.readAsText(file);
    },

    confirmReset() {
        this.showModal(
            'Tout effacer ?',
            'Cette action supprimera définitivement toutes vos données. Cette action est irréversible. Êtes-vous absolument sûr ?',
            () => {
                // Second confirmation
                this.showModal(
                    'Dernière confirmation',
                    'Toutes vos pratiques seront perdues. Voulez-vous vraiment continuer ?',
                    () => this.resetAllData(),
                    'Oui, tout effacer'
                );
            },
            'Continuer'
        );
    },

    resetAllData() {
        // Remove all journey entries and weekly surveys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('journey_') || key.startsWith('weekly_survey_')) {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Reset current state
        this.todayData = {};
        this.surveyStep = 1;
        this.surveyAnswers = {};
        this.resetForNewDay();
        this.updateStats();
        
        alert('Toutes vos données ont été supprimées');
    },

    showModal(title, text, confirmCallback, confirmText = 'Confirmer', cancelCallback = null, cancelText = 'Annuler') {
        const modalTitle = document.getElementById('modalTitle');
        const modalText = document.getElementById('modalText');
        const modalConfirm = document.getElementById('modalConfirm');
        const modalCancel = document.getElementById('modalCancel');
        if (modalTitle) modalTitle.textContent = title;
        if (modalText) modalText.textContent = text;
        if (modalConfirm) modalConfirm.textContent = confirmText;
        if (modalCancel) modalCancel.textContent = cancelText;
        
        this.confirmCallback = confirmCallback;
        this.cancelCallback = cancelCallback;
        
        document.getElementById('confirmModal')?.classList.add('active');
    },

    hideModal() {
        document.getElementById('confirmModal')?.classList.remove('active');
        this.confirmCallback = null;
        this.cancelCallback = null;
    },

    truncate(str, len) {
        return str.length > len ? str.substring(0, len) + '...' : str;
    },

    getToday() {
        return this.formatDate(new Date());
    },

    formatDate(date) {
        return date.toISOString().split('T')[0];
    },

    formatDateFr(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('fr-FR', options);
    }
};

// Initialize app
app.init();

// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed:', err));
}
