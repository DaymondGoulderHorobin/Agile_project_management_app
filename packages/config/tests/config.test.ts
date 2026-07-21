import { describe, expect, it } from "vitest";

import {
  AUTHENTICATION_INVARIANTS,
  PRODUCT_CAPABILITIES,
  loadRuntimeConfig,
  redactConfiguration,
  runtimeEnvironmentSchema,
  toPublicRuntimeConfig,
} from "../src/index.js";

const baseEnvironment = {
  NODE_ENV: "test",
  WEB_URL: "http://localhost:3000",
  API_URL: "http://localhost:4000",
  API_PORT: "4000",
  WORKER_CONCURRENCY: "4",
  DATABASE_URL: "postgresql://tracework_admin:secret@localhost:5432/tracework",
  DATABASE_APPLICATION_URL:
    "postgresql://tracework_app:secret@localhost:5432/tracework",
  DATABASE_POOL_MAX: "10",
  REDIS_URL: "redis://localhost:6379",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "us-east-1",
  S3_BUCKET: "tracework-demo",
  S3_ACCESS_KEY_ID: "tracework",
  S3_SECRET_ACCESS_KEY: "local-secret",
  S3_FORCE_PATH_STYLE: "true",
  BETTER_AUTH_URL: "http://localhost:4000/api/auth",
  BETTER_AUTH_SECRET: "local-only-secret-with-more-than-32-characters",
  BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000,http://127.0.0.1:3000",
  BETTER_AUTH_MAGIC_LINK_TTL_SECONDS: "300",
  HIGH_ASSURANCE_REAUTH_TTL_SECONDS: "900",
  SMTP_URL: "smtp://localhost:1025",
  SMTP_FROM: "Tracework <noreply@localhost.test>",
  AI_PROVIDER: "fixture",
  OPENAI_API_KEY: "",
  OPENAI_MODEL_BALANCED: "gpt-5.6-terra",
  OPENAI_MODEL_QUALITY: "gpt-5.6-sol",
  OPENAI_STORE_RESPONSES: "false",
  REPOSITORY_PROVIDER: "fixture",
  GITHUB_APP_ID: "",
  GITHUB_APP_PRIVATE_KEY: "",
  GITHUB_WEBHOOK_SECRET: "",
  RUNNER_PROVIDER: "fixture",
  RUNNER_CAPABILITY_TTL_SECONDS: "120",
  RUNNER_GRACEFUL_SHUTDOWN_SECONDS: "30",
  RUNNER_GRACEFUL_SHUTDOWN_MIN_SECONDS: "5",
  RUNNER_GRACEFUL_SHUTDOWN_MAX_SECONDS: "120",
  RUNNER_NETWORK_DEFAULT: "deny",
  RUNNER_WORKSPACE_ROOT: ".local/runner-workspaces",
  DEMO_ORGANISATION_SLUG: "harbour-product-studio-demo",
  DEMO_FIXTURE_REPOSITORY: ".local/demo-repository",
} as const;

describe("runtime configuration", () => {
  it("coerces environment primitives and preserves safe runtime invariants", () => {
    const config = loadRuntimeConfig(baseEnvironment);
    expect(config).toMatchObject({
      API_PORT: 4000,
      WORKER_CONCURRENCY: 4,
      S3_FORCE_PATH_STYLE: true,
      OPENAI_STORE_RESPONSES: false,
      RUNNER_GRACEFUL_SHUTDOWN_SECONDS: 30,
    });
    expect(config.BETTER_AUTH_TRUSTED_ORIGINS).toHaveLength(2);
    expect(AUTHENTICATION_INVARIANTS).toMatchObject({
      betterAuthVersion: "1.6.23",
      cookieSessionCacheEnabled: false,
      magicLinkTokenStorage: "hashed",
      reauthenticationGrantMaxSeconds: 900,
    });
    expect(PRODUCT_CAPABILITIES).toMatchObject({
      dataClassification: "general_business",
      legalElectronicSignature: false,
      regulatedHealthInformation: false,
    });
  });

  it.each(["4", "121", "30.5"])(
    "rejects unsafe cancellation grace %s",
    (value) => {
      expect(
        runtimeEnvironmentSchema.safeParse({
          ...baseEnvironment,
          RUNNER_GRACEFUL_SHUTDOWN_SECONDS: value,
        }).success,
      ).toBe(false);
    },
  );

  it("requires provider credentials when a live provider is selected", () => {
    const ai = runtimeEnvironmentSchema.safeParse({
      ...baseEnvironment,
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "",
    });
    const repository = runtimeEnvironmentSchema.safeParse({
      ...baseEnvironment,
      REPOSITORY_PROVIDER: "github",
    });
    expect(ai.success).toBe(false);
    expect(repository.success).toBe(false);
  });

  it("fails closed on insecure production providers, URLs, and placeholders", () => {
    const result = runtimeEnvironmentSchema.safeParse({
      ...baseEnvironment,
      NODE_ENV: "production",
      BETTER_AUTH_SECRET: "replace-with-at-least-32-random-bytes",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map(({ message }) => message);
      expect(messages).toContain("Production URL must use HTTPS");
      expect(messages).toContain(
        "Fixture runner is not an isolated production runner",
      );
    }
  });

  it("exposes only an intentional public projection", () => {
    const publicConfig = toPublicRuntimeConfig(
      loadRuntimeConfig(baseEnvironment),
    );
    expect(publicConfig).toEqual({
      webUrl: "http://localhost:3000",
      apiUrl: "http://localhost:4000",
      dataClassification: "general_business",
      aiAvailable: true,
      repositoryIntegrationAvailable: true,
    });
    expect(JSON.stringify(publicConfig)).not.toContain("secret");
  });

  it("redacts secret-bearing keys recursively", () => {
    expect(
      redactConfiguration({
        DATABASE_APPLICATION_URL: "postgresql://sensitive",
        nested: {
          GITHUB_APP_PRIVATE_KEY: "private",
          visible: "safe",
        },
      }),
    ).toEqual({
      DATABASE_APPLICATION_URL: "[REDACTED]",
      nested: {
        GITHUB_APP_PRIVATE_KEY: "[REDACTED]",
        visible: "safe",
      },
    });
  });
});
