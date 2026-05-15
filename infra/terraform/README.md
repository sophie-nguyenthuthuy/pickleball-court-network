# Terraform — PCN managed infra

This is a *stub*. Before applying, decide:

1. **Where data lives.** Vietnamese data-localisation law (Decree 53/2022) means user PII and payment records must stay on VN-resident hosts. Default target: **VNG Cloud** or **Viettel IDC**, not AWS. The `main.tf` here shows AWS as a placeholder because the IaC pattern is identical; swap providers in `provider.tf`.
2. **State backend.** Use a remote state bucket per environment (`pcn-tfstate-{staging,production}`), with state-locking via DynamoDB or Cloudflare D1.
3. **Secrets.** Never inline; pull from Vault / SOPS-encrypted YAML.

```bash
terraform init -backend-config=backends/$ENV.hcl
terraform plan -var "env=$ENV"
terraform apply -var "env=$ENV"
```
