import { expect, test, jest } from '@jest/globals'
import { queueWorkflow } from '../src/queueWorkflow'
import { getLatestQueueStatus } from '../src/queueWorkflow';
import { Inputs } from '../src/Inputs'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { Octokit } from '@octokit/rest'
import { Context } from '@actions/github/lib/context'
import * as mockProcess from 'jest-mock-process'

const inputs: Inputs = {
    environment: 'foo',
    token: '',
    delay: 1000,
    timeout: 5000
}

const octokit = new Octokit()
jest.spyOn(github, 'getOctokit').mockReturnValue(octokit)
let context = new Context()
context.job = ""
Object.defineProperty(github, 'context', { get: () => context })
Object.defineProperty(context, 'repo', {
    get: () => {
        owner: ""
        repo: ""
        runId: 0
    }
})

const listJobsForWorkflowRun: any = {
    data: {
        jobs: [
            {
                name: "",
                id: 0
            }
        ]
    }
}

jest.spyOn(octokit.actions, 'listJobsForWorkflowRun').mockReturnValue(listJobsForWorkflowRun)

beforeEach(() => {
    jest.useFakeTimers()
})

test('queueWorkflow: nothing to queue', async () => {
    const listDeployments: any = {
        data: [
            {
                id: 0
            }
        ]
    }

    jest.spyOn(octokit.rest.repos, 'listDeployments').mockReturnValue(listDeployments)

    const listDeploymentStatuses: any = {
        data: [
            {
                id: 0,
                state: 'in_progress',
                log_url: "0"
            }
        ]
    }

    jest.spyOn(octokit.rest.repos, 'listDeploymentStatuses').mockReturnValue(listDeploymentStatuses)

    let msg = ''
    jest.spyOn(core, 'info').mockImplementation((messsage: string) => {
        // eat the cals so they don't show up in the test results on the runner
    })

    let mockExit = mockProcess.mockProcessExit()
    await queueWorkflow(inputs)
    expect(mockExit).toHaveBeenCalledWith(0)
})

test('queueWorkflow: deployments to queue', async () => {
    const listDeployments: any = {
        data: [
            {
                id: 0
            },
            {
                id: 1
            }
        ]
    }

    jest.spyOn(octokit.rest.repos, 'listDeployments').mockReturnValue(listDeployments)

    // @ts-ignore
    jest.spyOn(octokit.rest.repos, 'listDeploymentStatuses').mockImplementation(async (params: any) => {
        if (params.deployment_id == 0) {
            return {
                data: [
                    {
                        id: 0,
                        state: 'in_progress',
                        log_url: 'https://github.com/devkeydet/action-environment-queue/runs/0?check_suite_focus=true',
                        created_at: '2021-11-25T12:50:14Z'
                    }
                ]
            }
        }
        return {
            data: [
                {
                    id: 1,
                    state: 'in_progress',
                    log_url: 'https://github.com/devkeydet/action-environment-queue/runs/4336554753?check_suite_focus=true',
                    deployment_url: "https://api.github.com/repos/devkeydet/action-environment-queue/deployments/461869032",
                    created_at: '2021-11-25T12:40:14Z'
                }
            ]
        }
    })

    queueWorkflow(inputs).then(async () => {
        expect((await getLatestQueueStatus())).toContain('completed')
    })

    while (!(await getLatestQueueStatus()).includes('waiting')) {
    }

    jest.spyOn(core, 'info').mockImplementation(() => {
        // eat the cals so they don't show up in the test results on the runner
    })

    // @ts-ignore
    jest.spyOn(octokit.rest.repos, 'listDeploymentStatuses').mockImplementation(async (params: any) => {
        if (params.deployment_id == 0) {
            return {
                data: [
                    {
                        id: 0,
                        state: 'in_progress',
                        log_url: 'https://github.com/devkeydet/action-environment-queue/runs/0?check_suite_focus=true',
                        created_at: '2021-11-25T12:50:14Z'
                    }
                ]
            }
        }
        return {
            data: [
                {
                    id: 1,
                    state: 'success',
                    log_url: 'https://github.com/devkeydet/action-environment-queue/runs/4336554753?check_suite_focus=true',
                    deployment_url: "https://api.github.com/repos/devkeydet/action-environment-queue/deployments/461869032",
                    created_at: '2021-11-25T12:40:14Z'
                }
            ]
        }
    })
    while (!(await getLatestQueueStatus()).includes('completed')) {
    }
})

test('queueWorkflow: timed out', async () => {
    const listDeployments: any = {
        data: [
            {
                id: 0
            },
            {
                id: 1
            }
        ]
    }

    jest.spyOn(octokit.rest.repos, 'listDeployments').mockReturnValue(listDeployments)

    // @ts-ignore
    jest.spyOn(octokit.rest.repos, 'listDeploymentStatuses').mockImplementation(async (params: any) => {
        if (params.deployment_id == 0) {
            return {
                data: [
                    {
                        id: 0,
                        state: 'in_progress',
                        log_url: 'https://github.com/devkeydet/action-environment-queue/runs/0?check_suite_focus=true',
                        created_at: '2021-11-25T12:50:14Z'
                    }
                ]
            }
        }
        return {
            data: [
                {
                    id: 1,
                    state: 'in_progress',
                    log_url: 'https://github.com/devkeydet/action-environment-queue/runs/4336554753?check_suite_focus=true',
                    deployment_url: "https://api.github.com/repos/devkeydet/action-environment-queue/deployments/461869032",
                    created_at: '2021-11-25T12:40:14Z'
                }
            ]
        }
    })
    let mockExit = mockProcess.mockProcessExit()
    jest.spyOn(core, 'setFailed').mockImplementation((messsage: any) => {
        // eat the cals so they don't show up in the test results on the runner
    })
    await queueWorkflow(inputs)
    expect(mockExit).toHaveBeenCalledWith(1)
})