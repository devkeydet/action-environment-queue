# Environment Queue Action

If another workflow is already running and deploying to the same GitHub Environment,
wait for other workflows queued up to finish before continuing.

## Inputs

- `environment` - The GitHub Environment name to base the queue on
- `github-token` -The GitHub token to use, defaults to `${{ github.token }}`
- `timeout` - Timeout before we stop trying (in milliseconds), defaults to `600000`
- `delay` - Delay between status checks (in milliseconds), defaults to `10000`

## Example

```yml
- uses: devkeydet/action-environment-queue@v1
  with:
    environment: foo
```

## Acknowledgements

- Inspired by the [Workflow Queue](https://github.com/marketplace/actions/workflow-queue) action.
