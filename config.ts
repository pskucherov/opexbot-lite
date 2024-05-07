// https://articles.opexflow.com/trading-training/kak-poluchit-SANDBOXtoken-dlya-tinkoff-investicii.htm
import { createSdk } from 'tinkoff-sdk-grpc-js';
import fs from 'fs';

const SANDBOXTOKEN = '';
const SANDBOXACCID = '';
const APPNAME = '';

if (!SANDBOXTOKEN || !SANDBOXACCID) {
    throw 'Заполните токен и аккаунт id в файле config.ts';
}

const sdk = createSdk(SANDBOXTOKEN, APPNAME, (a, b, c) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    let str = '';

    if (a) {
        str += (typeof a === 'object' ? JSON.stringify(a, null, 4) : a) + '\r\n';
    }
    if (b) {
        str += (typeof b === 'object' ? JSON.stringify(b, null, 4) : b) + '\r\n';
    }
    if (c) {
        str += (typeof c === 'object' ? JSON.stringify(c, null, 4) : c) + '\r\n';
    }

    if (str) {
        str += '\r\n';
    }

    fs.appendFile('sdkLogs.txt', str, err => {
        if (err) throw err;
    });

    return str;
}, {
    isSandbox: true,
});

const SANDBOXSDK = sdk;

const ORDERBOOK_TRESHHOLD = 2;

const SCREENER_PARAMS = {
    maxLotPrice: 4500,
    rsiMonth: 70,
    rsiWeek: 60,
    rsiDay: 60,
};

export {
    SANDBOXSDK,
    SANDBOXACCID,
    ORDERBOOK_TRESHHOLD,
    SCREENER_PARAMS,
};
