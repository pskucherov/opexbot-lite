/* eslint-disable no-console */
// import { v4 as uuidv4 } from 'uuid';

import {
    lastPriceSubscribe, orderBookSubscribe,
} from '../components/investAPI/subscribeTemplates';

import {
    ORDERBOOK_TRESHHOLD,
    SANDBOXACCID,
    SANDBOXSDK,
    SCREENER_PARAMS,
} from '../config';

import AutoProfit from './AutoProfit/AutoProfit';

import Screener from './Screener/Screener';

(async () => {
    const screener = new Screener(SCREENER_PARAMS);

    if (ORDERBOOK_TRESHHOLD) {
        const data = await screener.getTopInstruments(5);

        const screenerResult = data?.sort((a, b) => {
            if (b?.orderBookRatio?.bidAsk && a?.orderBookRatio?.bidAsk) {
                return b?.orderBookRatio?.bidAsk - a?.orderBookRatio?.bidAsk;
            }

            return 0;
        });

        console.log(
            screenerResult,
        );

        // setTimeout(async () => {
        // console.log('buy');

        // const uid = screenerResult[0].uid;

        // const pOrder = await SANDBOXSDK.orders.postOrder({
        //     quantity: 1,
        //     direction: 1,
        //     accountId: SANDBOXACCID,
        //     orderType: SANDBOXSDK.OrderType.ORDER_TYPE_BESTPRICE,
        //     orderId: uuidv4(),
        //     instrumentId: uid,
        // });

        // console.log(pOrder);

        // }, 5000);

        console.log('start');
    }
    const bot = new AutoProfit(SANDBOXACCID, false, false, {
        subscribes: {
            lastPrice: lastPriceSubscribe.bind(null, SANDBOXSDK),
            orderbook: orderBookSubscribe.bind(null, SANDBOXSDK),
            orders: SANDBOXSDK.ordersStream.tradesStream,
            positions: SANDBOXSDK.operationsStream.positionsStream,
        },
    }, {}, SANDBOXSDK);

    bot.start();
})();
