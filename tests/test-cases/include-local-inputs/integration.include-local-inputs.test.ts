import {WriteStreamsMock} from "../../../src/write-streams";
import {handler} from "../../../src/handler";
import chalk from "chalk";
import {initSpawnSpy} from "../../mocks/utils.mock";
import {WhenStatics} from "../../mocks/when-statics";

beforeAll(() => {
    initSpawnSpy(WhenStatics.all);
});

test("include-local-inputs <hello-world>", async () => {
    const writeStreams = new WriteStreamsMock();
    await handler({
        cwd: "tests/test-cases/include-local-inputs",
        file: ".gitlab-ci.yml",
        job: ["hello-world"],
    }, writeStreams);

    const expected = [
        chalk`{blueBright hello-world          } {greenBright >} Hello, World`,
        chalk`{blueBright hello-world          } {greenBright >} How are you World?`,
    ];

    expect(writeStreams.stdoutLines).toEqual(expect.arrayContaining(expected));
});

test("include-local-inputs <hello-gcl>", async () => {
    const writeStreams = new WriteStreamsMock();
    await handler({
        cwd: "tests/test-cases/include-local-inputs",
        file: ".gitlab-ci.yml",
        job: ["hello-gcl"],
    }, writeStreams);

    const expected = [
        chalk`{blueBright hello-gcl            } {greenBright >} Hello, GCL`,
        chalk`{blueBright hello-gcl            } {greenBright >} How are you GCL?`,
    ];

    expect(writeStreams.stdoutLines).toEqual(expect.arrayContaining(expected));
});

test("include-local-inputs <job-with-default-name>", async () => {
    const writeStreams = new WriteStreamsMock();
    await handler({
        cwd: "tests/test-cases/include-local-inputs",
        file: ".gitlab-ci.yml",
        job: ["job-with-default-name"],
    }, writeStreams);

    const expected = [
        chalk`{blueBright job-with-default-name} {greenBright >} Hello, World`,
    ];

    expect(writeStreams.stdoutLines).toEqual(expect.arrayContaining(expected));
});
