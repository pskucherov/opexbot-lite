/* eslint-disable no-console */

import Screener from './Screener/Screener';

const ORDERBOOK_TRESHHOLD = 2;

(async () => {
    const screener = new Screener({
        maxLotPrice: 4500,
        rsiMonth: 70,
        rsiWeek: 60,
        rsiDay: 60,
    });

    const data = await screener.getTopInstruments(5);

    if (!data?.length) {
        console.log('Подходящие под заданные условия инструменты не найдены');
    } else {
        const orderBook = await screener.getOrderBookVolumeRatio(data.map(u => u.uid));

        data.forEach((d, k) => {
            console.log(k + 1, '/', data.length);
            console.log('uid:', d.uid);
            console.log('ticker:', d.ticker);
            console.log('rsiMonth:', d.currentMonthRsiMonth.toFixed(2));
            console.log('rsiWeek:', d.currentMonthRsiWeek.toFixed(2));
            console.log('rsiDay:', d.currentMonthRsiDay.toFixed(2));

            const inOrderBook = orderBook?.result?.find(r => r.uid === d.uid);

            if (inOrderBook) {
                console.log('Настроение в стакане:',
                    inOrderBook.bidAsk > 2 ? 'Покупать' : inOrderBook.bidAsk < -2 ? 'Продавать' : 'Держать',
                    `(${inOrderBook.bidAsk.toFixed(2)})`,
                );
            }

            console.log();
        });

        if (orderBook.market) {
            console.log(
                'Общее настроение в стакане:',
                orderBook.market > 2 ? 'Покупать' : orderBook.market < -2 ? 'Продавать' : 'Держать',
                `(${orderBook.market.toFixed(2)})`,
            );
        }
    }

    console.log();
    console.log('Вы используете демо версию OpexBot');
    console.log('Полная версия: https://opexflow.com/kit');
})();
