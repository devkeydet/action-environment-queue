const core = require('@actions/core')
const util = require('util')

async function getDeploymentsWaitingFor(octokit, context, inputs, job, before) {
    const deployments = await octokit.rest.repos.listDeployments({
        ...context.owner,
        ...context.repo,
        environment: inputs.environment
    })

    const allDeploymentStatusesToReview = []

    for (const deployment of deployments.data) {

        const deploymentStatuses = await octokit.rest.repos.listDeploymentStatuses({
            ...context.owner,
            ...context.repo,
            deployment_id: deployment.id
        })

        if (deploymentStatuses.data.length > 0) {
            const latestDeplymentStatus = deploymentStatuses.data[0]
            if (['in_progress', 'queued'].includes(latestDeplymentStatus.state)) {
                allDeploymentStatusesToReview.push(latestDeplymentStatus)
            }
        }
    }
    let waitingFor

    if (allDeploymentStatusesToReview.length > 0) {
        const currentDeploymentStatus = allDeploymentStatusesToReview.filter(status => status.log_url.includes(job.id))[0]
        waitingFor = allDeploymentStatusesToReview
            .filter(status => !status.log_url.includes(job.id))
            .filter(status => new Date(status.created_at) < new Date(currentDeploymentStatus.created_at))
    }

    core.info(`found ${waitingFor.length} statuses to wait for`)
    core.debug(util.inspect(waitingFor.map(status => ({ id: status.id, name: status.state }))))
    return waitingFor
}

export { getDeploymentsWaitingFor }