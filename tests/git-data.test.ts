import {GitData} from "../src/git-data";
import {initSpawnMock, initSpawnSpy} from "./mocks/utils.mock";
import {MockWriteStreams} from "../src/mock-write-streams";
import chalk from "chalk";

const mockGitVersion = {cmd: "git --version", returnValue: {stdout: "git version 2.25.1\n"}};
const mockGitConfigEmail = {cmd: "git config user.email", returnValue: {stdout: "test@test.com\n"}};
const mockGitConfigName = {cmd: "git config user.name", returnValue: {stdout: "Testersen\n"}};
const mockUID = {cmd: "id -u", returnValue: {stdout: "990\n"}};
const mockGitRemote = {
    cmd: "git remote -v",
    returnValue: {stdout: "origin\tgit@gitlab.com:gcl/test-project.git (fetch)\norigin\tgit@gitlab.com:gcl/test-project.git (push)\n"},
};
const mockGitCommit = {
    cmd: "git log -1 --pretty=format:'%h %H %D'",
    returnValue: {stdout: "0261898 02618988a1864b3d06cfee3bd79f8baa2dd21407 HEAD -> master, origin/master"},
};

test("git --version (not present)", async() => {
    initSpawnMock([]);
    const writeStreams = new MockWriteStreams();
    const gitData = await GitData.init("./", writeStreams);
    expect(gitData).toEqual({
        commit: {
            "REF_NAME": "main",
            "SHA": "0000000000000000000000000000000000000000",
            "SHORT_SHA": "00000000",
        },
        remote: {
            "domain": "fallback.domain",
            "group": "fallback.group",
            "project": "fallback.project",
        },
        user: {
            "GITLAB_USER_EMAIL": "local@gitlab.com",
            "GITLAB_USER_ID": "1000",
            "GITLAB_USER_LOGIN": "local",
            "GITLAB_USER_NAME": "Bob Local",
        },
    });
    expect(writeStreams.stderrLines).toEqual([
        chalk`{yellow Git not available using fallback}`,
    ]);
});

test("git remote -v (present)", async () => {
    const spawnMocks = [mockGitVersion, mockGitRemote];
    initSpawnMock(spawnMocks);
    const writeStreams = new MockWriteStreams();
    const gitData = await GitData.init("./", writeStreams);
    expect(gitData.remote).toEqual({
        domain: "gitlab.com",
        group: "gcl",
        project: "test-project",
    });
    expect(writeStreams.stderrLines).toEqual([
        chalk`{yellow Using fallback git user data}`,
        chalk`{yellow Using fallback git commit data}`,
    ]);
});

test("git config <user.name|user.email> and id -u (present)", async () => {
    const spawnMocks = [mockGitVersion, mockGitConfigEmail, mockGitConfigName, mockUID];
    initSpawnMock(spawnMocks);
    const writeStreams = new MockWriteStreams();
    const gitData = await GitData.init("./", writeStreams);
    expect(gitData.user).toEqual({
        "GITLAB_USER_EMAIL": "test@test.com",
        "GITLAB_USER_ID": "990",
        "GITLAB_USER_LOGIN": "test",
        "GITLAB_USER_NAME": "Testersen",
    });
    expect(writeStreams.stderrLines).toEqual([
        chalk`{yellow Using fallback git remote data}`,
        chalk`{yellow Using fallback git commit data}`,
    ]);
});

test("git remote -v (not present)", async () => {
    const spawnMocks = [mockGitVersion, mockGitCommit, mockGitConfigEmail, mockUID, mockGitConfigName];
    initSpawnMock(spawnMocks);
    const writeStreams = new MockWriteStreams();
    await GitData.init("./", writeStreams);
    expect(writeStreams.stderrLines).toEqual([
        chalk`{yellow Using fallback git remote data}`,
    ]);
});

