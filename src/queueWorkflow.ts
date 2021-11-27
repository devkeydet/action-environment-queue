import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from '@octokit/rest'
import { getDeploymentsWaitingFor } from "./getDeploymentsWaitingFor"
import { Inputs } from "./Inputs"

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
let latestQueueStatus = '';

export async function getLatestQueueStatus(): Promise<string> {
    return latestQueueStatus
}

export async function queueWorkflow(inputs: Inputs) {
    let timer = 0;
    const octokit = github.getOctokit(inputs.token);
    const context = github.context;

    const jobs = await octokit.rest.actions.listJobsForWorkflowRun({
        ...context.repo,
        run_id: context.runId
    });

    const jobId = jobs.data.jobs.filter(job => job.name == context.job)[0].id;

    let waitingFor = await getDeploymentsWaitingFor(octokit as Octokit, context, inputs, jobId);

    if (waitingFor.length === 0) {
        latestQueueStatus = `no other deployments for Environment (${inputs.environment}) found`
        core.info(latestQueueStatus);
        process.exit(0);
    }

    while (waitingFor.find(status => ['in_progress', 'queued'].includes(status.state))) {
        timer += inputs.delay;

        // time out!
        if (timer >= inputs.timeout) {
            latestQueueStatus = 'environment queue timed out'
            core.setFailed(latestQueueStatus);
            process.exit(1);
            break;
        }

        for (const status of waitingFor) {
            const deploymentUrl = status.deployment_url;
            const arr = deploymentUrl.split('/');
            const deploymentId = arr[arr.length - 1];
            latestQueueStatus = `waiting for deployment: ${deploymentId}, current state: ${status.state}`
            core.info(latestQueueStatus);
        }

        // zzz
        //await sleep(inputs.delay);

        // get the data again
        waitingFor = await getDeploymentsWaitingFor(octokit as Octokit, context, inputs, jobId);
    }

    latestQueueStatus = 'all deployments in the queue completed!'
    core.info(latestQueueStatus);
}

function name(params:string) {
    
}