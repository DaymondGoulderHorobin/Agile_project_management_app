import { createHmac, timingSafeEqual } from "node:crypto";
import { Octokit } from "@octokit/rest";

export type RepositoryRef = Readonly<{ owner: string; repo: string }>;
export type RepositoryAuthority = Readonly<{
  repositoryId: number;
  defaultBranch: string;
  canPush: boolean;
  canCreatePullRequest: boolean;
}>;
export type PullRequestResult = Readonly<{ number: number; url: string; created: boolean }>;

export interface GitHubProvider {
  authority(repository: RepositoryRef): Promise<RepositoryAuthority>;
  createOrFindBranch(repository: RepositoryRef, branch: string, commitSha: string): Promise<void>;
  createOrFindPullRequest(repository: RepositoryRef, head: string, base: string, title: string, body: string): Promise<PullRequestResult>;
}

export class OctokitGitHubProvider implements GitHubProvider {
  readonly #octokit: Octokit;

  public constructor(token: string) {
    this.#octokit = new Octokit({ auth: token });
  }

  public async authority(repository: RepositoryRef): Promise<RepositoryAuthority> {
    const response = await this.#octokit.rest.repos.get(repository);
    const permissions = response.data.permissions;
    return {
      repositoryId: response.data.id,
      defaultBranch: response.data.default_branch,
      canPush: permissions?.push === true,
      canCreatePullRequest: permissions?.push === true,
    };
  }

  public async createOrFindBranch(repository: RepositoryRef, branch: string, commitSha: string): Promise<void> {
    try {
      const existing = await this.#octokit.rest.git.getRef({ ...repository, ref: `heads/${branch}` });
      if (existing.data.object.sha !== commitSha) throw new Error("Existing branch does not match approved commit");
    } catch (error) {
      if (typeof error === "object" && error !== null && "status" in error && (error as { status?: number }).status === 404) {
        await this.#octokit.rest.git.createRef({ ...repository, ref: `refs/heads/${branch}`, sha: commitSha });
        return;
      }
      throw error;
    }
  }

  public async createOrFindPullRequest(
    repository: RepositoryRef,
    head: string,
    base: string,
    title: string,
    body: string,
  ): Promise<PullRequestResult> {
    const existing = await this.#octokit.rest.pulls.list({ ...repository, head: `${repository.owner}:${head}`, base, state: "open" });
    const first = existing.data[0];
    if (first) return { number: first.number, url: first.html_url, created: false };
    const created = await this.#octokit.rest.pulls.create({ ...repository, head, base, title, body });
    return { number: created.data.number, url: created.data.html_url, created: true };
  }
}

export function verifyGitHubWebhook(secret: string, body: Uint8Array, signatureHeader: string | undefined): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const supplied = Buffer.from(signatureHeader.slice(7), "hex");
  const expected = createHmac("sha256", secret).update(body).digest();
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export class MemoryGitHubProvider implements GitHubProvider {
  readonly branches = new Map<string, string>();
  readonly pullRequests = new Map<string, PullRequestResult>();

  public constructor(private readonly repositoryId = 1) {}

  public async authority(): Promise<RepositoryAuthority> {
    return { repositoryId: this.repositoryId, defaultBranch: "main", canPush: true, canCreatePullRequest: true };
  }

  public async createOrFindBranch(repository: RepositoryRef, branch: string, commitSha: string): Promise<void> {
    const key = `${repository.owner}/${repository.repo}:${branch}`;
    const existing = this.branches.get(key);
    if (existing && existing !== commitSha) throw new Error("Existing branch does not match approved commit");
    this.branches.set(key, commitSha);
  }

  public async createOrFindPullRequest(repository: RepositoryRef, head: string, base: string): Promise<PullRequestResult> {
    const key = `${repository.owner}/${repository.repo}:${head}:${base}`;
    const existing = this.pullRequests.get(key);
    if (existing) return { ...existing, created: false };
    const result = { number: this.pullRequests.size + 1, url: `https://github.test/${repository.owner}/${repository.repo}/pull/${this.pullRequests.size + 1}`, created: true };
    this.pullRequests.set(key, result);
    return result;
  }
}
