import { cloudEvent, http } from '@google-cloud/functions-framework';
import { Storage } from '@google-cloud/storage';
import { sLog, uid, timer } from 'ak-tools';
import dotenv from 'dotenv';
dotenv.config();
const { NODE_ENV = "" } = process.env;
if (!NODE_ENV) throw new Error("NODE_ENV is required");
import path from 'path';
import { tmpdir } from 'os';
let TEMP_DIR;
if (NODE_ENV === 'dev') TEMP_DIR = './tmp';
else TEMP_DIR = tmpdir();
TEMP_DIR = path.resolve(TEMP_DIR);



/**
 * @typedef {Object} Params
 * @property {string} [foo] - Description of foo
 * @property {number} [bar] - Description of bar
 */



// http entry point
// ? https://cloud.google.com/functions/docs/writing/write-http-functions
http('http-entry', async (req, res) => {
	const runId = uid();
	const reqData = { url: req.url, method: req.method, headers: req.headers, body: req.body, runId };
	let response = {};

	try {
		/** @type {Params} */
		const { body = {} } = req;
		/** @type {Endpoints} */
		const { path } = req;

		const t = timer('job');
		t.start();
		sLog(`START: ${req.path}`, reqData);

		//setup the job
		const [job] = route(path);

		// @ts-ignore
		const result = await job(body);
		t.end()
		sLog(`FINISH: ${req.path} ... ${t.report(false).human}`, result);

		//finished
		res.status(200);
		response = result;


	} catch (e) {
		console.error(`ERROR JOB: ${req.path}`, e);
		res.status(500);
		response = { error: e };
	}
	res.send(JSON.stringify(response));
});


async function ping(data) {
	return Promise.resolve({ status: "ok", message: "service is alive", echo: data });
}


async function main(data) {
	return Promise.resolve({ status: "ok", message: "service is alive", echo: data });
}


/*
----
ROUTER
----
*/


/** @typedef {'/' | '/ping'} Endpoints  */

/**
 * determine routes based on path in request
 * @param  {Endpoints} path
 */
function route(path) {
	switch (path) {
		case "/":
			return [main];
		case "/ping":
			return [ping];
		default:
			throw new Error(`Invalid path: ${path}`);
	}
}



// cloud event entry point
// ? https://cloud.google.com/functions/docs/writing/write-event-driven-functions
// cloudEvent('entry', async (cloudEvent) => {
// 	const { data } = cloudEvent;
// 	const runId = uid();
// 	const reqData = { data, runId };
// 	let response = {};
// 	const t = timer('job');
// 	t.start();
// 	sLog(`START`, reqData);

// 	try {
// 		const result = await main(data);
// 		sLog(`FINISH ${t.end()}`, { ...result, runId });
// 		response = result;

// 	} catch (e) {
// 		console.error(`ERROR! ${e.message || "unknown"}`, e);
// 		response = { error: e };
// 	}

// 	return response;

// });