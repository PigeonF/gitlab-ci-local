import {MockWriteStreams} from "../../../src/mock-write-streams";
import {handler} from "../../../src/handler";
import fs from "fs-extra";
import {initSpawnSpy} from "../../mocks/utils.mock";
import {WhenStatics} from "../../mocks/when-statics";
import {Utils} from "../../../src/utils";

jest.setTimeout(30000);

beforeAll(() => {
    const spyGitRemote = {
        cmd: "git remote -v",
        returnValue: {stdout: "origin\tgit@gitlab.com:gcl/cache-docker-mount.git (fetch)\norigin\tgit@gitlab.com:gcl/cache-docker-mount.git (push)\n"},
    };
    initSpawnSpy([...WhenStatics.all, spyGitRemote]);
});

test("cache-docker-mount <consume-cache> --needs", async () => {
    await Utils.spawn("docker volume rm -f glc-cache-docker-mount-maven");
    const writeStreams = new MockWriteStreams();
    await handler({
        cwd: "tests/test-cases/cache-docker-mount",
        job: ["consume-cache"],
        needs: true,
        mountCache: true,
    }, writeStreams);

    expect(await fs.pathExists("tests/test-cases/cache-docker-mount/.gitlab-ci-local/cache/maven/")).toEqual(false);
    expect((await Utils.spawn("docker volume ls | grep -w gcl-gcl-cache-docker-mount-maven")).status).toBe(0);

    expect(writeStreams.stderrLines).toEqual([]);
});