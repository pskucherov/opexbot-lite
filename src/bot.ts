/* eslint-disable no-console */
import { v4 as uuidv4 } from 'uuid';

import {
    lastPriceSubscribe, orderBookSubscribe,
} from '../components/investAPI/subscribeTemplates';

import {
    SANDBOXACCID,
    SANDBOXSDK,
    SCREENER_PARAMS,
} from '../config';

import AutoProfit from './AutoProfit/AutoProfit';

import Screener from './Screener/Screener';
import { OrderExecutionReportStatus } from 'tinkoff-sdk-grpc-js/dist/generated/orders';

const tryOrder = async (maxLotPrice: number) => {
    try {
        const screener = new Screener({
            ...SCREENER_PARAMS,
            maxLotPrice,
        });

        const data = await screener.getTopInstruments(5);

        const screenerResult = data?.sort((a, b) => {
            if (b?.orderBookRatio?.bidAsk && a?.orderBookRatio?.bidAsk) {
                return b?.orderBookRatio?.bidAsk - a?.orderBookRatio?.bidAsk;
            }

            return 0;
        });

        console.log('SCREENER');
        console.log(
            screenerResult,
        );

        const { orders } = (await SANDBOXSDK.orders.getOrders({ accountId: SANDBOXACCID })) || {};

        const openedOrders = orders && orders.filter((o: { executionReportStatus: number; }) => [
            OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_NEW,
            OrderExecutionReportStatus.EXECUTION_REPORT_STATUS_PARTIALLYFILL,
        ].includes(o.executionReportStatus));

        if (openedOrders?.length) {
            return;
        }

        const { securities, futures, options } = await SANDBOXSDK.operations.getPositions({
            accountId: SANDBOXACCID,
        }) || {};

        if (!securities?.length && !futures?.length && !options?.length) {
            const uid = screenerResult[0].uid;

            const pOrder = await SANDBOXSDK.orders.postOrder({
                quantity: 1,
                direction: 1,
                accountId: SANDBOXACCID,
                orderType: SANDBOXSDK.OrderType.ORDER_TYPE_BESTPRICE,
                orderId: uuidv4(),
                instrumentId: uid,
            });

            console.log('pOrder', pOrder); // eslint-disable-line no-console
        }
    } catch (e) {
        console.log(e); // eslint-disable-line
    }
};

const buyer = async () => {
    try {
        const { money } = await SANDBOXSDK.sandbox.getSandboxWithdrawLimits({
            accountId: SANDBOXACCID,
        }) || {};

        const maxLotPrice = (AutoProfit.getPrice(money[0]) || 0) / 2;

        console.log(new Date().toLocaleTimeString(), 'maxLotPrice', maxLotPrice); // eslint-disable-line no-console

        if (maxLotPrice > 100) {
            await tryOrder(maxLotPrice);
        }

        setTimeout(() => {
            buyer();
        }, 60000);
    } catch (e) {
        console.log(e); // eslint-disable-line
    }
};

(async () => {
    await buyer();

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

setInterval(() => { }, 60000);
