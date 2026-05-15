# pcn helm chart

```bash
helm install pcn ./infra/helm/pcn \
  --set image.tag=$(git rev-parse --short HEAD) \
  --values infra/helm/pcn/values.prod.yaml
```

Templates are TBD in v0.1; see `infra/k8s/*.yaml` for the raw manifests that this chart will package.
