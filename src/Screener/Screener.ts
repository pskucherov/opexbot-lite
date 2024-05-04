import { SANDBOXSDK as sdk } from '../../config';
import { Instruments } from '../../components/investAPI/instruments';

import {
    debugEnd, debugStart,
    isDebugEnable,
} from '../../components/utils';

import { Share } from 'tinkoff-sdk-grpc-js/dist/generated/instruments';
import {
    GetTechAnalysisRequest_IndicatorInterval, /* eslint-disable-line camelcase */
    GetTechAnalysisRequest_IndicatorType, /* eslint-disable-line camelcase */
    GetTechAnalysisRequest_TypeOfPrice, /* eslint-disable-line camelcase */
} from 'tinkoff-sdk-grpc-js/dist/generated/marketdata';

import { Common } from '../Common/Common';

const instruments = new Instruments(sdk);
let instrumentsForTrade: { [x: string]: Share; };

type IResult = {
    uid: string,
    ticker: string;
    currentMonthRsiMonth: number;
    currentMonthRsiWeek: number;
    currentMonthRsiDay: number;
};

const results: IResult[] = [];

export default class Screener {
    maxLotPrice: number;
    rsiMonth: number;
    rsiWeek: number;
    rsiDay: number;

    constructor(props: {
        maxLotPrice?: number;
        rsiMonth?: number;
        rsiWeek?: number;
        rsiDay?: number;
    }) {
        const {
            maxLotPrice = 4500,
            rsiMonth = 70,
            rsiWeek = 60,
            rsiDay = 60,
        } = props;

        this.maxLotPrice = maxLotPrice;
        this.rsiMonth = rsiMonth;
        this.rsiWeek = rsiWeek;
        this.rsiDay = rsiDay;
    }

    async getTopInstruments(size: number = 10) {
        instrumentsForTrade = await instruments.getSharesForTrading({
            maxLotPrice: this.maxLotPrice,
        });

        const uids = Object.keys(instrumentsForTrade);
        let i = 1;

        for (const uid of uids) {
            debugStart(`${i + '/' + uids.length} Запуск getRsiData ${instrumentsForTrade[uid].ticker}`);

            const data = (await this.getRsiData(uid));

            if (typeof data !== 'undefined') {
                results.push(data);
            }

            debugEnd(`${i + '/' + uids.length} Запуск getRsiData ${instrumentsForTrade[uid].ticker}`);

            ++i;
        }

        const instrumentsResult = results
            .filter(r => Boolean(r))
            .sort((a, b) => {
                return b.currentMonthRsiMonth - a.currentMonthRsiMonth;
            })
            .filter(f => f.currentMonthRsiMonth > this.rsiMonth &&
                f.currentMonthRsiWeek > this.rsiWeek &&
                f.currentMonthRsiDay > this.rsiDay,
            )
            .slice(0, size);

        if (isDebugEnable()) {
            instrumentsResult.forEach((b, k) => {
                console.log(k + 1, b); // eslint-disable-line no-console
            });
        }

        return instrumentsResult;
    }

