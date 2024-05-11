# opexbot-lite

Робот является адаптацией и урезанной версией робота [OpexBot](https://github.com/pskucherov/OpexBot/), подготовленный для [Tinkoff Invest Robot Contest #2](https://meetup.tinkoff.ru/event/tinkoff-invest-robot-contest-2/).

### Состоит из двух частей:
1. Скринер акций по RSI + объёму в стакане
1. Робот AutoProfit, который закрывает сделки при достижении профита, указанного в параметрах.

### Как был получен результат в конкурсе:
1. С помощью скринера выбрал акцию и закупил по тренду
1. В первой половине конкурса настройка профита стояла в несколько процентов
1. Ближе к окончанию конкурса процент прибыли на сделку в конфиге был уменьшен, чтобы собрать небольшие движения перед окончанием конкурса

## Установка
```
git clone https://github.com/pskucherov/opexbot-lite
cd opexbot-lite
npm i
```

## Настройка
1. Для запуска робота заполните token, account id и appname в config.ts
1. Для тюнинга скринера измените значения SCREENER_PARAMS и ORDERBOOK_TRESHHOLD в config.ts
1. Пороговое значение для робота, когда нужно фиксировать прибыль, задаётся в параметре breakeven в файле AutoProfit.ts


## Запуск

### 1.1 Скринер
`npm run screener`

### 1.2 Скринер с подробностями
`npm run screenerDebug`

### 2. Робот
`npm run bot`


## Контакты
[Торговый помощник](https://opexflow.com/kit)

[YouTube](https://www.youtube.com/channel/UCfAEA159a0QMBcswJ23S2rA)

[Телеграм](https://t.me/opexflow)

[Пульс](https://www.tinkoff.ru/invest/social/profile/Opexflow/)

[Техподдержка](https://t.me/opexbotru)
