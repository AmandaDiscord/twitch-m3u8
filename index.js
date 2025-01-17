const https = require('https');

const clientId = "kimne78kx3ncx6brgo4mv6wki5h1ko";

/**
 * @typedef {Object} Stream
 * @property {string} quality
 * @property {string | null} resolution
 * @property {string} url
 */

/**
 * @param {string} id
 * @param {boolean} isVod
 * @returns {Promise<{ value: string; signature: string; }>}
 */
function getAccessToken(id, isVod) {
	const payload = {
		variables: {
			isLive: !isVod,
			login: isVod ? "" : id,
			isVod: isVod,
			vodID: isVod ? id : "",
			playerType: "embed"
		}
	};
	if (isVod) {
		payload.operationName = "PlaybackAccessToken_Template"
		payload.query = "query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!) {  streamPlaybackAccessToken(channelName: $login, params: {platform: \"web\", playerBackend: \"mediaplayer\", playerType: $playerType}) @include(if: $isLive) {    value    signature    __typename  }  videoPlaybackAccessToken(id: $vodID, params: {platform: \"web\", playerBackend: \"mediaplayer\", playerType: $playerType}) @include(if: $isVod) {    value    signature    __typename  }}";
	}
	else {
		payload.operationName = "PlaybackAccessToken";
		payload.extensions = {
			persistedQuery: {
				version: 1,
				sha256Hash: "0828119ded1c13477966434e15800ff57ddacf13ba1911c129dc2200705b0712"
			}
		};
	}
	const data = JSON.stringify(payload);

	const options = {
		hostname: 'gql.twitch.tv',
		port: 443,
		path: '/gql',
		method: 'POST',
		headers: {
			'Client-id': clientId
		}
	};

	return new Promise((resolve, reject) => {
		const req = https.request(options, (response) => {
			var resData = {};
			resData.statusCode = response.statusCode;
			resData.body = [];
			response.on('data', (chunk) => resData.body.push(chunk));
			response.on('end', () => {
				const body = resData.body.join('');

				if (resData.statusCode != 200) {
					reject(new Error(`${JSON.parse(body).message}`));
				} else {
					if (isVod) {
						resolve(JSON.parse(body).data.videoPlaybackAccessToken);
					} else {
						resolve(JSON.parse(body).data.streamPlaybackAccessToken);
					}
				}
			});
		});

		req.on('error', (error) => reject(error));
		req.write(data);
		req.end();
	});
}

/**
 * @param {string} id
 * @param {{ value: string; signature: string; }} accessToken
 * @param {boolean} vod
 * @returns {Promise<string>}
 */
function getPlaylist(id, accessToken, vod) {
	return new Promise((resolve, reject) => {
		const req = https.get(`https://usher.ttvnw.net/${vod ? 'vod' : 'api/channel/hls'}/${id}.m3u8?client_id=${clientId}&token=${accessToken.value}&sig=${accessToken.signature}&allow_source=true&allow_audio_only=true`, (response) => {
			let data = {};
			data.statusCode = response.statusCode;
			data.body = [];
			response.on('data', (chunk) => data.body.push(chunk));
			response.on('end', () => {
				const body = data.body.join('');

				switch (data.statusCode) {
					case 200:
						resolve(body);
						break;
					case 404:
						reject(new Error('Transcode does not exist - the stream is probably offline'));
						break;
					default:
						reject(new Error(`Twitch returned status code ${data.statusCode}`));
						break;
				}
			});
		})
			.on('error', (error) => reject(error));

		req.end()
	});
}

/** @param {string} playlist */
function parsePlaylist(playlist) {
	/** @type {Array<{ quality: string; resolution: string | null; url: string; }>} */
	const parsedPlaylist = [];
	const lines = playlist.split('\n');
	for (let i = 4; i < lines.length; i += 3) {
		parsedPlaylist.push({
			quality: lines[i - 2].split('NAME="')[1].split('"')[0],
			resolution: (lines[i - 1].indexOf('RESOLUTION') != -1 ? lines[i - 1].split('RESOLUTION=')[1].split(',')[0] : null),
			url: lines[i]
		});
	}
	return parsedPlaylist;
}

/**
 * @param {string} channel
 * @param {boolean} [raw]
 * @returns {Promise<Array<Stream> | string>}
 */
function getStream(channel, raw) {
	return new Promise((resolve, reject) => {
		getAccessToken(channel, false)
			.then((accessToken) => getPlaylist(channel, accessToken, false))
			.then((playlist) => resolve((raw ? playlist : parsePlaylist(playlist))))
			.catch(error => reject(error));
	});
}

/**
 * @param {string} vid
 * @param {boolean} [raw]
 * @returns {Promise<Array<Stream> | string>}
 */
function getVod(vid, raw) {
	return new Promise((resolve, reject) => {
		getAccessToken(vid, true)
			.then((accessToken) => getPlaylist(vid, accessToken, true))
			.then((playlist) => resolve((raw ? playlist : parsePlaylist(playlist))))
			.catch(error => reject(error));
	});
}

module.exports = {
	getStream: getStream,
	getVod: getVod
};
