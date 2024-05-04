import { Candles } from '../../components/investAPI/candles';
import { SANDBOXSDK as sdk } from '../../config';

import { Backtest } from '../Common/Backtest';
import { Instruments } from '../../components/investAPI/instruments';
import { Robot } from './robot';
import { Log } from '../../components/log';
import { debugEnd, debugStart, isDebugEnable } from '../../components/utils';
import { Share } from 'tinkoff-sdk-grpc-js/dist/generated/instruments';

// @ts-ignore
const backtest = new Backtest(0, 0, true, undefined, {
    enums: {
        OrderDirection: {
            ...sdk.OrderDirection,
        },
    },
});

const instruments = new Instruments(sdk);
let instrumentsForTrade: { [x: string]: Share; };

const backtestSettings = {
    testerInterval: sdk.CandleInterval.CANDLE_INTERVAL_5_MIN,
    daysCount: 90,
};

const robotParamSettings = {
    PERIOD_RSI: 30,
    PERIOD_MA: 200,
    PRICE_PERCENT_DIFF: 2,
};

const results: {
    uid: string;
    cnt: number;
    result: number;
}[] = [];

(async () => {
    instrumentsForTrade = await instruments.getSharesForTrading({
        maxLotPrice: 6000,
    });

    const uids = Object.keys(instrumentsForTrade);
    let i = 1;

    for (const uid of uids) {
        // if (instrumentsForTrade[uid].ticker !== 'OZON') continue;

        console.log();
        debugStart(`${i + '/' + uids.length} Запуск testInstrument ${instrumentsForTrade[uid].ticker}`);
        await testInstrument(uid);
        debugEnd(`${i + '/' + uids.length} Запуск testInstrument ${instrumentsForTrade[uid].ticker}`);

        ++i;
    }

    results
        .sort((a, b) => {
            return b.result - a.result;
        })
        .forEach((b, k) => {
            console.log(k + 1, instrumentsForTrade[b.uid].ticker, b.result, b.cnt);
        });
})();

const candlesSdk = new Candles(sdk);

const { testerInterval, daysCount } = backtestSettings;

async function testInstrument(instrumentUID: string) {
    const { instrument } = (await instruments.getInstrumentById(instrumentUID)) || {};

    if (instrument) {
        const start = new Date();

        start.setDate(start.getDate() - daysCount);

        debugStart('Получение свечей (candlesSdk.getCandles)');
        const historicCandlesArr = await candlesSdk.getCandlesDayByDay(
            instrumentUID,
            testerInterval,
            start,
            new Date(),
        );

        debugEnd('Получение свечей (candlesSdk.getCandles)');

        if (historicCandlesArr.length) {
            let backtestStep = 0;

            backtest.setBacktestState(backtestStep, testerInterval, instrumentUID, undefined, {
                tickerInfo: instrument,
                type: 'instrument',
                instrumentUID,
            });

            const logSystem = isDebugEnable() ? new Log(instrument.ticker) : undefined;
            const robot = new Robot(backtest, robotParamSettings, logSystem);

            debugStart(`Обход всех свечей (makeStep), ${instrumentUID}, len ${historicCandlesArr.length}`);
            for (let candleIndex = 0; candleIndex < historicCandlesArr.length; candleIndex++) {
                backtestStep++;
                backtest.setBacktestState(backtestStep);

                await robot.initStep(historicCandlesArr[candleIndex]);
                robot.makeStep();
            }
            debugEnd(`Обход всех свечей (makeStep), ${instrumentUID}, len ${historicCandlesArr.length}`);

            backtest.backtestClosePosition(historicCandlesArr[historicCandlesArr.length - 1].close);

            const result = robot.printResult();

            results.push({
                uid: instrumentUID,
                cnt: robot.calcTradesCount(),
                result: Number(result),
            });

            if (process.env.DEBUG) {
                console.log('result', result); // eslint-disable-line no-console
                console.log('tradesCount', robot.calcTradesCount()); // eslint-disable-line no-console
                console.log(); // eslint-disable-line no-console
            }

            if (Number(process.env.DEBUG) === 2) {
                console.log(backtest.getBacktestPositions()); // eslint-disable-line no-console
            }

            backtest.stop();
        }
    }
}
