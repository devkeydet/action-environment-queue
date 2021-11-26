import * as core from '@actions/core'
import * as util from 'util'
import { Octokit } from '@octokit/rest';
import { Context } from '@actions/github/lib/context';

async function getDeploymentsWaitingFor(octokit: Octokit, context: Context, inputs: Inputs, jobId: number): Promise<DeploymentStatus[]> {
    const deployments = await octokit.rest.repos.listDeployments({
        ...context.repo,
        environment: inputs.environment
    })

    const allDeploymentStatusesToReview: DeploymentStatus[] = []

    for (const deployment of deployments.data) {

        const deploymentStatuses = await octokit.rest.repos.listDeploymentStatuses({
            ...context.repo,
            deployment_id: deployment.id
        })

        if (deploymentStatuses.data.length > 0) {
            const latestDeplymentStatus = deploymentStatuses.data[0] as DeploymentStatus
            if (['in_progress', 'queued'].includes(latestDeplymentStatus.state)) {
                allDeploymentStatusesToReview.push(latestDeplymentStatus)
            }
        }
    }

    let waitingFor: DeploymentStatus[] = []

    if (allDeploymentStatusesToReview.length > 0) {
        const currentDeploymentStatus = allDeploymentStatusesToReview.filter(status => status.log_url.includes(jobId.toString()))[0]
        waitingFor = allDeploymentStatusesToReview
            .filter(status => !status.log_url.includes(jobId.toString()))
            .filter(status => new Date(status.created_at) < new Date(currentDeploymentStatus.created_at))
    }

    core.info(`found ${waitingFor.length} statuses to wait for`)
    core.debug(util.inspect(waitingFor.map(status => ({ id: status.id, name: status.state }))))
    return waitingFor
}

export { getDeploymentsWaitingFor }