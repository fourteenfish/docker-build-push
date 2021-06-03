const cp = require('child_process');
const core = require('@actions/core');
const fs = require('fs');
const { context } = require('@actions/github');
const maxBufferSize = require('../src/settings');

const isGitHubTag = ref => ref && ref.includes('refs/tags/');

const isReleaseTag = ref => ref && ref.includes('refs/tags/release/');

const isBranch = ref => ref && ref.includes('refs/heads/');

const createBuildCommand = (dockerfile, imageName, target, buildArgs) => {
  let buildCommandPrefix = `docker build -f ${dockerfile} -t ${imageName}`;
  if (buildArgs) {
    const argsSuffix = buildArgs.map(arg => `--build-arg ${arg}`).join(' ');
    buildCommandPrefix = `${buildCommandPrefix} ${argsSuffix}`;
  }
  if (target) {
    buildCommandPrefix = `${buildCommandPrefix} --target=${target}`;
  }

  return `${buildCommandPrefix} .`;
};

const createTag = useBranchTimestamp => {
  core.info('Creating Docker image tag...');
  const { sha } = context;
  const ref = context.ref.toLowerCase();
  const shortSha = sha.substring(0, 7);
  let dockerTag;

  if (isGitHubTag(ref)) {
    // If this is a 'release' tag
    if (isReleaseTag(ref)) {
      dockerTag = ref.replace(/refs\/tags\/release\/.*[^-]-/gi, '');
    } else {
      // If GitHub tag exists, use it as the Docker tag
      dockerTag = ref.replace('refs/tags/', '');
    }
  } else if (isBranch(ref)) {
    // If we're not building a tag, use branch-prefix-{GIT_SHORT_SHA) as the Docker tag
    // refs/heads/jira-123/feature/something
    const branchName = ref.replace('refs/heads/', '');
    const safeBranchName = branchName
      .replace(/[^\w.-]+/g, '-')
      .replace(/^[^\w]+/, '')
      .substring(0, 120);
    dockerTag = `${safeBranchName}-${shortSha}`;
    if (useBranchTimestamp) {
      dockerTag = `${dockerTag}-${Date.now()}`;
    }
  } else {
    core.setFailed(
      'Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push-event-push',
    );
  }

  core.info(`Docker tag created: ${dockerTag}`);
  return dockerTag;
};

const build = (imageName, target, buildArgs) => {
  const dockerfile = core.getInput('dockerfile');

  if (!fs.existsSync(dockerfile)) {
    core.setFailed(`Dockerfile does not exist in location ${dockerfile}`);
  }

  core.info(`Building Docker image: ${imageName}`);
  cp.execSync(createBuildCommand(dockerfile, imageName, target, buildArgs), {
    maxBuffer: maxBufferSize,
    stdio: 'inherit',
  });
};

const isEcr = registry => registry && registry.includes('amazonaws');

const getRegion = registry =>
  registry.substring(
    registry.indexOf('ecr.') + 4,
    registry.indexOf('.amazonaws'),
  );

const login = () => {
  const registry = core.getInput('registry', { required: true });
  const username = core.getInput('username');
  const password = core.getInput('password');

  // If using ECR, use the AWS CLI login command in favor of docker login
  if (isEcr(registry)) {
    const region = getRegion(registry);
    core.info(`Logging into ECR region ${region}...`);
    cp.execSync(
      `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${registry}`,
    );
  } else if (username && password) {
    core.info(`Logging into Docker registry ${registry}...`);
    cp.execSync(`docker login -u ${username} --password-stdin ${registry}`, {
      input: password,
    });
  }
};

const push = imageName => {
  core.info(`Pushing Docker image ${imageName}`);
  cp.execSync(`docker push ${imageName}`);
};

module.exports = {
  createTag,
  build,
  login,
  push,
};
