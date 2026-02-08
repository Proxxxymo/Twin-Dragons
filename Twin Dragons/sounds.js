/* ============================================================
   TWIN DRAGONS — Звуковой движок (Web Audio API)
   ============================================================
   Все звуки генерируются программно — никаких внешних файлов.
   ============================================================ */

// Глобальный аудио-контекст (создаётся при первом действии пользователя)
var audioCtx = null;
var soundEnabled = true;
var masterVolume = 0.4; // Общая громкость (0.0 — 1.0)

// Инициализация аудио-контекста (вызывается при первом клике)
function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('Web Audio API не поддерживается');
        soundEnabled = false;
    }
}

// Проверка: можно ли воспроизводить звук
function canPlaySound() {
    if (!soundEnabled || !audioCtx) return false;
    // Браузеры блокируют звук до первого взаимодействия
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return true;
}

// ==================== БАЗОВЫЕ ЗВУКОВЫЕ УТИЛИТЫ ====================

// Создать осциллятор с заданными параметрами
function createOsc(type, freq, startTime, duration, gainValue) {
    if (!canPlaySound()) return;

    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(gainValue * masterVolume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);

    return { osc: osc, gain: gain };
}

// Создать шум (для эффектов удара, шипения, и т.д.)
function createNoise(startTime, duration, gainValue, filterFreq, filterType) {
    if (!canPlaySound()) return;

    var bufferSize = audioCtx.sampleRate * duration;
    var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var data = buffer.getChannelData(0);

    for (var i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    var noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    var gain = audioCtx.createGain();
    gain.gain.setValueAtTime(gainValue * masterVolume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    var filter = audioCtx.createBiquadFilter();
    filter.type = filterType || 'lowpass';
    filter.frequency.setValueAtTime(filterFreq || 2000, startTime);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start(startTime);
    noise.stop(startTime + duration);
}

// ==================== ЗВУКОВЫЕ ЭФФЕКТЫ ====================

// 1. Нажатие кнопки — короткий мягкий клик
function playClickSound() {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    createOsc('sine', 800, t, 0.06, 0.15);
    createOsc('sine', 1200, t + 0.01, 0.04, 0.08);
}

// 2. Старт вращения — нарастающий свист
function playSpinStartSound() {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.3);

    gain.gain.setValueAtTime(0.08 * masterVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    var filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(2000, t + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + 0.4);
}

// 3. Остановка одного барабана — глухой стук
function playReelStopSound(reelIndex) {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    // Стук (низкий тон)
    createOsc('sine', 80 + reelIndex * 15, t, 0.1, 0.2);
    // Щелчок
    createNoise(t, 0.04, 0.12, 3000, 'highpass');
}

// 4. Выигрыш по линиям — весёлая восходящая мелодия
function playWinSound() {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    var notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    for (var i = 0; i < notes.length; i++) {
        createOsc('sine', notes[i], t + i * 0.1, 0.25, 0.12);
        createOsc('triangle', notes[i] * 2, t + i * 0.1, 0.15, 0.04);
    }
}

// 5. Большой выигрыш — расширенная фанфара
function playBigWinSound() {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    // Аккорд C мажор с арпеджио
    var notes = [262, 330, 392, 523, 659, 784, 1047, 1319];
    for (var i = 0; i < notes.length; i++) {
        createOsc('sine', notes[i], t + i * 0.08, 0.5, 0.1);
        createOsc('triangle', notes[i], t + i * 0.08, 0.4, 0.05);
    }

    // Финальный аккорд
    createOsc('sine', 1047, t + 0.7, 0.8, 0.12);
    createOsc('sine', 1319, t + 0.7, 0.8, 0.08);
    createOsc('sine', 1568, t + 0.7, 0.8, 0.06);
}

// 6. Scatter выпал — магический звон
function playScatterSound() {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    // Высокий колокольчик
    createOsc('sine', 1200, t, 0.4, 0.12);
    createOsc('sine', 1800, t + 0.05, 0.35, 0.08);
    createOsc('sine', 2400, t + 0.1, 0.3, 0.06);

    // Мерцание
    createOsc('sine', 3000, t + 0.15, 0.5, 0.04);
    createOsc('sine', 3600, t + 0.2, 0.4, 0.03);
}

// 7. Запуск фриспинов — эпический нарастающий аккорд
function playFreeSpinsStartSound() {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    // Низкий нарастающий гул
    var osc1 = audioCtx.createOscillator();
    var gain1 = audioCtx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(80, t);
    osc1.frequency.exponentialRampToValueAtTime(200, t + 1.0);
    gain1.gain.setValueAtTime(0.06 * masterVolume, t);
    gain1.gain.setValueAtTime(0.12 * masterVolume, t + 0.5);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(t);
    osc1.stop(t + 1.5);

    // Восходящие ноты
    var melody = [262, 330, 392, 523, 659, 784, 1047];
    for (var i = 0; i < melody.length; i++) {
        createOsc('sine', melody[i], t + 0.3 + i * 0.12, 0.4, 0.1);
    }

    // Финальный мощный аккорд
    createOsc('sine', 523, t + 1.2, 1.0, 0.12);
    createOsc('sine', 659, t + 1.2, 1.0, 0.10);
    createOsc('sine', 784, t + 1.2, 1.0, 0.08);
    createOsc('sine', 1047, t + 1.2, 1.0, 0.06);

    // Шиммер
    createNoise(t + 1.2, 0.8, 0.04, 6000, 'highpass');
}

// 8. Ледяное дыхание — свистящий холодный звук
function playIceBreathSound() {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    // Высокий свист (ветер)
    createNoise(t, 0.8, 0.15, 4000, 'highpass');

    // Нарастающий тон льда
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, t);
    osc.frequency.exponentialRampToValueAtTime(4000, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(1500, t + 0.6);
    gain.gain.setValueAtTime(0.03 * masterVolume, t);
    gain.gain.setValueAtTime(0.08 * masterVolume, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.7);

    // Кристаллический звон
    createOsc('sine', 3000, t + 0.1, 0.3, 0.04);
    createOsc('sine', 4500, t + 0.15, 0.25, 0.03);
}

// 9. Огненное дыхание — низкий рёв с треском
function playFireBreathSound() {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    // Низкий рёв
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.8);
    gain.gain.setValueAtTime(0.1 * masterVolume, t);
    gain.gain.setValueAtTime(0.18 * masterVolume, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    var filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, t);
    filter.frequency.exponentialRampToValueAtTime(800, t + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.9);

    // Треск огня
    createNoise(t, 0.6, 0.1, 2000, 'bandpass');
    createNoise(t + 0.1, 0.4, 0.06, 5000, 'highpass');
}

// 10. Разбивание шкалы — звук взрыва/разбития
function playScaleBreakSound(type) {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    // Удар
    createOsc('sine', 60, t, 0.3, 0.25);

    // Разлёт осколков
    createNoise(t, 0.5, 0.2, 3000, 'highpass');

    if (type === 'ice') {
        // Ледяное разбитие — высокий звон осколков
        createOsc('sine', 2000, t + 0.05, 0.4, 0.08);
        createOsc('sine', 3000, t + 0.08, 0.35, 0.06);
        createOsc('sine', 4500, t + 0.12, 0.3, 0.04);
        createOsc('sine', 6000, t + 0.15, 0.25, 0.03);
    } else {
        // Огненный взрыв — низкий гул + треск
        createOsc('sawtooth', 80, t + 0.05, 0.5, 0.12);
        createNoise(t + 0.05, 0.6, 0.15, 1500, 'lowpass');
        createOsc('sine', 200, t + 0.1, 0.3, 0.08);
    }
}

// 11. Уведомление / результат бонуса — фанфарный аккорд
function playNotificationSound() {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    createOsc('sine', 392, t, 0.6, 0.1);      // G4
    createOsc('sine', 523, t, 0.6, 0.08);      // C5
    createOsc('sine', 659, t, 0.6, 0.06);      // E5
    createOsc('triangle', 784, t + 0.15, 0.5, 0.05); // G5
    createOsc('triangle', 1047, t + 0.3, 0.6, 0.06);  // C6
}

// 12. Монетки (при начислении выигрыша) — звон монет
function playCoinSound() {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    for (var i = 0; i < 4; i++) {
        var delay = i * 0.06;
        createOsc('sine', 2500 + Math.random() * 1500, t + delay, 0.08, 0.06);
        createOsc('square', 4000 + Math.random() * 2000, t + delay, 0.04, 0.02);
    }
}

// 13. Тик шкалы температуры — короткий тон
function playTempTickSound(direction) {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;

    if (direction === 'cold') {
        // Нисходящий тон (холод)
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.15);
        gain.gain.setValueAtTime(0.1 * masterVolume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    } else {
        // Восходящий тон (жар)
        var osc2 = audioCtx.createOscillator();
        var gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(400, t);
        osc2.frequency.exponentialRampToValueAtTime(800, t + 0.15);
        gain2.gain.setValueAtTime(0.1 * masterVolume, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(t);
        osc2.stop(t + 0.2);
    }
}

// 14. Звук вращения (тикающий фон во время спина)
function playReelTickSound() {
    if (!canPlaySound()) return;
    var t = audioCtx.currentTime;
    createOsc('square', 200 + Math.random() * 100, t, 0.02, 0.03);
}
