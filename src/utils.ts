const path = require('path');
const fs = require('fs');

/**
 * @copypaste https://stackoverflow.com/questions/31645738/how-to-create-full-path-with-nodes-fs-mkdirsync
 *
 * @param {*} targetDir
 * @param {*} param1
 * @returns
 */
export const mkDirByPathSync = (targetDir: string, { isRelativeToScript = false } = {}) => {
    const sep = path.sep;
    const initDir = path.isAbsolute(targetDir) ? sep : '';
    const baseDir = isRelativeToScript ? __dirname : '.';

    return targetDir.split(sep).reduce((parentDir: string, childDir: string) => {
        let curDir = baseDir;

        if (parentDir && childDir) {
            curDir = path.resolve(curDir, parentDir, childDir);
        } else if (parentDir) {
            curDir = path.resolve(curDir, parentDir);
        }

        try {
            fs.mkdirSync(curDir, { recursive: true });

            return curDir;
        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (err.code === 'EEXIST') { // curDir already exists!
                return curDir;
            }

            // To avoid `EISDIR` error on Mac and `EACCES`-->`ENOENT` and `EPERM` on Windows.
            if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
                console.log(`EACCES: permission denied, mkdir '${parentDir}'`); // eslint-disable-line no-console
            }

            const caughtErr = ['EACCES', 'EPERM', 'EISDIR'].indexOf(err.code) > -1;

            if (!caughtErr || caughtErr && curDir === path.resolve(targetDir)) {
                console.log(JSON.stringify(err)); // eslint-disable-line no-console
            }
        }

        return curDir;
    }, initDir);
};

export const logger = (a: any, b: any, c: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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

    fs.appendFile('sdkLogs.txt', str, (err: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (err) throw err;
    });

    return str;
};

export const isDebugEnable = () => {
    return Boolean(process.env.DEBUG);
};

export const debugStart = (name: string) => {
    if (!process.env.DEBUG) {
        return;
    }

    console.log(name, 'START'); // eslint-disable-line no-console
    console.time(name); // eslint-disable-line no-console
};

export const debugEnd = (name: string) => {
    if (!process.env.DEBUG) {
        return;
    }

    console.timeEnd(name); // eslint-disable-line no-console
    console.log(); // eslint-disable-line no-console
};
