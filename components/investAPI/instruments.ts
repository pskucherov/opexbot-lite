import { InstrumentIdType, InstrumentStatus, Share } from 'tinkoff-sdk-grpc-js/dist/generated/instruments';
import { Common } from './common';
import { Common as UtilsCommon } from '../../src/Common/Common';

export class Instruments extends Common {
    cachedShares: { [x: string]: Share; } = {};

    async getAllShares() {
        try {
            return (await this.sdk.instruments.shares({
                instrumentStatus: InstrumentStatus.INSTRUMENT_STATUS_BASE,
            })).instruments;
        } catch (e) {
            return [];
        }
    }

    /**
     * Возвращает инструмент по id, если есть в кеше. Если нет, то идёт в API.
     */
    async getInstrumentById(id: string, idType?: InstrumentIdType) {
        if (this.cachedShares[id]) {
            return {
                instrument: this.cachedShares[id],
            };
        }

        return await this.sdk.instruments.getInstrumentBy({
            idType: idType || this.sdk.InstrumentIdType.INSTRUMENT_ID_TYPE_UID,
            id,
        });
    }

    /**
     * Возвращает массив акций, доступных для торговли и подходящих для заданного лимита лота.
     */
    async getSharesForTrading(props?: { maxLotPrice?: number }) {
        const { maxLotPrice } = props || {};

        // Получение акций, доступных для торговли, в виде объекта. Где ключ — это uid, для быстрого доступа в дальнейшем.
        const shares = (await this.getAllShares()).filter(f => f.currency === 'rub' &&
            f.apiTradeAvailableFlag &&
            f.buyAvailableFlag &&
            f.sellAvailableFlag,
        ).reduce<{ [key: string]: Share }>((acc, val) => {
            acc[val.uid] = val;

            return acc;
        }, {});

        const prices = await this.getLastPrices(Object.keys(shares));

        // Фильтрует цены, с учётом лотности, которые нужно удалить.
        const filtredPricesToDel = !maxLotPrice ? [] : prices?.lastPrices?.filter(f => {
            const currentPrice = UtilsCommon.getPrice(f.price) || 0;
            const lotPrice = currentPrice * shares[f.instrumentUid].lot;

            return lotPrice > maxLotPrice;
        });

        // Возвращает массив инструментов, которые отфильтрованы по заданным выше условиям.
        filtredPricesToDel.forEach(f => {
            delete shares[f.instrumentUid];
        });

        this.cachedShares = shares;

        return shares;
    }

    async getLastPrices(uids: string[]) {
        return await this.sdk.marketData.getLastPrices({ instrumentId: uids });
    }
}
