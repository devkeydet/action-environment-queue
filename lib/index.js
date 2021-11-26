"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const getDeploymentsWaitingFor_1 = require("./getDeploymentsWaitingFor");
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let timer = 0;
        const inputs = {
            environment: core.getInput('environment'),
            token: core.getInput('github-token'),
            delay: Number(core.getInput('delay')),
            timeout: Number(core.getInput('timeout'))
        };
        const octokit = github.getOctokit(inputs.token);
        const context = github.context;
        const jobs = yield octokit.rest.actions.listJobsForWorkflowRun(Object.assign(Object.assign({}, context.repo), { run_id: context.runId }));
        const jobId = jobs.data.jobs.filter(job => job.name == context.job)[0].id;
        let waitingFor = yield (0, getDeploymentsWaitingFor_1.getDeploymentsWaitingFor)(octokit, context, inputs, jobId);
        if (waitingFor.length === 0) {
            core.info(`no other deployments for Environment (${inputs.environment}) found`);
            process.exit(0);
        }
        while (waitingFor.find(status => ['in_progress', 'queued'].includes(status.state))) {
            timer += inputs.delay;
            // time out!
            if (timer >= inputs.timeout) {
                core.setFailed('environment queue timed out');
                process.exit(1);
            }
            for (const status of waitingFor) {
                const deploymentUrl = status.deployment_url;
                const arr = deploymentUrl.split('/');
                const deploymentId = arr[arr.length - 1];
                core.info(`waiting for deployment: ${deploymentId}, current state: ${status.state}`);
            }
            // zzz
            yield sleep(inputs.delay);
            // get the data again
            waitingFor = yield (0, getDeploymentsWaitingFor_1.getDeploymentsWaitingFor)(octokit, context, inputs, jobId);
        }
        core.info('all deployments in the queue completed!');
    });
}
run().catch(e => core.setFailed(e.message));
