import { Common } from '../Common/Common';
import { Quotation } from 'tinkoff-sdk-grpc-js/dist/generated/common';
import { Share } from 'tinkoff-sdk-grpc-js/dist/generated/instruments';
import { OrderDirection, OrderType } from 'tinkoff-sdk-grpc-js/dist/generated/orders';

const path = require('path');
const name = __dirname.split(path.sep).pop();

export default class AutoProfit extends Common {
    static type = 'autoprofit';
    name: string | undefined;

    decisionBuyPositionMessage!: string;
    decisionClosePositionMessage!: string | number;
    allInstrumentsInfo: {
        [key: string]: Share
    } = {};

    breakeven: number = 0.0011;
    breakevenStep1: number = 0.002;
    breakevenStep2: number = 0.005;
    breakevenStep3: number = 0.0075;
    breakevenStep4: number = 0.0095;

    // @ts-ignore
    constructor(...args) {
        // @ts-ignore
        super(...args);

        this.type = AutoProfit.type;
        this.isPortfolio = false;
        this.name = name;
    }

    async processing() { // eslint-disable-line
        await super.processing();

        if (!this.inProgress) {
            return;
        }

        const sdk = this.sdk;
        const accountId = this.accountId;

        if (!sdk || !accountId) {
            return;
        }

        try {
            await this.syncPos();

            const isSync = this.currentPositions.every(p =>

                // @ts-ignore
                p?.quantity?.units && p?.quantity?.units === p?.balance && !p?.blocked,
            );

            if (!isSync) {
                return;
            }

            const { positions } = this.currentPortfolio || {};

            if (!positions?.length) {
                return;
            }

            await this.updateOrders();

            for (let j = 0; j < positions.length; j++) {
                const {
                    // instrumentType,
                    quantity,
                    averagePositionPrice,
                    instrumentUid,
                    currentPrice,
                } = positions[j];

                const isShort = (this.getPrice(quantity) || 0) < 0;

                const instrumentInOrders = this.currentOrders.find(o => o.instrumentUid === instrumentUid);
                const avgPrice = this.getPrice(averagePositionPrice) || 0;

                if (
                    !averagePositionPrice ||
                    !this.allInstrumentsInfo?.[instrumentUid]?.lot ||

                    // Если по инструменту выставлена активная заявка, то стоп не ставим.
                    instrumentInOrders
                ) {
                    if (instrumentInOrders) {
                        console.log('instrumentInOrders', instrumentInOrders, this.currentOrders); // eslint-disable-line no-console
                    }
                    continue;
                }

                if (this.hasBlockedPositions(instrumentUid)) {
                    this.decisionBuyPositionMessage = 'decisionBuy: есть блокированные позиции.';

                    return;
                }

                const averagePositionPriceVal = Common.getPrice(averagePositionPrice);

                if (!averagePositionPrice || !averagePositionPriceVal ||
                    !this.allInstrumentsInfo[instrumentUid]?.lot) {
                    continue;
                }

                const min = this.allInstrumentsInfo[instrumentUid].minPriceIncrement;

                if (!min) {
                    continue;
                }

                const {
                    breakeven,
                } = isShort ?
                    this.getStopProfitForShort(averagePositionPriceVal) :
                    this.getStopProfitForLong(averagePositionPriceVal);

                const realStop = this.getRealStop(isShort, breakeven, min);
                const curPrice = Common.getPrice(currentPrice) || 0;

                console.log(); // eslint-disable-line no-console
                console.log('TICKER:', this.allInstrumentsInfo[instrumentUid]?.ticker); // eslint-disable-line no-console
                console.log(positions[j]); // eslint-disable-line no-console
                console.log('avgPrice', // eslint-disable-line no-console
                    avgPrice,
                    'realStop', realStop,
                    'curPrice', curPrice,
                    'curPriceDelta', curPrice * 0.9995,
                    'PROFIT:', ((curPrice - avgPrice) / avgPrice).toFixed(5), '%',
                );

                if (realStop &&
                    (
                        (isShort && (curPrice * 1.0005) <= realStop) ||
                        (!isShort && (curPrice * 0.9995) >= realStop)
                    )
                ) {
                    const p = this.getStopPriceWithSteps(isShort, curPrice, breakeven, averagePositionPriceVal);

                    const units = Math.floor(p);
                    const nano = p * 1e9 - Math.floor(p) * 1e9;

                    const newUnits1 = Common.getMinPriceIncrement(units, min.units);
                    const newNano1 = Common.getMinPriceIncrement(nano, min.nano);

                    const curStopOrderPrice = Common.resolveMinPriceIncrement({
                        units: newUnits1,
                        nano: newNano1,
                    }, min);

                    const data = {
                        quantity: Math.abs(
                            (Common.getPrice(quantity) || 1) /
                            this.allInstrumentsInfo[instrumentUid].lot,
                        ),
                        price: curStopOrderPrice,
                        direction: isShort ?
                            OrderDirection.ORDER_DIRECTION_BUY :
                            OrderDirection.ORDER_DIRECTION_SELL,
                        instrumentId: instrumentUid,
                        orderType: OrderType.ORDER_TYPE_LIMIT,
                        accountId,
                    };

                    console.log('close position', data); // eslint-disable-line no-console
                    await sdk.orders.postOrder(data);
                }
            }
        } catch (e) {
            console.log(e); // eslint-disable-line no-console
        }
    }

