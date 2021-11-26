import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from '@octokit/rest'
import { getDeploymentsWaitingFor } from "./getDeploymentsWaitingFor"

const sleep = (ms: number | undefined) => new Promise(resolve => setTimeout(resolve, ms))

async function run() {
    let timer = 0

    const inputs: Inputs = {
        environment: core.getInput('environment'),
        token: core.getInput('github-token'),
        delay: Number(core.getInput('delay')),
        timeout: Number(core.getInput('timeout'))
    }

    const octokit = github.getOctokit(inputs.token)
    const context = github.context

    const jobs = await octokit.rest.actions.listJobsForWorkflowRun({
        ...context.repo,
        run_id: context.runId
    })

    const jobId = jobs.data.jobs.filter(job => job.name == context.job)[0].id

    let waitingFor = await getDeploymentsWaitingFor(octokit as Octokit, context, inputs, jobId)

    if (waitingFor.length === 0) {
        core.info(`no other deployments for Environment (${inputs.environment}) found`)
        process.exit(0)
    }

    while (waitingFor.find(status => ['in_progress', 'queued'].includes(status.state))) {
        timer += inputs.delay

        // time out!
        if (timer >= inputs.timeout) {
            core.setFailed('environment queue timed out')
            process.exit(1)
        }

        for (const status of waitingFor) {
            const deploymentUrl = status.deployment_url
            const arr = deploymentUrl.split('/')
            const deploymentId = arr[arr.length - 1]
            core.info(`waiting for deployment: ${deploymentId}, current state: ${status.state}`)
        }

        // zzz
        await sleep(inputs.delay)

        // get the data again
        waitingFor = await getDeploymentsWaitingFor(octokit as Octokit, context, inputs, jobId)
    }

    core.info('all deployments in the queue completed!')
}

run().catch(e => core.setFailed(e.message))