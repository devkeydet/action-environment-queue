import * as core from '@actions/core'
import { queueWorkflow } from './queueWorkflow'
import { Inputs } from "./Inputs"

async function run() {
    const inputs: Inputs = {
        environment: core.getInput('environment'),
        token: core.getInput('github-token'),
        delay: Number(core.getInput('delay')),
        timeout: Number(core.getInput('timeout'))
    }

    await queueWorkflow(inputs)
}

run().catch(e => core.setFailed(e.message))