    getStopPriceWithSteps(
        isShort: boolean,
        curPrice: number,
        breakeven: number,
        averagePositionPriceVal: number,
    ) {
        const {
            step1,
            step2,
            step3,
            step4,
        } = isShort ?
            this.getStopProfitForShort(averagePositionPriceVal) :
            this.getStopProfitForLong(averagePositionPriceVal);

        if (isShort) {
            return curPrice < step4 ?
                (step3 + step4 + curPrice) / 3 :
                curPrice < step3 ?
                    (step3 + step2) / 2 :
                    curPrice < step2 ?
                        (step2 + step1) / 2 :
                        curPrice < step1 ?
                            (breakeven + step1) / 2 :
                            breakeven;
        }

        return curPrice > step4 ?
            (step3 + step4 + curPrice) / 3 :
            curPrice > step3 ?
                (step3 + step2) / 2 :
                curPrice > step2 ?
                    (step2 + step1) / 2 :
                    curPrice > step1 ?
                        (breakeven + step1) / 2 :
                        breakeven;
    }

    /**
     * При рассчётах бывает, что после округления цена закрытия становится меньше, чем цена реального безубытка.
     * Поэтому добавляем или вычитаем один минимальный шаг цены, для получения точного значения безубытка.
     *
     * @param isShort
     * @param breakeven
     * @param min
     * @returns
     */
    getRealStop(isShort: boolean, breakeven: number, min: Quotation) {
        const units = Math.floor(breakeven);
        const nano = breakeven * 1e9 - Math.floor(breakeven) * 1e9;

        const stopPUnits = Common.getMinPriceIncrement(units, min.units);
        const stopPNano = Common.getMinPriceIncrement(nano, min.nano);

        return isShort ?
            Common.getPrice(
                Common.subMinPriceIncrement(
                    Common.resolveMinPriceIncrement({
                        units: stopPUnits,
                        nano: stopPNano,
                    }, min), min),
            ) :
            Common.getPrice(
                Common.addMinPriceIncrement(
                    Common.resolveMinPriceIncrement({
                        units: stopPUnits,
                        nano: stopPNano,
                    }, min), min),
            );
    }

    getStopProfitForLong(price: number) {
        return {
            breakeven: price * (1 + this.breakeven),
            step1: price * (1 + this.breakevenStep1),
            step2: price * (1 + this.breakevenStep2),
            step3: price * (1 + this.breakevenStep3),
            step4: price * (1 + this.breakevenStep4),
        };
    }

    getStopProfitForShort(price: number) {
        return {
            breakeven: price * (1 - this.breakeven),
            step1: price * (1 - this.breakevenStep1),
            step2: price * (1 - this.breakevenStep2),
            step3: price * (1 - this.breakevenStep3),
            step4: price * (1 - this.breakevenStep4),
        };
    }

    async closeStopOrder(accountId: string, stopOrderId: string) {
        await this.sdk?.stopOrders.cancelStopOrder({
            accountId,
            stopOrderId,
        });
    }
}
