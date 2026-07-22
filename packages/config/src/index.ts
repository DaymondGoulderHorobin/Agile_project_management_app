import { z } from "zod";

const booleanFromEnvironment = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return value;
}, z.boolean());

const integerFromEnvironment = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && /^-?\d+$/.test(value)
        ? Number(value)
        : value,
    z.number().int().min(minimum).max(maximum),
  );

const optionalNonEmptyString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const commaSeparatedUrls = z.preprocess(
  (value) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : value,
  z.array(z.url()).min(1),
);

const smtpFrom = z
  .string()
  .trim()
  .min(3)
  .refine(
    (value) =>
      /<[^<>\s]+@[^<>\s]+>$/.test(value) || /^[^\s@]+@[^\s@]+$/.test(value),
    "SMTP_FROM must be an email or 'Name <email>'",
  );

export const runtimeEnvironmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    WEB_URL: z.url().default("http://localhost:3000"),
    API_URL: z.url().default("http://localhost:4000"),
    API_PORT: integerFromEnvironment(1, 65_535).default(4000),
    WORKER_CONCURRENCY: integerFromEnvironment(1, 128).default(4),

    DATABASE_URL: z.string().startsWith("postgresql://"),
    DATABASE_APPLICATION_URL: z.string().startsWith("postgresql://"),
    DATABASE_POOL_MAX: integerFromEnvironment(1, 100).default(10),
    REDIS_URL: z.string().startsWith("redis://"),

    S3_ENDPOINT: z.url(),
    S3_REGION: z.string().trim().min(1),
    S3_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/),
    S3_ACCESS_KEY_ID: z.string().min(3),
    S3_SECRET_ACCESS_KEY: z.string().min(8),
    S3_FORCE_PATH_STYLE: booleanFromEnvironment.default(true),

    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_TRUSTED_ORIGINS: commaSeparatedUrls,
    BETTER_AUTH_MAGIC_LINK_TTL_SECONDS: integerFromEnvironment(
      60,
      3_600,
    ).default(300),
    HIGH_ASSURANCE_REAUTH_TTL_SECONDS: integerFromEnvironment(60, 900).default(
      900,
    ),

    SMTP_URL: z.string().regex(/^smtps?:\/\//),
    SMTP_FROM: smtpFrom,

    AI_PROVIDER: z.enum(["fixture", "openai"]).default("fixture"),
    OPENAI_API_KEY: optionalNonEmptyString,
    OPENAI_MODEL_BALANCED: z.string().min(1).default("gpt-5.6-terra"),
    OPENAI_MODEL_QUALITY: z.string().min(1).default("gpt-5.6-sol"),
    OPENAI_STORE_RESPONSES: booleanFromEnvironment.default(false),

    REPOSITORY_PROVIDER: z.enum(["fixture", "github"]).default("fixture"),
    GITHUB_APP_ID: optionalNonEmptyString,
    GITHUB_APP_PRIVATE_KEY: optionalNonEmptyString,
    GITHUB_WEBHOOK_SECRET: optionalNonEmptyString,

    RUNNER_PROVIDER: z.enum(["fixture", "docker"]).default("fixture"),
    RUNNER_CAPABILITY_TTL_SECONDS: integerFromEnvironment(30, 900).default(120),
    RUNNER_GRACEFUL_SHUTDOWN_SECONDS: integerFromEnvironment(5, 120).default(
      30,
    ),
    RUNNER_GRACEFUL_SHUTDOWN_MIN_SECONDS: integerFromEnvironment(5, 5).default(
      5,
    ),
    RUNNER_GRACEFUL_SHUTDOWN_MAX_SECONDS: integerFromEnvironment(
      120,
      120,
    ).default(120),
    RUNNER_NETWORK_DEFAULT: z.literal("deny").default("deny"),
    RUNNER_WORKSPACE_ROOT: z
      .string()
      .trim()
      .min(1)
      .default(".local/runner-workspaces"),

    DEMO_ORGANISATION_SLUG: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .default("harbour-product-studio-demo"),
    DEMO_FIXTURE_REPOSITORY: z
      .string()
      .trim()
      .min(1)
      .default(".local/demo-repository"),
  })
  .superRefine((config, context) => {
    const production = config.NODE_ENV === "production";
    if (config.DATABASE_URL === config.DATABASE_APPLICATION_URL) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_APPLICATION_URL"],
        message:
          "Application and migration database identities must be distinct",
      });
    }
    if (config.AI_PROVIDER === "openai" && !config.OPENAI_API_KEY) {
      context.addIssue({
        code: "custom",
        path: ["OPENAI_API_KEY"],
        message: "OPENAI_API_KEY is required for the OpenAI provider",
      });
    }
    if (
      config.REPOSITORY_PROVIDER === "github" &&
      (!config.GITHUB_APP_ID ||
        !config.GITHUB_APP_PRIVATE_KEY ||
        !config.GITHUB_WEBHOOK_SECRET)
    ) {
      context.addIssue({
        code: "custom",
        path: ["REPOSITORY_PROVIDER"],
        message: "GitHub App ID, private key, and webhook secret are required",
      });
    }
    if (production) {
      for (const [key, value] of [
        ["WEB_URL", config.WEB_URL],
        ["API_URL", config.API_URL],
        ["BETTER_AUTH_URL", config.BETTER_AUTH_URL],
        ...config.BETTER_AUTH_TRUSTED_ORIGINS.map((origin) => [
          "BETTER_AUTH_TRUSTED_ORIGINS",
          origin,
        ]),
      ] as const) {
        if (!value.startsWith("https://")) {
          context.addIssue({
            code: "custom",
            path: [key],
            message: "Production URL must use HTTPS",
          });
        }
      }
      if (
        /replace|change-me|tracework|test|example/i.test(
          config.BETTER_AUTH_SECRET,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["BETTER_AUTH_SECRET"],
          message: "Production cannot use a placeholder authentication secret",
        });
      }
      if (config.AI_PROVIDER !== "openai") {
        context.addIssue({
          code: "custom",
          path: ["AI_PROVIDER"],
          message: "Fixture AI is not a production provider",
        });
      }
      if (config.REPOSITORY_PROVIDER !== "github") {
        context.addIssue({
          code: "custom",
          path: ["REPOSITORY_PROVIDER"],
          message: "Fixture repositories are not a production provider",
        });
      }
      if (config.RUNNER_PROVIDER !== "docker") {
        context.addIssue({
          code: "custom",
          path: ["RUNNER_PROVIDER"],
          message: "Fixture runner is not an isolated production runner",
        });
      }
    }
  });

