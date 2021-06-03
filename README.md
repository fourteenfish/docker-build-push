# Docker Build & Push Action

<p><a href="https://github.com/fourteenfish/docker-build-push"><img alt="GitHub Actions status" src="https://github.com/fourteenfish/docker-build-push/workflows/Tests/badge.svg"></a></p>

Builds a Docker image and pushes it to the private registry of your choosing.

## Basic usage

* Ensure you run the [checkout action](https://github.com/actions/checkout) before using this action
* Add the following to a workflow `.yml` file in the `/.github` directory of your repo
```yaml
steps:
  - uses: actions/checkout@v1.0

  - uses: fourteenfish/docker-build-push@v2
    with:
      image: repo/image
      tag: latest
      registry: registry-url.io
      dockerfile: Dockerfile.ci
      username: ${{ secrets.DOCKER_USERNAME }}
      password: ${{ secrets.DOCKER_PASSWORD }}
```

## Inputs

|        Name        |                                       Description                                       | Required |
|--------------------|-----------------------------------------------------------------------------------------|----------|
| image              | Docker image name                                                                       | Yes      |
| tag                | Docker image tag (see [Tagging the image with GitOps](#tagging-the-image-using-gitops)) | No       |
| registry           | Docker registry host                                                                    | Yes      |
| dockerfile         | Location of Dockerfile (defaults to `Dockerfile`)                                       | No       |
| buildArgs          | Docker build arguments in format `KEY=VALUE,KEY=VALUE`                                  | No       |
| username           | Docker registry username                                                                | No       |
| password           | Docker registry password or token                                                       | No       |
| useBranchTimestamp | A boolean to determine whether to add a timestamp to branch-based tags                  | No       |

## Examples

### Docker Hub

* Save your Docker Hub username (`DOCKER_USERNAME`) and password (`DOCKER_PASSWORD`) as secrets in your GitHub repo
* Modify sample below and include in your workflow `.github/workflows/*.yml` file

```yaml
uses: fourteenfish/docker-build-push@v2
with:
  image: docker-hub-repo/image-name
  registry: docker.io
  username: ${{ secrets.DOCKER_USERNAME }}
  password: ${{ secrets.DOCKER_PASSWORD }}
```

### Google Container Registry (GCR)

* Create a service account with the ability to push to GCR (see [configuring access control](https://cloud.google.com/container-registry/docs/access-control))
* Create and download JSON key for new service account
* Save content of `.json` file as a secret called `DOCKER_PASSWORD` in your GitHub repo
* Modify sample below and include in your workflow `.github/workflows/*.yml` file
* Ensure you set the username to `_json_key`

```yaml
uses: fourteenfish/docker-build-push@v2
with:
  image: gcp-project/image-name
  registry: gcr.io
  username: _json_key
  password: ${{ secrets.DOCKER_PASSWORD }}
```

### AWS Elastic Container Registry (ECR)

* Create an IAM user with the ability to push to ECR (see [example policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/ecr_managed_policies.html))
* Create and download access keys
* Save `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as secrets in your GitHub repo
* Modify sample below and include in your workflow `.github/workflows/*.yml` file

```yaml
uses: fourteenfish/docker-build-push@v2
with:
  image: image-name
  registry: [aws-account-number].dkr.ecr.[region].amazonaws.com
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Tagging the image using GitOps

By default, if you do not pass a `tag` input this action will use an algorithm based on the state of your git repo to determine the Docker image tag. This is designed to enable developers to more easily use [GitOps](https://www.weave.works/technologies/gitops/) in their CI/CD pipelines. Below is a table detailing how the GitHub trigger (branch or tag) determines the Docker tag.

|             Trigger             | Commit SHA |      Docker Tag      |                         Notes                          |
|---------------------------------|------------|----------------------|--------------------------------------------------------|
| /refs/tags/v1.0                 | N/A        | v1.0                 | Can be any tag                                         |
| /refs/tags/release/myapp-v1.0.0 | N/A        | v1.0.0               | Everything after first dash used for docker tag |
| /refs/heads/master              | 1234567    | master-1234567       |                                                        |
| /refs/heads/SOME-feature        | 1234567    | some-feature-1234567 |                                                        |

Tags prepended with 'release', such as `release/myapp-v1.0.0`, will return a Docker tag of just the part after the last dash, eg. v1.0.0. This can be useful when you have a 'mono-repository' containing multiple apps, but want to trigger github actions for specific apps. So, a github action for 'myapp' can be set up to trigger only on tags that filter for that app:

```yaml
on:
  push:
    tags:
      - 'release/myapp-v*.*.*'
```

This will tag the Docker image with only the semver part of the tag `v1.0.0`.

If `useBranchTimestamp` option is `true`, add a timestamp (ms) to branch-based image tags. Github tag-based tags are unaffected.
