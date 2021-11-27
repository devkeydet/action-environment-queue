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
exports.getDeploymentsWaitingFor = void 0;
const core = __importStar(require("@actions/core"));
const util = __importStar(require("util"));
function getDeploymentsWaitingFor(octokit, context, inputs, jobId) {
    return __awaiter(this, void 0, void 0, function* () {
        const deployments = yield octokit.rest.repos.listDeployments(Object.assign(Object.assign({}, context.repo), { environment: inputs.environment }));
        const allDeploymentStatusesToReview = [];
        for (const deployment of deployments.data) {
            const deploymentStatuses = yield octokit.rest.repos.listDeploymentStatuses(Object.assign(Object.assign({}, context.repo), { deployment_id: deployment.id }));
            if (deploymentStatuses.data.length > 0) {
                const latestDeplymentStatus = deploymentStatuses.data[0];
                if (['in_progress', 'queued'].includes(latestDeplymentStatus.state)) {
                    allDeploymentStatusesToReview.push(latestDeplymentStatus);
                }
            }
        }
        let waitingFor = [];
        if (allDeploymentStatusesToReview.length > 0) {
            const currentDeploymentStatus = allDeploymentStatusesToReview.filter(status => status.log_url.includes(jobId.toString()))[0];
            waitingFor = allDeploymentStatusesToReview
                .filter(status => !status.log_url.includes(jobId.toString()))
                .filter(status => new Date(status.created_at) < new Date(currentDeploymentStatus.created_at));
        }
        core.info(`found ${waitingFor.length} deployments to wait for`);
        core.debug(util.inspect(waitingFor.map(status => ({ id: status.id, name: status.state }))));
        return waitingFor;
    });
}
exports.getDeploymentsWaitingFor = getDeploymentsWaitingFor;
