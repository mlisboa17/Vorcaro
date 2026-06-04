export type VorcaroActionObservabilitySnapshot = {
  action_proposal_created: number;
  action_proposal_reused: number;
  action_proposal_approved: number;
  action_proposal_rejected: number;
  action_proposal_expired: number;
  action_executed: number;
  action_failed: number;
};

export class VorcaroActionObservabilityService {
  private metrics: VorcaroActionObservabilitySnapshot = {
    action_proposal_created: 0,
    action_proposal_reused: 0,
    action_proposal_approved: 0,
    action_proposal_rejected: 0,
    action_proposal_expired: 0,
    action_executed: 0,
    action_failed: 0,
  };

  recordCreated() {
    this.metrics.action_proposal_created += 1;
  }

  recordReused() {
    this.metrics.action_proposal_reused += 1;
  }

  recordApproved() {
    this.metrics.action_proposal_approved += 1;
  }

  recordRejected() {
    this.metrics.action_proposal_rejected += 1;
  }

  recordExpired(count = 1) {
    this.metrics.action_proposal_expired += count;
  }

  recordExecuted() {
    this.metrics.action_executed += 1;
  }

  recordFailed() {
    this.metrics.action_failed += 1;
  }

  snapshot(): VorcaroActionObservabilitySnapshot {
    return { ...this.metrics };
  }

  reset() {
    this.metrics = {
      action_proposal_created: 0,
      action_proposal_reused: 0,
      action_proposal_approved: 0,
      action_proposal_rejected: 0,
      action_proposal_expired: 0,
      action_executed: 0,
      action_failed: 0,
    };
  }
}

export const vorcaroActionObservability = new VorcaroActionObservabilityService();
