import { describe, expect, it } from "vitest";

import {
  EXECUTION_CYCLE_TRANSITIONS,
  RUNNER_ENVIRONMENT_TRANSITIONS,
} from "./execution.js";

describe("canonical runner state graphs", () => {
  it("keeps the execution-cycle graph identical to the planning dossier", () => {
    expect(EXECUTION_CYCLE_TRANSITIONS).toEqual({
      requested: ["authorising", "cancelling"],
      authorising: ["queued", "cancelling"],
      queued: ["provisioning", "cancelling"],
      provisioning: ["running", "cancelling", "failed"],
      running: [
        "checkpoint_waiting",
        "human_input_required",
        "testing",
        "cancelling",
        "failed",
        "recovery_required",
      ],
      checkpoint_waiting: ["running", "cancelling"],
      human_input_required: ["running", "cancelling"],
      testing: ["reporting"],
      reporting: ["awaiting_review"],
      awaiting_review: ["completed", "failed"],
      completed: [],
      cancelling: ["cancelled", "recovery_required"],
      cancelled: [],
      failed: [],
      recovery_required: [],
    });
  });

  it("keeps runner environment lifecycle independent of cycle state", () => {
    expect(RUNNER_ENVIRONMENT_TRANSITIONS).toEqual({
      requested: ["creating"],
      creating: ["ready"],
      ready: ["active", "revoking"],
      active: ["revoking"],
      revoking: ["destroying"],
      destroying: ["destroyed", "cleanup_failed"],
      destroyed: [],
      cleanup_failed: ["destroying"],
    });
  });
});
