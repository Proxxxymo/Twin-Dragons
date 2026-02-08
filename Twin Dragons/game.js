/* ============================================================
   TWIN DRAGONS — Игровая логика слота
   ============================================================
   Все тексты на русском языке.
   Код написан просто, без классов и наследования.
   ============================================================ */

// ==================== КОНФИГУРАЦИЯ СИМВОЛОВ ====================

// Каждый символ: id, иконка для отображения, название, тип, выплаты [x1, x2, x3, x4, x5]
// Выплаты указаны как множитель к ставке на линию
var SYMBOLS = {
    '9':            { icon: '9',  label: '9',           type: 'low',     pay: [0, 0, 5,   15,  50]  },
    '10':           { icon: '10', label: '10',          type: 'low',     pay: [0, 0, 5,   15,  50]  },
    'J':            { icon: 'J',  label: 'Валет',       type: 'low',     pay: [0, 0, 5,   20,  75]  },
    'Q':            { icon: 'Q',  label: 'Дама',        type: 'low',     pay: [0, 0, 10,  25,  100] },
    'K':            { icon: 'K',  label: 'Король',      type: 'low',     pay: [0, 0, 10,  30,  125] },
    'A':            { icon: 'A',  label: 'Туз',         type: 'low',     pay: [0, 0, 15,  40,  150] },
    'SWORD':        { icon: '⚔',  label: 'Меч',        type: 'medium',  pay: [0, 0, 20,  60,  200] },
    'SHIELD':       { icon: '🛡', label: 'Щит',        type: 'medium',  pay: [0, 0, 25,  75,  250] },
    'RUNE':         { icon: 'ᚱ',  label: 'Руна',       type: 'medium',  pay: [0, 0, 30,  100, 300] },
    'CRYSTAL':      { icon: '💎', label: 'Кристалл',   type: 'medium',  pay: [0, 0, 40,  125, 400] },
    'ICE_DRAGON':   { icon: '🐲', label: 'Лед. Дракон',type: 'high',    pay: [0, 0, 50,  200, 750] },
    'FIRE_DRAGON':  { icon: '🐉', label: 'Огн. Дракон',type: 'high',    pay: [0, 0, 50,  200, 750] },
    'EGG':          { icon: '🥚', label: 'Яйцо',       type: 'high',    pay: [0, 0, 75,  300, 1000]},
    'WILD':         { icon: 'W',  label: 'Wild',        type: 'wild',    pay: [0, 0, 100, 500, 2000]},
    'SCATTER':      { icon: '☯',  label: 'Scatter',     type: 'scatter', pay: [0, 0, 0,   0,   0]  }
};

// Список ID символов для быстрого доступа
var SYMBOL_IDS = Object.keys(SYMBOLS);

// ==================== ВЕСА СИМВОЛОВ НА БАРАБАНАХ ====================
// Чем больше вес — тем чаще выпадает символ
// ТЕСТОВЫЙ РЕЖИМ: повышенные шансы Wild и Scatter для демонстрации фриспинов
// Для продакшена: Wild: 3, Scatter: 2
var SYMBOL_WEIGHTS = {
    '9': 16, '10': 16, 'J': 14, 'Q': 13, 'K': 12, 'A': 11,
    'SWORD': 8, 'SHIELD': 8, 'RUNE': 7, 'CRYSTAL': 6,
    'ICE_DRAGON': 4, 'FIRE_DRAGON': 4, 'EGG': 3,
    'WILD': 10, 'SCATTER': 8
};

// Общий вес для расчёта вероятностей
var TOTAL_WEIGHT = 0;
for (var key in SYMBOL_WEIGHTS) {
    TOTAL_WEIGHT += SYMBOL_WEIGHTS[key];
}

// ==================== 20 ЛИНИЙ ВЫПЛАТ ====================
// Каждая линия — массив из 5 чисел: индекс ряда (0=верх, 1=середина, 2=низ) для каждого барабана
var PAYLINES = [
    [1,1,1,1,1],  // Линия 1:  средний ряд
    [0,0,0,0,0],  // Линия 2:  верхний ряд
    [2,2,2,2,2],  // Линия 3:  нижний ряд
    [0,1,2,1,0],  // Линия 4:  V-образная
    [2,1,0,1,2],  // Линия 5:  перевёрнутая V
    [0,0,1,2,2],  // Линия 6:  спуск слева направо
    [2,2,1,0,0],  // Линия 7:  подъём слева направо
    [1,0,0,0,1],  // Линия 8:  верхняя дуга
    [1,2,2,2,1],  // Линия 9:  нижняя дуга
    [0,1,1,1,0],  // Линия 10: мягкая дуга вверху
    [2,1,1,1,2],  // Линия 11: мягкая дуга внизу
    [1,0,1,0,1],  // Линия 12: зигзаг верх
    [1,2,1,2,1],  // Линия 13: зигзаг низ
    [0,1,0,1,0],  // Линия 14: волна верх
    [2,1,2,1,2],  // Линия 15: волна низ
    [1,1,0,1,1],  // Линия 16: выступ вверх
    [1,1,2,1,1],  // Линия 17: выступ вниз
    [0,2,0,2,0],  // Линия 18: широкий зигзаг верх
    [2,0,2,0,2],  // Линия 19: широкий зигзаг низ
    [0,2,2,2,0]   // Линия 20: широкая нижняя дуга
];

// ==================== СТАВКИ ====================
var BET_LEVELS = [0.20, 0.40, 1.00, 2.00, 5.00, 10.00, 20.00, 50.00, 100.00];
var LINES_COUNT = 20;

