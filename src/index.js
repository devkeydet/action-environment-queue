const core = require('@actions/core')
const github = require('@actions/github')
const util = require('util')
const { getDeploymentsWaitingFor } = require("./getDeploymentsWaitingFor")

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function run() {
    let timer = 0

    const inputs = {
        environment: core.getInput('environment'),
        token: core.getInput('github-token'),
        delay: Number(core.getInput('delay')),
        timeout: Number(core.getInput('timeout'))
    }

    const octokit = github.getOctokit(inputs.token)
    const context = github.context

    const jobs = await octokit.rest.actions.listJobsForWorkflowRun({
        ...context.owner,
        ...context.repo,
        run_id: context.runId
    })

    const job = jobs.data.jobs.filter(job => job.name == context.job)[0]

    let waitingFor = await getDeploymentsWaitingFor(octokit, context, inputs, job)

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
        waitingFor = await getDeploymentsWaitingFor(octokit, context, inputs, job)
    }

    core.info('all deployments in the queue completed!')
 }

run().catch(e => core.setFailed(e.message))