test("git remote -v (invalid)", async () => {
    const spawnMocks = [
        {cmd: "git remote -v", returnValue: {stdout: "Very invalid git remote -v\n"}},
    ];
    initSpawnSpy(spawnMocks);
    const writeStreams = new MockWriteStreams();
    await GitData.init("./", writeStreams);
    expect(writeStreams.stderrLines).toEqual([
        chalk`{yellow git remote -v didn't provide valid matches}`,
    ]);
});

test("git log (not present)", async () => {
    const spawnMocks = [mockGitVersion, mockGitRemote, mockGitConfigEmail, mockUID, mockGitConfigName];
    initSpawnMock(spawnMocks);
    const writeStreams = new MockWriteStreams();
    await GitData.init("./", writeStreams);
    expect(writeStreams.stderrLines).toEqual([
        chalk`{yellow Using fallback git commit data}`,
    ]);
});

test("git log's (valid)", async() => {
    const variousStdouts = [
        "4ff3b65 4ff3b656e6cfa615289da905c42446df4bbd0355 grafted, HEAD -> master, origin/master",
        "4ff3b66 4ff3b666e6cfa615289da905c42446df4bbd0355 grafted, HEAD, origin/somebranch",
        "4ff3b67 4ff3b676e6cfa615289da905c42446df4bbd0355 HEAD, pull/3/merge",
        "4ff3b68 4ff3b686e6cfa615289da905c42446df4bbd0355 HEAD, tag: 1.3.0",
        "4ff3b69 4ff3b696e6cfa615289da905c42446df4bbd0355 HEAD -> main, origin/main",
    ];
    const expected = [
        {"SHA": "4ff3b656e6cfa615289da905c42446df4bbd0355", "SHORT_SHA": "4ff3b65", "REF_NAME": "master"},
        {"SHA": "4ff3b666e6cfa615289da905c42446df4bbd0355", "SHORT_SHA": "4ff3b66", "REF_NAME": "origin/somebranch"},
        {"SHA": "4ff3b676e6cfa615289da905c42446df4bbd0355", "SHORT_SHA": "4ff3b67", "REF_NAME": "pull/3/merge"},
        {"SHA": "4ff3b686e6cfa615289da905c42446df4bbd0355", "SHORT_SHA": "4ff3b68", "REF_NAME": "1.3.0"},
        {"SHA": "4ff3b696e6cfa615289da905c42446df4bbd0355", "SHORT_SHA": "4ff3b69", "REF_NAME": "main"},
    ];

    let index = 0;
    for (const stdout of variousStdouts) {
        const spawnMocks = [mockGitVersion, {cmd: "git log -1 --pretty=format:'%h %H %D'", returnValue: {stdout}}];
        initSpawnMock(spawnMocks);
        const writeStreams = new MockWriteStreams();
        const gitData = await GitData.init("./", writeStreams);
        expect(gitData.commit).toEqual(expected[index]);
        index++;
    }
});

test("git log's (invalid)", async() => {
    const variousStdouts = [
        "4ff3b65 4ff3b656e6cfa615289da905c42446df4bbd0355 asd -> master, origin/master",
        "4ff3b65 4ff3b656e6cfa615289da905c42446df4bbd0355 tag: asdf, origin/master",
        "non valid log",
        "",
    ];
    const expected = [
        chalk`{yellow git log -1 didn't provide valid matches}`,
        chalk`{yellow git log -1 didn't provide valid matches}`,
        chalk`{yellow git log -1 didn't provide valid matches}`,
        chalk`{yellow git log -1 didn't provide valid matches}`,
    ];

    let index = 0;
    for (const stdout of variousStdouts) {
        const spawnMocks = [
            mockGitVersion, mockGitRemote, mockUID, mockGitConfigName, mockGitConfigEmail,
            {cmd: "git log -1 --pretty=format:'%h %H %D'", returnValue: {stdout}},
        ];
        initSpawnMock(spawnMocks);
        const writeStreams = new MockWriteStreams();
        await GitData.init("./", writeStreams);
        expect(writeStreams.stderrLines).toEqual([expected[index]]);
        index++;
    }
});
