/* eslint-disable no-console */

import {
    ORDERBOOK_TRESHHOLD,
    SCREENER_PARAMS,
} from '../config';

import Screener from './Screener/Screener';

(async () => {
    const screener = new Screener(SCREENER_PARAMS);

    const data = await screener.getTopInstruments(5);

    if (!data?.length) {
        console.log('Подходящие под заданные условия инструменты не найдены');
    } else {
        data.forEach((d, k) => {
            console.log(k + 1, '/', data.length);
            console.log('uid:', d.uid);
            console.log('ticker:', d.ticker);
            console.log('rsiMonth:', d.currentMonthRsiMonth.toFixed(2));
            console.log('rsiWeek:', d.currentMonthRsiWeek.toFixed(2));
            console.log('rsiDay:', d.currentMonthRsiDay.toFixed(2));

            const inOrderBook = d.orderBookRatio;

            if (inOrderBook) {
                console.log('Настроение в стакане:',
                    inOrderBook.bidAsk > ORDERBOOK_TRESHHOLD ?
                        'Покупать' :
                        inOrderBook.bidAsk < -ORDERBOOK_TRESHHOLD ?
                            'Продавать' : 'Держать',
                    `(${inOrderBook.bidAsk.toFixed(2)})`,
                );
            }

            console.log();
        });
    }

    console.log();
    console.log('Вы используете демо версию OpexBot');
    console.log('Полная версия: https://opexflow.com/kit');
})();
