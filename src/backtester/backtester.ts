import { Candles } from '../../components/investAPI/candles';
import { SANDBOXSDK as sdk } from '../../config';

import { Backtest } from '../Common/Backtest';
import { Instruments } from '../../components/investAPI/instruments';
import { debugEnd, debugStart, isDebugEnable } from '../../components/utils';

// @ts-ignore
const backtest = new Backtest(0, 0, true, undefined, {
    enums: {
        OrderDirection: {
            ...sdk.OrderDirection,
        },
    },
});

const instruments = new Instruments(sdk);

let instrumentsForTrade;

(async () => {
    instrumentsForTrade = await instruments.getSharesForTrading({
        maxLotPrice: 5000,
    });

    const uids = Object.keys(instrumentsForTrade);

    for (const uid of uids) {
        debugStart('Запуск testInstrument ' + instrumentsForTrade[uid].ticker);
        await testInstrument(uid);
        debugEnd('Запуск testInstrument');
    }
})();

const candlesSdk = new Candles(sdk);
const testerInterval = sdk.CandleInterval.CANDLE_INTERVAL_5_MIN;

async function testInstrument(instrumentUID: string) {
    const { instrument } = (await instruments.getInstrumentById(instrumentUID)) || {};

    if (instrument) {
        const start = new Date();

        start.setDate(start.getDate() - 90);

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
            const robot = new Robot(backtest, logSystem);

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
