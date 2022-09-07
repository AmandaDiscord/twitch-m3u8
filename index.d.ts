export type Stream = {
    quality: string;
    resolution: string | null;
    url: string;
};
/**
 * @param {string} channel
 * @param {boolean} [raw]
 * @returns {Promise<Array<Stream> | string>}
 */
export function getStream(channel: string, raw?: boolean): Promise<Array<Stream> | string>;
/**
 * @param {string} vid
 * @param {boolean} [raw]
 * @returns {Promise<Array<Stream> | string>}
 */
export function getVod(vid: string, raw?: boolean): Promise<Array<Stream> | string>;
