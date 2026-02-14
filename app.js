// app.js  
const app = {  
    currentStep: 1,  
    todayData: {},  
      
    init() {  
        this.loadTodayData();  
        this.updateStats();  
        this.setupEventListeners();  
        this.restoreSession();  
    },  
  
    setupEventListeners() {  
        // Auto-save on input  
        for (let i = 1; i <= 5; i++) {  
            const textarea = document.getElementById(`step${i}`);  
            textarea?.addEventListener('input', (e) => {  
                this.todayData[`step${i}`] = e.target.value;  
                this.saveTodayData();  
                  
                // Auto-advance when there's meaningful content  
                if (e.target.value.trim().length > 10 && i < 6 && !this.todayData.completedAt) {  
                    setTimeout(() => this.nextStep(), 500);  
                }  
            });  
        }  
  
        // Engagement buttons  
        document.getElementById('notToday')?.addEventListener('click', () => this.completeJourney(false));  
        document.getElementById('yesToday')?.addEventListener('click', () => this.completeJourney(true));  
        document.getElementById('newDay')?.addEventListener('click', () => this.resetForNewDay());  
  
        // Navigation  
        document.getElementById('navJourney')?.addEventListener('click', () => this.showView('journey'));  
        document.getElementById('navHistory')?.addEventListener('click', () => this.showView('history'));  
        document.getElementById('navInsights')?.addEventListener('click', () => this.showView('insights'));  
  
        // Export  
        document.getElementById('exportData')?.addEventListener('click', () => this.exportData());  
    },  
  
    loadTodayData() {  
        const today = this.getToday();  
        const saved = localStorage.getItem(`journey_${today}`);  
          
        if (saved) {  
            this.todayData = JSON.parse(saved);  
              
            // Restore data to textareas  
            for (let i = 1; i <= 5; i++) {  
                const textarea = document.getElementById(`step${i}`);  
                if (textarea && this.todayData[`step${i}`]) {  
                    textarea.value = this.todayData[`step${i}`];  
                }  
            }  
        }  
    },  
  
    saveTodayData() {  
        const today = this.getToday();  
        localStorage.setItem(`journey_${today}`, JSON.stringify(this.todayData));  
    },  
  
    restoreSession() {  
        // If already completed today, show completion  
        if (this.todayData.completedAt) {  
            document.querySelectorAll('.step').forEach(el => {  
                el.classList.add('completed');  
                el.classList.add('hidden');  
            });  
            document.getElementById('completion')?.classList.remove('hidden');  
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
          
        // Show completion  
        document.getElementById('completion')?.classList.remove('hidden');  
          
        this.updateStats();  
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
        });  
          
        // Clear textareas  
        for (let i = 1; i <= 5; i++) {  
            const textarea = document.getElementById(`step${i}`);  
            if (textarea) textarea.value = '';  
        }  
          
        document.getElementById('completion')?.classList.add('hidden');  
          
        this.loadTodayData();  
        this.restoreSession();  
    },  
  
    updateStats() {  
        const entries = this.getAllEntries();  
        const practiceCount = entries.length;  
        const committedCount = entries.filter(e => e.committed).length;  
          
        document.getElementById('practiceCount').textContent = practiceCount;  
        document.getElementById('committedCount').textContent = committedCount;  
    },  
  
    getAllEntries() {  
        const entries = [];  
          
        for (let i = 0; i < 365; i++) {  
            const date = new Date();  
            date.setDate(date.getDate() - i);  
            const dateStr = this.formatDate(date);  
            const data = localStorage.getItem(`journey_${dateStr}`);  
              
            if (data) {  
                const parsed = JSON.parse(data);  
                if (parsed.completedAt) {  
                    entries.push({  
                        date: dateStr,  
                        ...parsed  
                    });  
                }  
            }  
        }  
          
        return entries;  
    },  
  
    showView(view) {  
        // Hide all views  
        document.getElementById('journeyView')?.classList.add('hidden');  
        document.getElementById('historyView')?.classList.add('hidden');  
        document.getElementById('insightsView')?.classList.add('hidden');  
          
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
  
    renderInsights() {  
        const entries = this.getAllEntries();  
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
            const data = localStorage.getItem(`journey_${dateStr}`);  
              
            let className = 'day-cell';  
            if (data) {  
                const parsed = JSON.parse(data);  
                if (parsed.completedAt) {  
                    className += parsed.committed ? ' committed' : ' active';  
                }  
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
          
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });  
        const url = URL.createObjectURL(blob);  
        const a = document.createElement('a');  
        a.href = url;  
        a.download = `clarte_export_${this.getToday()}.json`;  
        a.click();  
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
