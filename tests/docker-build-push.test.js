jest.mock('@actions/core');
jest.mock('child_process');

const core = require('@actions/core');
const cp = require('child_process');
const docker = require('../src/docker');
const run = require('../src/docker-build-push');
const maxBufferSize = require('../src/settings');

beforeAll(() => {
  docker.push = jest.fn();
});

const mockInputs = (image, registry, tag, buildArgs, target, dockerfile) => {
  core.getInput = jest
    .fn()
    .mockReturnValueOnce(image)
    .mockReturnValueOnce(registry)
    .mockReturnValueOnce(tag)
    .mockReturnValueOnce(buildArgs)
    .mockReturnValueOnce(target)
    .mockReturnValueOnce(dockerfile);
};

describe('Create & push Docker image', () => {
  test('Valid Docker inputs', () => {
    const image = 'gcp-project/image';
    const registry = 'gcr.io';
    const tag = 'master-1234567';
    const buildArgs = '';
    const dockerfile = 'Dockerfile';

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    mockInputs(image, registry, null, buildArgs, false, dockerfile);
    core.setOutput = jest
      .fn()
      .mockReturnValueOnce('imageFullName', `${registry}/${image}:${tag}`);
    cp.execSync = jest.fn();

    run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(core.setOutput).toHaveBeenCalledWith(
      'imageFullName',
      `${registry}/${image}:${tag}`,
    );
    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${dockerfile} -t ${registry}/${image}:${tag} .`,
      {
        maxBuffer: maxBufferSize,
        stdio: 'inherit',
      },
    );
  });
});

describe('Create & push Docker image with build args', () => {
  test('Valid Docker inputs with build args', () => {
    const image = 'gcp-project/image';
    const registry = 'gcr.io';
    const tag = 'latest';
    const buildArgs = 'VERSION=1.1.1,BUILD_DATE=2020-01-14';
    const dockerfile = 'Dockerfile.custom';

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    mockInputs(image, registry, null, buildArgs, false, dockerfile);
    core.setOutput = jest
      .fn()
      .mockReturnValueOnce('imageFullName', `${registry}/${image}:${tag}`);
    cp.execSync = jest.fn();

    run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.getInput).toHaveBeenCalledTimes(6);
    expect(core.setOutput).toHaveBeenCalledWith(
      'imageFullName',
      `${registry}/${image}:${tag}`,
    );
    expect(cp.execSync).toHaveBeenCalledWith(
      `docker build -f ${dockerfile} -t ${registry}/${image}:${tag} --build-arg VERSION=1.1.1 --build-arg BUILD_DATE=2020-01-14 .`,
      {
        maxBuffer: maxBufferSize,
        stdio: 'inherit',
      },
    );
  });
});

describe('Create Docker image causing an error', () => {
  test('Docker login error', () => {
    docker.createTag = jest.fn().mockReturnValueOnce('some-tag');
    docker.build = jest.fn();
    const error =
      'Error: Cannot perform an interactive login from a non TTY device';
    docker.login = jest.fn().mockImplementation(() => {
      throw new Error(error);
    });
    core.setFailed = jest.fn();

    run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenCalledWith(error);
  });
});
