// https://articles.opexflow.com/trading-training/kak-poluchit-SANDBOXtoken-dlya-tinkoff-investicii.htm
import { createSdk } from 'tinkoff-sdk-grpc-js';

const SANDBOXTOKEN = '';
const SANDBOXACCID = '';
const APPNAME = '';

if (!SANDBOXTOKEN || !SANDBOXACCID) {
    throw 'Заполните токен и аккаунт id в файле config.ts';
}

const sdk = createSdk(
    SANDBOXTOKEN,
    APPNAME,
    (a, b, c) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        return console.log(a || '', b || '', c || ''); // eslint-disable-line no-console
    }, {
    isSandbox: true,
});

const SANDBOXSDK = sdk;

export {
    SANDBOXSDK,
    SANDBOXACCID,
};