// ==================== СОСТОЯНИЕ ИГРЫ ====================
var game = {
    balance: 10000.00,       // Баланс игрока
    betIndex: 6,             // Индекс текущей ставки (20.00)
    lastWin: 0,              // Последний выигрыш
    isSpinning: false,       // Идёт ли вращение
    autoSpin: false,         // Автоспин включён
    autoSpinCount: 0,        // Оставшихся автоспинов

    // Барабаны: 5 столбцов по 3 символа (ID символов)
    reels: [
        ['9', 'SWORD', 'A'],
        ['10', 'CRYSTAL', 'K'],
        ['J', 'WILD', 'Q'],
        ['SHIELD', 'EGG', '9'],
        ['A', 'RUNE', '10']
    ],

    // Фриспины
    isFreeSpins: false,      // Режим фриспинов
    freeSpinsLeft: 0,        // Оставшихся фриспинов
    freeSpinsTotal: 0,       // Всего фриспинов выдано
    freeSpinsUsed: 0,        // Использовано фриспинов
    freeSpinsWin: 0,         // Суммарный выигрыш за бонус
    freeSpinsBet: 0,         // Ставка, зафиксированная на момент входа

    // Шкала температуры
    temperature: 0,          // Текущая температура (-30 ... +30)

    // Скорость вращения (мс задержки между барабанами)
    spinSpeed: 'normal'      // 'fast', 'normal', 'slow'
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

// Выбор случайного символа по весам
function getRandomSymbol() {
    var roll = Math.random() * TOTAL_WEIGHT;
    var cumulative = 0;
    for (var id in SYMBOL_WEIGHTS) {
        cumulative += SYMBOL_WEIGHTS[id];
        if (roll < cumulative) {
            return id;
        }
    }
    return '9'; // На всякий случай
}

// Генерация результата одного барабана (3 символа)
function generateReelResult() {
    return [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
}

// Генерация результата всех 5 барабанов
function generateSpinResult() {
    return [
        generateReelResult(),
        generateReelResult(),
        generateReelResult(),
        generateReelResult(),
        generateReelResult()
    ];
}

// Получить символ на позиции [барабан][ряд]
function getSymbolAt(reels, reelIndex, rowIndex) {
    return reels[reelIndex][rowIndex];
}

// Текущая общая ставка
function getTotalBet() {
    return BET_LEVELS[game.betIndex];
}

// Ставка на одну линию
function getBetPerLine() {
    return getTotalBet() / LINES_COUNT;
}

// Форматирование числа с разделителями
function formatMoney(value) {
    return value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// ==================== РАСЧЁТ ВЫИГРЫШЕЙ ====================

// Проверяет одну линию выплат и возвращает выигрыш
// Возвращает { symbolId, count, pay } или null если нет выигрыша
function evaluateLine(reels, linePattern) {
    // Получаем символы на линии
    var lineSymbols = [];
    for (var i = 0; i < 5; i++) {
        lineSymbols.push(getSymbolAt(reels, i, linePattern[i]));
    }

    // Определяем первый не-Wild символ слева
    var baseSymbol = null;
    for (var i = 0; i < 5; i++) {
        if (lineSymbols[i] !== 'WILD' && lineSymbols[i] !== 'SCATTER') {
            baseSymbol = lineSymbols[i];
            break;
        } else if (lineSymbols[i] === 'SCATTER') {
            // Scatter не участвует в линиях, прерываем
            break;
        }
    }

    // Если все символы — Wild, считаем как комбинацию Wild
    if (baseSymbol === null) {
        // Проверяем, есть ли хотя бы Wild-символы подряд
        var wildCount = 0;
        for (var i = 0; i < 5; i++) {
            if (lineSymbols[i] === 'WILD') {
                wildCount++;
            } else {
                break;
            }
        }
        if (wildCount >= 3) {
            return {
                symbolId: 'WILD',
                count: wildCount,
                pay: SYMBOLS['WILD'].pay[wildCount - 1] * getBetPerLine()
            };
        }
        return null;
    }

    // Считаем совпадения слева направо (Wild заменяет обычные символы)
    var matchCount = 0;
    for (var i = 0; i < 5; i++) {
        var sym = lineSymbols[i];
        if (sym === baseSymbol || sym === 'WILD') {
            matchCount++;
        } else {
            break; // Прерываем на первом несовпадении
        }
    }

    if (matchCount >= 3) {
        var payValue = SYMBOLS[baseSymbol].pay[matchCount - 1] * getBetPerLine();
        return {
            symbolId: baseSymbol,
            count: matchCount,
            pay: payValue
        };
    }

    return null;
}

// Подсчёт количества Scatter-символов на барабанах
function countScatters(reels) {
    var count = 0;
    var positions = [];
    for (var r = 0; r < 5; r++) {
        for (var row = 0; row < 3; row++) {
            if (reels[r][row] === 'SCATTER') {
                count++;
                positions.push({ reel: r, row: row });
            }
        }
    }
    return { count: count, positions: positions };
}

// Рассчитать все выигрыши по 20 линиям
function evaluateAllLines(reels) {
    var results = [];
    var totalWin = 0;

    for (var i = 0; i < PAYLINES.length; i++) {
        var lineResult = evaluateLine(reels, PAYLINES[i]);
        if (lineResult !== null) {
            lineResult.lineIndex = i;
            lineResult.linePattern = PAYLINES[i];
            results.push(lineResult);
            totalWin += lineResult.pay;
        }
    }

    return { lines: results, totalWin: totalWin };
}

// ==================== МНОЖИТЕЛЬ ПО ТЕМПЕРАТУРЕ ====================

// Получить множитель для текущей температуры (применяется к выигрышу)
function getTemperatureMultiplier() {
    var t = game.temperature;
    if (t <= 0) return 1;
    if (t <= 10) return 1.5;  // +5, +10
    if (t <= 20) return 2;    // +15, +20
    if (t === 25) return 2.5; // +25
    if (t >= 30) return 3;    // +30
    return 1;
}

// ==================== ЛОГИКА ШКАЛЫ ТЕМПЕРАТУРЫ ====================

// Обновить температуру после спина в фриспинах
// hasWin — был ли выигрыш по линиям
function updateTemperature(hasWin) {
    if (!game.isFreeSpins) return;

    var oldTemp = game.temperature;

    if (hasWin) {
        // Огненный дракон дышит огнём → +5
        game.temperature = Math.min(30, game.temperature + 5);
        animateFireDragonBreath();
    } else {
        // Ледяной дракон дышит холодом → -5
        game.temperature = Math.max(-30, game.temperature - 5);
        animateIceDragonBreath();
    }

    // Обновляем визуал шкалы
    updateTemperatureDisplay();

    return { oldTemp: oldTemp, newTemp: game.temperature };
}

// Проверить эффекты крайних значений температуры
// Возвращает true, если сработал экстремум (нужна пауза для уведомления)
function checkTemperatureExtremes(hasWin, currentWin) {
    var extremeTriggered = false;

    // Холодный экстремум: -30 при dead spin
    if (game.temperature === -30 && !hasWin) {
        extremeTriggered = true;
        // +1 фриспин (если лимит не превышен)
        if (game.freeSpinsLeft + game.freeSpinsUsed < 40) {
            game.freeSpinsLeft += 1;
            game.freeSpinsTotal += 1;
        }
        // Визуальный эффект: разбиваем шкалу
        showNotification('АБСОЛЮТНЫЙ НОЛЬ', '+1 бесплатный спин!', 'ice');
        breakScale('ice');
        // Шкала сбрасывается в 0
        game.temperature = 0;
        updateTemperatureDisplay();
    }

    // Горячий экстремум: +30 при выигрыше
    if (game.temperature === 30 && hasWin) {
        extremeTriggered = true;
        // Множитель x3 уже применён через getTemperatureMultiplier()
        // Визуальный эффект: взрываем шкалу
        showNotification('ИНФЕРНО ДРАКОНОВ', 'Множитель x3!', 'fire');
        breakScale('fire');
        // Шкала сбрасывается в 0
        game.temperature = 0;
        updateTemperatureDisplay();
    }

    return extremeTriggered;
}

// Сброс шкалы при ретриггере
function resetScaleForRetrigger() {
    showNotification('РЕТРИГГЕР!', '+5 бесплатных спинов! Шкала обновлена.', 'bonus');
    breakScale('retrigger');
    game.temperature = 0;
    updateTemperatureDisplay();
}

// ==================== ПОКУПКА БОНУСА ====================

var BUY_BONUS_COST = 200; // Стоимость покупки фриспинов

function buyBonus() {
    if (game.isSpinning || game.isFreeSpins) return;

    if (game.balance < BUY_BONUS_COST) {
        setMessage('Недостаточно средств! Нужно ' + BUY_BONUS_COST);
        return;
    }

    // Списываем стоимость
    game.balance -= BUY_BONUS_COST;
    game.lastWin = 0;
    updateUI();

    // Звук покупки
    playFreeSpinsStartSound();

    // Запускаем фриспины как при 3 Scatter (10 спинов)
    game.isSpinning = true;
    startFreeSpins(3);
}

// ==================== ЗАПУСК ФРИСПИНОВ ====================

function startFreeSpins(scatterCount) {
    var spinsCount = 0;
    if (scatterCount === 3) spinsCount = 10;
    else if (scatterCount === 4) spinsCount = 12;
    else if (scatterCount >= 5) spinsCount = 15;

    game.isFreeSpins = true;
    game.freeSpinsLeft = spinsCount;
    game.freeSpinsTotal = spinsCount;
    game.freeSpinsUsed = 0;
    game.freeSpinsWin = 0;
    game.freeSpinsBet = getTotalBet();
    game.temperature = 0;

    // Показать уведомление
    var message = scatterCount + ' Scatter! ' + spinsCount + ' бесплатных спинов!';
    showNotification('БЕСПЛАТНЫЕ СПИНЫ', message, 'bonus');

    // Показать шкалу и счётчик
    setTimeout(function() {
        document.getElementById('temperature-section').style.display = 'block';
        // Драконы взлетают
        document.getElementById('ice-dragon').classList.add('flying');
        document.getElementById('fire-dragon').classList.add('flying');
        updateFreeSpinsDisplay();
        updateTemperatureDisplay();
        // Отключаем управление ставкой
        disableBetControls(true);
        // Запускаем первый фриспин через паузу
        setTimeout(function() {
            hideNotification();
            doFreeSpinStep();
        }, 2000);
    }, 2500);
}

// Завершение фриспинов
function endFreeSpins() {
    game.isFreeSpins = false;
    game.freeSpinsLeft = 0;

    // Показать итоговый выигрыш
    var totalWin = game.freeSpinsWin;
    showNotification('БОНУС ЗАВЕРШЁН', 'Общий выигрыш: ' + formatMoney(totalWin), 'win');

    setTimeout(function() {
        hideNotification();
        // Скрыть шкалу
        document.getElementById('temperature-section').style.display = 'none';
        // Драконы возвращаются
        document.getElementById('ice-dragon').classList.remove('flying');
        document.getElementById('fire-dragon').classList.remove('flying');
        // Включаем управление ставкой
        disableBetControls(false);
        game.isSpinning = false;
        updateUI();

        // Если автоспин — продолжаем
        if (game.autoSpin && game.autoSpinCount > 0) {
            setTimeout(function() { doSpin(); }, 500);
        }
    }, 3000);
}

// Один шаг фриспина
function doFreeSpinStep() {
    if (game.freeSpinsLeft <= 0) {
        endFreeSpins();
        return;
    }

    game.freeSpinsLeft--;
    game.freeSpinsUsed++;
    updateFreeSpinsDisplay();

    // Звук спина
    playSpinStartSound();

    // Генерируем результат
    var result = generateSpinResult();

    // Запускаем анимацию вращения, затем обрабатываем результат
    animateReelSpin(result, function() {
        game.reels = result;

        // Считаем выигрыш по линиям
        var winResult = evaluateAllLines(result);
        var hasWin = winResult.totalWin > 0;

        // Обновляем температуру
        updateTemperature(hasWin);

        // Получаем множитель ПОСЛЕ обновления температуры
        var multiplier = getTemperatureMultiplier();

        // Применяем множитель к выигрышу
        var finalWin = winResult.totalWin * multiplier;

        // Обновляем UI множителя
        updateMultiplierDisplay(multiplier);

        // Подсвечиваем выигрышные ячейки и проигрываем звук выигрыша
        if (hasWin) {
            highlightWinningCells(winResult.lines);
            if (finalWin > game.freeSpinsBet * 10) {
                playBigWinSound();
            } else {
                playWinSound();
            }
            playCoinSound();
        }

        // Проверяем экстремумы температуры (разбивание шкалы)
        // Делаем это ДО проверки ретриггера
        var tempCheckDelay = 800;

        setTimeout(function() {
            var extremeTriggered = checkTemperatureExtremes(hasWin, finalWin);

            // Проверяем Scatter (ретриггер)
            var scatterResult = countScatters(result);
            var hasRetrigger = scatterResult.count >= 3;

            // Задержка зависит от того, был ли экстремум (показали уведомление)
            var afterExtremeDelay = extremeTriggered ? 2500 : 0;

            setTimeout(function() {
                if (hasRetrigger) {
                    // Звук scatter
                    playScatterSound();
                    // Порядок: 1) Выигрыш уже посчитан 2) Ретриггер 3) Сброс шкалы
                    var extraSpins = 5;
                    var totalAfterRetrigger = game.freeSpinsLeft + game.freeSpinsUsed + extraSpins;
                    if (totalAfterRetrigger > 40) {
                        extraSpins = Math.max(0, 40 - game.freeSpinsLeft - game.freeSpinsUsed);
                    }
                    game.freeSpinsLeft += extraSpins;
                    game.freeSpinsTotal += extraSpins;

                    resetScaleForRetrigger();

                    setTimeout(function() {
                        hideNotification();
                        // Добавляем выигрыш
                        game.freeSpinsWin += finalWin;
                        game.balance += finalWin;
                        game.lastWin = finalWin;
                        updateUI();
                        updateFreeSpinsDisplay();
                        clearWinHighlights();

                        // Следующий спин
                        setTimeout(function() { doFreeSpinStep(); }, 600);
                    }, 2000);
                } else {
                    // Нет ретриггера — просто добавляем выигрыш и идём дальше
                    hideNotification();
                    game.freeSpinsWin += finalWin;
                    game.balance += finalWin;
                    game.lastWin = finalWin;
                    updateUI();
                    clearWinHighlights();

                    // Следующий спин
                    setTimeout(function() { doFreeSpinStep(); }, 600);
                }
            }, afterExtremeDelay);
        }, tempCheckDelay);
    });
}

// ==================== ОСНОВНОЙ СПИН (БАЗОВАЯ ИГРА) ====================

function doSpin() {
    if (game.isSpinning) return;

    var totalBet = getTotalBet();

    // Проверка баланса
    if (game.balance < totalBet) {
        setMessage('Недостаточно средств!');
        game.autoSpin = false;
        game.autoSpinCount = 0;
        updateAutoSpinButton();
        return;
    }

    game.isSpinning = true;
    game.lastWin = 0;
    game.balance -= totalBet;
    updateUI();
    clearWinHighlights();
    setMessage('');

    // Звук старта спина
    playSpinStartSound();

    // Генерируем результат
    var result = generateSpinResult();

    // Анимация вращения
    animateReelSpin(result, function() {
        game.reels = result;

        // Считаем выигрыш по линиям
        var winResult = evaluateAllLines(result);

        // Проверяем Scatter
        var scatterResult = countScatters(result);

        // Добавляем выигрыш
        if (winResult.totalWin > 0) {
            game.balance += winResult.totalWin;
            game.lastWin = winResult.totalWin;
            highlightWinningCells(winResult.lines);
            // Звук выигрыша
            if (winResult.totalWin > getTotalBet() * 10) {
                playBigWinSound();
            } else {
                playWinSound();
            }
            playCoinSound();
        }

        updateUI();

        // Запуск фриспинов
        if (scatterResult.count >= 3) {
            // Подсвечиваем Scatter-символы
            highlightScatters(scatterResult.positions);
            playScatterSound();

            setTimeout(function() {
                clearWinHighlights();
                playFreeSpinsStartSound();
                startFreeSpins(scatterResult.count);
            }, 1500);
            return;
        }

        // Сообщение о выигрыше
        if (winResult.totalWin > 0) {
            setMessage('Выигрыш: ' + formatMoney(winResult.totalWin) + '!');
        } else {
            setMessage('');
        }

        // ВАЖНО: снимаем блокировку и обновляем все кнопки
        game.isSpinning = false;
        updateUI();

        // Автоспин
        if (game.autoSpin && game.autoSpinCount > 0) {
            game.autoSpinCount--;
            updateAutoSpinButton();
            if (game.autoSpinCount <= 0) {
                game.autoSpin = false;
                updateAutoSpinButton();
            } else {
                setTimeout(function() { doSpin(); }, 800);
            }
        }
    });
}

// ==================== АНИМАЦИЯ ВРАЩЕНИЯ БАРАБАНОВ ====================

function animateReelSpin(finalResult, onComplete) {
    // Задержки между остановкой барабанов
    var delays = { fast: 120, normal: 220, slow: 350 };
    var delay = delays[game.spinSpeed] || 220;

    // Количество «фейковых» вращений перед остановкой
    var fakeCycles = { fast: 6, normal: 10, slow: 16 };
    var cycles = fakeCycles[game.spinSpeed] || 10;

    var reelsToAnimate = 5;
    var reelsDone = 0;

    // Запускаем вращение каждого барабана с задержкой
    for (var r = 0; r < 5; r++) {
        startReelAnimation(r, cycles + r * 3, finalResult[r], delay * r, function() {
            reelsDone++;
            if (reelsDone === reelsToAnimate) {
                onComplete();
            }
        });
    }
}

function startReelAnimation(reelIndex, totalSteps, finalSymbols, startDelay, onDone) {
    setTimeout(function() {
        var step = 0;
        var cells = [
            document.getElementById('cell-' + reelIndex + '-0'),
            document.getElementById('cell-' + reelIndex + '-1'),
            document.getElementById('cell-' + reelIndex + '-2')
        ];

        // Добавляем класс вращения
        for (var i = 0; i < 3; i++) {
            cells[i].classList.add('spinning');
        }

        var interval = setInterval(function() {
            step++;

            // Тихий тик при вращении (каждые 3 шага)
            if (step % 3 === 0) {
                playReelTickSound();
            }

            // Показываем случайные символы
            for (var i = 0; i < 3; i++) {
                var randomSym = getRandomSymbol();
                renderSymbolInCell(cells[i], randomSym);
            }

            if (step >= totalSteps) {
                clearInterval(interval);

                // Убираем класс вращения
                for (var i = 0; i < 3; i++) {
                    cells[i].classList.remove('spinning');
                }

                // Устанавливаем финальные символы
                for (var i = 0; i < 3; i++) {
                    renderSymbolInCell(cells[i], finalSymbols[i]);
                }

                // Звук остановки барабана
                playReelStopSound(reelIndex);

                onDone();
            }
        }, 60);
    }, startDelay);
}

// ==================== ОТРИСОВКА СИМВОЛОВ ====================

function renderSymbolInCell(cell, symbolId) {
    var sym = SYMBOLS[symbolId];
    if (!sym) return;

    cell.setAttribute('data-type', sym.type);
    cell.setAttribute('data-symbol', symbolId);
    cell.innerHTML = '<div class="sym-icon">' + sym.icon + '</div><div class="sym-label">' + sym.label + '</div>';
}

// Отрисовка всех барабанов
function renderAllReels() {
    for (var r = 0; r < 5; r++) {
        for (var row = 0; row < 3; row++) {
            var cell = document.getElementById('cell-' + r + '-' + row);
            renderSymbolInCell(cell, game.reels[r][row]);
        }
    }
}

// ==================== ПОДСВЕТКА ВЫИГРЫШЕЙ ====================

function highlightWinningCells(winLines) {
    for (var i = 0; i < winLines.length; i++) {
        var line = winLines[i];
        var pattern = line.linePattern;
        for (var r = 0; r < line.count; r++) {
            var cell = document.getElementById('cell-' + r + '-' + pattern[r]);
            cell.classList.add('win-highlight');
        }
    }
}

function highlightScatters(positions) {
    for (var i = 0; i < positions.length; i++) {
        var pos = positions[i];
        var cell = document.getElementById('cell-' + pos.reel + '-' + pos.row);
        cell.classList.add('win-highlight');
    }
}

function clearWinHighlights() {
    var cells = document.querySelectorAll('.symbol-cell');
    for (var i = 0; i < cells.length; i++) {
        cells[i].classList.remove('win-highlight');
    }
}

// ==================== АНИМАЦИИ ДРАКОНОВ ====================

function animateIceDragonBreath() {
    var dragonEl = document.getElementById('ice-dragon');
    var breath = document.getElementById('ice-breath');

    // Звук ледяного дыхания + тик шкалы
    playIceBreathSound();
    playTempTickSound('cold');

    // Активируем анимацию дыхания на драконе
    dragonEl.classList.add('breathing');
    breath.classList.add('active');

    // Эффект подморозки экрана при низких температурах
    if (game.temperature <= -20) {
        document.getElementById('game-container').classList.add('screen-freeze');
    }

    setTimeout(function() {
        dragonEl.classList.remove('breathing');
        breath.classList.remove('active');
        document.getElementById('game-container').classList.remove('screen-freeze');
    }, 1200);
}

function animateFireDragonBreath() {
    var dragonEl = document.getElementById('fire-dragon');
    var breath = document.getElementById('fire-breath');

    // Звук огненного дыхания + тик шкалы
    playFireBreathSound();
    playTempTickSound('hot');

    // Активируем анимацию дыхания на драконе
    dragonEl.classList.add('breathing');
    breath.classList.add('active');

    // Эффект жары при высоких температурах
    if (game.temperature >= 20) {
        document.getElementById('game-container').classList.add('screen-heatwave');
    }

    setTimeout(function() {
        dragonEl.classList.remove('breathing');
        breath.classList.remove('active');
        document.getElementById('game-container').classList.remove('screen-heatwave');
    }, 1200);
}

// ==================== ВИЗУАЛ ШКАЛЫ ТЕМПЕРАТУРЫ ====================

function updateTemperatureDisplay() {
    // Маркер перемещается по шкале
    // Позиция: -30 → 0%, 0 → 50%, +30 → 100%
    var percent = ((game.temperature + 30) / 60) * 100;
    // Ограничиваем границами с учётом размера маркера
    percent = Math.max(3, Math.min(97, percent));
    document.getElementById('temp-marker').style.left = percent + '%';
}

function updateFreeSpinsDisplay() {
    document.getElementById('fs-current').textContent = game.freeSpinsUsed;
    document.getElementById('fs-total').textContent = game.freeSpinsTotal;
}

function updateMultiplierDisplay(multiplier) {
    var el = document.getElementById('fs-multiplier');
    var valEl = document.getElementById('fs-mult-value');
    if (multiplier > 1) {
        el.style.display = 'inline';
        valEl.textContent = 'x' + multiplier;
    } else {
        el.style.display = 'none';
    }
}

function breakScale(type) {
    var bar = document.getElementById('temp-scale-bar');

    // Звук разбивания шкалы
    playScaleBreakSound(type);

    if (type === 'ice') {
        bar.classList.add('breaking-ice');
        setTimeout(function() { bar.classList.remove('breaking-ice'); }, 900);
    } else if (type === 'fire') {
        bar.classList.add('breaking-fire');
        setTimeout(function() { bar.classList.remove('breaking-fire'); }, 900);
    } else {
        // Ретриггер — используем оба эффекта
        bar.classList.add('breaking-ice');
        setTimeout(function() {
            bar.classList.remove('breaking-ice');
            bar.classList.add('breaking-fire');
            setTimeout(function() { bar.classList.remove('breaking-fire'); }, 500);
        }, 500);
    }
}

// ==================== УВЕДОМЛЕНИЯ ====================

function showNotification(title, text, type) {
    var overlay = document.getElementById('notification-overlay');
    var content = document.getElementById('notification-content');
    var titleEl = document.getElementById('notification-title');
    var textEl = document.getElementById('notification-text');

    titleEl.textContent = title;
    textEl.textContent = text;

    // Убираем все предыдущие классы типа
    content.className = '';
    if (type === 'ice') content.classList.add('notif-ice');
    else if (type === 'fire') content.classList.add('notif-fire');
    else if (type === 'bonus') content.classList.add('notif-bonus');
    else if (type === 'win') content.classList.add('notif-win');

    overlay.style.display = 'flex';

    // Звук уведомления
    playNotificationSound();
}

function hideNotification() {
    document.getElementById('notification-overlay').style.display = 'none';
}

// ==================== СООБЩЕНИЯ ====================

function setMessage(text) {
    document.getElementById('message-bar').textContent = text;
}

// ==================== ОБНОВЛЕНИЕ UI ====================

function updateUI() {
    document.getElementById('balance-display').textContent = formatMoney(game.balance);
    document.getElementById('bet-display').textContent = formatMoney(getTotalBet());

    var winDisplay = document.getElementById('win-display');
    winDisplay.textContent = formatMoney(game.lastWin);

    if (game.lastWin > 0) {
        winDisplay.classList.add('has-win');
        setTimeout(function() { winDisplay.classList.remove('has-win'); }, 600);
    } else {
        winDisplay.classList.remove('has-win');
    }

    // Блокируем кнопки при вращении
    document.getElementById('btn-spin').disabled = game.isSpinning;
    document.getElementById('btn-bet-down').disabled = game.isSpinning || game.isFreeSpins;
    document.getElementById('btn-bet-up').disabled = game.isSpinning || game.isFreeSpins;
    document.getElementById('btn-max-bet').disabled = game.isSpinning || game.isFreeSpins;
    document.getElementById('btn-buy-bonus').disabled = game.isSpinning || game.isFreeSpins || game.balance < BUY_BONUS_COST;
}

function disableBetControls(disabled) {
    document.getElementById('btn-bet-down').disabled = disabled;
    document.getElementById('btn-bet-up').disabled = disabled;
    document.getElementById('btn-max-bet').disabled = disabled;
    document.getElementById('btn-buy-bonus').disabled = disabled;
}

function updateAutoSpinButton() {
    var btn = document.getElementById('btn-auto');
    if (game.autoSpin) {
        btn.classList.add('active');
        btn.querySelector('span:last-child').textContent = 'СТОП (' + game.autoSpinCount + ')';
    } else {
        btn.classList.remove('active');
        btn.querySelector('span:last-child').textContent = 'АВТОСПИН';
    }
}

// ==================== ТАБЛИЦА ВЫПЛАТ ====================

function openPaytable() {
    var content = document.getElementById('paytable-content');
    var html = '';

    // Заголовок
    html += '<div style="margin-bottom: 20px; color: #aaaacc; font-size: 13px;">';
    html += '<p>Линий: <strong style="color:#ffd700">20</strong> | ';
    html += 'Выплаты = совпадений × коэффициент × ставка на линию</p>';
    html += '</div>';

    // Специальные символы
    html += '<h3 style="color:#ffd700; margin-bottom:10px;">СПЕЦИАЛЬНЫЕ СИМВОЛЫ</h3>';

    // Wild
    html += '<div class="paytable-row">';
    html += '<div class="paytable-symbol" style="background:linear-gradient(135deg,#ff3c00,#ffd700,#00c8ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:900;">W</div>';
    html += '<div class="paytable-name"><strong>WILD</strong><br><small>Заменяет все символы кроме Scatter</small></div>';
    html += '<div class="paytable-pays">';
    html += '<span><span class="pay-count">3×</span> 100</span>';
    html += '<span><span class="pay-count">4×</span> 500</span>';
    html += '<span><span class="pay-count">5×</span> 2000</span>';
    html += '</div></div>';

    // Scatter
    html += '<div class="paytable-row">';
    html += '<div class="paytable-symbol" style="color:#00ff80;">☯</div>';
    html += '<div class="paytable-name"><strong>SCATTER</strong><br><small>Запускает бесплатные спины</small></div>';
    html += '<div class="paytable-pays">';
    html += '<span><span class="pay-count">3×</span> 10 FS</span>';
    html += '<span><span class="pay-count">4×</span> 12 FS</span>';
    html += '<span><span class="pay-count">5×</span> 15 FS</span>';
    html += '</div></div>';

    html += '<hr style="border-color:rgba(255,215,0,0.1); margin:16px 0;">';

    // Все обычные символы
    html += '<h3 style="color:#ffd700; margin-bottom:10px;">СИМВОЛЫ И ВЫПЛАТЫ</h3>';

    var order = ['EGG', 'ICE_DRAGON', 'FIRE_DRAGON', 'CRYSTAL', 'RUNE', 'SHIELD', 'SWORD', 'A', 'K', 'Q', 'J', '10', '9'];
    for (var i = 0; i < order.length; i++) {
        var id = order[i];
        var sym = SYMBOLS[id];
        html += '<div class="paytable-row">';
        html += '<div class="paytable-symbol">' + sym.icon + '</div>';
        html += '<div class="paytable-name">' + sym.label + '</div>';
        html += '<div class="paytable-pays">';
        html += '<span><span class="pay-count">3×</span> ' + sym.pay[2] + '</span>';
        html += '<span><span class="pay-count">4×</span> ' + sym.pay[3] + '</span>';
        html += '<span><span class="pay-count">5×</span> ' + sym.pay[4] + '</span>';
        html += '</div></div>';
    }

    // Правила бонуса
    html += '<hr style="border-color:rgba(255,215,0,0.1); margin:16px 0;">';
    html += '<h3 style="color:#ffd700; margin-bottom:10px;">ШКАЛА ТЕМПЕРАТУРЫ (БОНУС)</h3>';
    html += '<div style="color:#aaaacc; font-size:13px; line-height:1.6;">';
    html += '<p>Во фриспинах появляется шкала от -30 до +30:</p>';
    html += '<p>❄ Проигрышный спин → -5 (Ледяной дракон)</p>';
    html += '<p>🔥 Выигрышный спин → +5 (Огненный дракон)</p>';
    html += '<br>';
    html += '<p><strong>Множители по температуре:</strong></p>';
    html += '<p>+5, +10 → x1.5 | +15, +20 → x2 | +25 → x2.5 | +30 → x3</p>';
    html += '<br>';
    html += '<p><strong>Крайние значения:</strong></p>';
    html += '<p>-30 («АБСОЛЮТНЫЙ НОЛЬ») → +1 фриспин, шкала сбрасывается</p>';
    html += '<p>+30 («ИНФЕРНО ДРАКОНОВ») → x3 выигрыш, шкала сбрасывается</p>';
    html += '<br>';
    html += '<p><strong>Ретриггер:</strong> 3+ Scatter во фриспинах → +5 спинов, шкала в 0</p>';
    html += '<p>Максимум фриспинов: 40</p>';
    html += '</div>';

    content.innerHTML = html;
    document.getElementById('paytable-overlay').style.display = 'flex';
}

function closePaytable() {
    document.getElementById('paytable-overlay').style.display = 'none';
}

// ==================== НАСТРОЙКИ ====================

function openSettings() {
    document.getElementById('settings-overlay').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settings-overlay').style.display = 'none';
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

function initEventHandlers() {
    // Инициализация аудио при первом клике (требование браузера)
    document.addEventListener('click', function() {
        initAudio();
    }, { once: true });

    // Кнопка СПИН
    document.getElementById('btn-spin').addEventListener('click', function() {
        initAudio();
        playClickSound();
        if (!game.isSpinning && !game.isFreeSpins) {
            doSpin();
        }
    });

    // Кнопка КУПИТЬ БОНУС
    document.getElementById('btn-buy-bonus').addEventListener('click', function() {
        initAudio();
        playClickSound();
        buyBonus();
    });

    // Кнопка АВТОСПИН
    document.getElementById('btn-auto').addEventListener('click', function() {
        initAudio();
        playClickSound();
        if (game.isFreeSpins) return;

        if (game.autoSpin) {
            // Остановить автоспин
            game.autoSpin = false;
            game.autoSpinCount = 0;
            updateAutoSpinButton();
        } else {
            // Запустить автоспин на 20 спинов
            game.autoSpin = true;
            game.autoSpinCount = 20;
            updateAutoSpinButton();
            if (!game.isSpinning) {
                doSpin();
            }
        }
    });

    // Кнопка МАКС. СТАВКА
    document.getElementById('btn-max-bet').addEventListener('click', function() {
        initAudio();
        playClickSound();
        if (!game.isSpinning && !game.isFreeSpins) {
            game.betIndex = BET_LEVELS.length - 1;
            updateUI();
        }
    });

    // Кнопки +/- ставки
    document.getElementById('btn-bet-down').addEventListener('click', function() {
        initAudio();
        playClickSound();
        if (!game.isSpinning && !game.isFreeSpins && game.betIndex > 0) {
            game.betIndex--;
            updateUI();
        }
    });

    document.getElementById('btn-bet-up').addEventListener('click', function() {
        initAudio();
        playClickSound();
        if (!game.isSpinning && !game.isFreeSpins && game.betIndex < BET_LEVELS.length - 1) {
            game.betIndex++;
            updateUI();
        }
    });

    // Таблица выплат
    document.getElementById('btn-paytable').addEventListener('click', function() {
        initAudio();
        playClickSound();
        openPaytable();
    });
    document.getElementById('paytable-close').addEventListener('click', function() {
        playClickSound();
        closePaytable();
    });
    document.getElementById('paytable-overlay').addEventListener('click', function(e) {
        if (e.target === this) closePaytable();
    });

    // Настройки
    document.getElementById('btn-settings').addEventListener('click', function() {
        initAudio();
        playClickSound();
        openSettings();
    });
    document.getElementById('settings-close').addEventListener('click', function() {
        playClickSound();
        closeSettings();
    });
    document.getElementById('settings-overlay').addEventListener('click', function(e) {
        if (e.target === this) closeSettings();
    });

    // Скорость вращения
    document.getElementById('spin-speed').addEventListener('change', function() {
        game.spinSpeed = this.value;
    });

    // Переключатель звука
    document.getElementById('sound-toggle').addEventListener('change', function() {
        soundEnabled = this.checked;
    });

    // Ползунок громкости
    document.getElementById('volume-slider').addEventListener('input', function() {
        masterVolume = this.value / 100;
    });

    // Закрытие уведомлений по клику
    document.getElementById('notification-overlay').addEventListener('click', function() {
        // Не закрываем если это важное уведомление фриспинов
    });

    // Клавиша Пробел = спин
    document.addEventListener('keydown', function(e) {
        if (e.code === 'Space' && !game.isSpinning && !game.isFreeSpins) {
            e.preventDefault();
            initAudio();
            doSpin();
        }
    });
}

// ==================== УДАЛЕНИЕ ЧЁРНОГО ФОНА С КАРТИНОК ====================

// Убирает чёрный/тёмный фон с PNG-картинки через Canvas
// threshold — пиксели темнее этого значения становятся полностью прозрачными
// fadeRange — пиксели в диапазоне (threshold..threshold+fadeRange) плавно теряют прозрачность
function removeBlackBackground(imgElement, threshold, fadeRange) {
    if (!threshold) threshold = 40;
    if (!fadeRange) fadeRange = 30;

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    // Ждём загрузки картинки
    function process() {
        canvas.width = imgElement.naturalWidth;
        canvas.height = imgElement.naturalHeight;
        ctx.drawImage(imgElement, 0, 0);

        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var pixels = imageData.data;

        for (var i = 0; i < pixels.length; i += 4) {
            var r = pixels[i];
            var g = pixels[i + 1];
            var b = pixels[i + 2];

            // Яркость пикселя (максимум из RGB)
            var brightness = Math.max(r, g, b);

            if (brightness < threshold) {
                // Полностью прозрачный (чёрный/очень тёмный пиксель)
                pixels[i + 3] = 0;
            } else if (brightness < threshold + fadeRange) {
                // Плавный переход: чем ближе к threshold — тем прозрачнее
                var alpha = ((brightness - threshold) / fadeRange) * 255;
                pixels[i + 3] = Math.min(pixels[i + 3], Math.round(alpha));
            }
            // Остальные пиксели остаются как есть
        }

        ctx.putImageData(imageData, 0, 0);

        // Заменяем src картинки на обработанные данные
        imgElement.src = canvas.toDataURL('image/png');
    }

    if (imgElement.complete && imgElement.naturalWidth > 0) {
        process();
    } else {
        imgElement.addEventListener('load', process);
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

function init() {
    // Убираем чёрный фон с картинок драконов
    var iceImg = document.querySelector('.ice-img');
    var fireImg = document.querySelector('.fire-img');
    if (iceImg) removeBlackBackground(iceImg, 35, 25);
    if (fireImg) removeBlackBackground(fireImg, 35, 25);

    // Рендерим начальное состояние барабанов
    renderAllReels();

    // Обновляем UI
    updateUI();

    // Подключаем обработчики
    initEventHandlers();

    // Приветственное сообщение
    setMessage('Добро пожаловать в Twin Dragons! Нажмите СПИН для начала.');
}

// Запуск после загрузки DOM
document.addEventListener('DOMContentLoaded', init);
