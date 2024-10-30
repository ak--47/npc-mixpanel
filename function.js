import {  http } from '@google-cloud/functions-framework';
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
import headless from './components/headless.js';



/**
 * @typedef {import('./components/headless').PARAMS} Params 
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
		t.end();
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

async function main(data) {
	return await headless(data);
}

async function ping(data) {
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