export type RuntimeConfig = z.output<typeof runtimeEnvironmentSchema>;
export type RuntimeEnvironment = z.input<typeof runtimeEnvironmentSchema>;

export const AUTHENTICATION_INVARIANTS = Object.freeze({
  betterAuthVersion: "1.6.23",
  cookieSessionCacheEnabled: false,
  magicLinkTokenStorage: "hashed",
  reauthenticationMethod: "passkey_uv",
  reauthenticationGrantMaxSeconds: 900,
});

export const PRODUCT_CAPABILITIES = Object.freeze({
  dataClassification: "general_business",
  legalElectronicSignature: false,
  regulatedHealthInformation: false,
  githubCom: true,
  openAiResponses: true,
  codexSdk: true,
});

export function loadRuntimeConfig(
  environment: RuntimeEnvironment,
): RuntimeConfig {
  return Object.freeze(runtimeEnvironmentSchema.parse(environment));
}

export interface PublicRuntimeConfig {
  readonly webUrl: string;
  readonly apiUrl: string;
  readonly dataClassification: "general_business";
  readonly aiAvailable: boolean;
  readonly repositoryIntegrationAvailable: boolean;
}

export function toPublicRuntimeConfig(
  config: RuntimeConfig,
): PublicRuntimeConfig {
  return Object.freeze({
    webUrl: config.WEB_URL,
    apiUrl: config.API_URL,
    dataClassification: "general_business",
    aiAvailable:
      config.AI_PROVIDER !== "fixture" || config.NODE_ENV !== "production",
    repositoryIntegrationAvailable:
      config.REPOSITORY_PROVIDER !== "fixture" ||
      config.NODE_ENV !== "production",
  });
}

const REDACTED_KEYS =
  /(?:secret|password|private[_-]?key|api[_-]?key|access[_-]?key|token|database.*url|redis.*url|smtp.*url)/i;

export function redactConfiguration(
  value: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        if (REDACTED_KEYS.test(key)) return [key, "[REDACTED]"];
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
          return [
            key,
            redactConfiguration(entry as Readonly<Record<string, unknown>>),
          ] as const;
        }
        return [key, entry] as const;
      }),
    ),
  );
}