    async getRsiData(instrumentUID: string) {
        const { instrument } = (await instruments.getInstrumentById(instrumentUID)) || {};

        if (instrument) {
            const from = new Date();

            from.setDate(from.getDate() - 365);

            const to = new Date();

            try {
                const { technicalIndicators: technicalIndicatorsMonth } = (await sdk.marketData.getTechAnalysis({
                    indicatorType: GetTechAnalysisRequest_IndicatorType.INDICATOR_TYPE_RSI, /* eslint-disable-line camelcase */
                    instrumentUid: instrumentUID,
                    from,
                    to,
                    interval: GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_MONTH, /* eslint-disable-line camelcase */
                    typeOfPrice: GetTechAnalysisRequest_TypeOfPrice.TYPE_OF_PRICE_CLOSE, /* eslint-disable-line camelcase */
                    length: 12,
                })) || {};

                const { technicalIndicators: technicalIndicatorsWeek } = (await sdk.marketData.getTechAnalysis({
                    indicatorType: GetTechAnalysisRequest_IndicatorType.INDICATOR_TYPE_RSI, /* eslint-disable-line camelcase */
                    instrumentUid: instrumentUID,
                    from,
                    to,
                    interval: GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_WEEK, /* eslint-disable-line camelcase */
                    typeOfPrice: GetTechAnalysisRequest_TypeOfPrice.TYPE_OF_PRICE_CLOSE, /* eslint-disable-line camelcase */
                    length: 52,
                })) || {};

                const { technicalIndicators: technicalIndicatorsDay } = (await sdk.marketData.getTechAnalysis({
                    indicatorType: GetTechAnalysisRequest_IndicatorType.INDICATOR_TYPE_RSI, /* eslint-disable-line camelcase */
                    instrumentUid: instrumentUID,
                    from,
                    to,
                    interval: GetTechAnalysisRequest_IndicatorInterval.INDICATOR_INTERVAL_ONE_DAY, /* eslint-disable-line camelcase */
                    typeOfPrice: GetTechAnalysisRequest_TypeOfPrice.TYPE_OF_PRICE_CLOSE, /* eslint-disable-line camelcase */
                    length: 14,
                })) || {};

                if (
                    !technicalIndicatorsMonth.length ||
                    !technicalIndicatorsWeek.length ||
                    !technicalIndicatorsDay.length
                ) {
                    return undefined;
                }

                const currentMonthRsiMonth = Common.getPrice(
                    technicalIndicatorsMonth[technicalIndicatorsMonth.length - 1].signal,
                );

                const currentMonthRsiWeek = Common.getPrice(
                    technicalIndicatorsWeek[technicalIndicatorsWeek.length - 1].signal,
                );
                const currentMonthRsiDay = Common.getPrice(
                    technicalIndicatorsDay[technicalIndicatorsDay.length - 1].signal,
                );

                if (isDebugEnable()) {
                    // console.log(technicalIndicatorsMonth.map(t => Common.getPrice(t.signal)).join(', ')); // eslint-disable-line no-console
                    console.log('month', currentMonthRsiMonth); // eslint-disable-line no-console

                    // console.log(technicalIndicatorsWeek.map(t => Common.getPrice(t.signal)).join(', ')); // eslint-disable-line no-console
                    console.log('week', currentMonthRsiWeek); // eslint-disable-line no-console

                    // console.log(technicalIndicatorsDay.map(t => Common.getPrice(t.signal)).join(', ')); // eslint-disable-line no-console
                    console.log('day', currentMonthRsiDay); // eslint-disable-line no-console
                    console.log(); // eslint-disable-line no-console
                }

                if (currentMonthRsiMonth && currentMonthRsiWeek && currentMonthRsiDay) {
                    return {
                        currentMonthRsiMonth,
                        currentMonthRsiWeek,
                        currentMonthRsiDay,
                        uid: instrumentUID,
                        ticker: instrument.ticker,
                    };
                }
            } catch (e) {
                console.log(e); // eslint-disable-line no-console

                return undefined;
            }

            return undefined;
        }

        return undefined;
    }

    /**
     * Рассчитывает процентное отношение объёмов покупки, к объёмам продажи в стакане для списка инструментов.
     * Возвращает среднее для всех заданных инструментов и по каждому отдельно.
     *
     * @param uids
     * @returns
     */
    async getOrderBookVolumeRatio(uids: string[]) {
        const result = [];

        for (let i = 0; i < uids.length; i++) {
            try {
                const uid = uids[i];
                const { bids, asks } = (await sdk.marketData.getOrderBook({
                    depth: 50,
                    instrumentId: uid,
                })) || {};

                let bidsQuantity = 0;

                for (let j = 0; j < bids?.length; j++) {
                    bidsQuantity += bids[j].quantity;
                }

                let asksQuantity = 0;

                for (let j = 0; j < asks?.length; j++) {
                    asksQuantity += asks[j].quantity;
                }

                result.push({
                    uid,
                    bidAsk: (bidsQuantity - asksQuantity) / bidsQuantity,
                });
            } catch (e) {
                console.log(e); // eslint-disable-line
            }
        }

        return {
            market: result.reduce((acc, val) => acc + val.bidAsk, 0) / result.length,
            result,
        };
    }
}
