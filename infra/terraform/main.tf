terraform {
  required_version = ">= 1.7"
  required_providers {
    aws        = { source = "hashicorp/aws", version = "~> 5.50" }
    cloudflare = { source = "cloudflare/cloudflare", version = "~> 4.40" }
  }
}

variable "env" {
  description = "deployment environment (staging|production)"
  type        = string
}

variable "domain" {
  type    = string
  default = "pcn.vn"
}

# --- networking ---
# VPC, subnets, NAT, etc. omitted for brevity; use the official aws-vpc module.

# --- managed Postgres ---
resource "aws_rds_cluster" "pcn" {
  cluster_identifier              = "pcn-${var.env}"
  engine                          = "aurora-postgresql"
  engine_version                  = "16.3"
  database_name                   = "pcn"
  master_username                 = "pcn"
  manage_master_user_password     = true
  backup_retention_period         = 7
  preferred_backup_window         = "16:00-17:00" # UTC = midnight VN
  storage_encrypted               = true
  deletion_protection             = var.env == "production"
}

# --- managed Redis ---
resource "aws_elasticache_replication_group" "pcn" {
  replication_group_id          = "pcn-${var.env}"
  description                   = "PCN Redis"
  engine                        = "redis"
  engine_version                = "7.1"
  node_type                     = "cache.t4g.small"
  num_node_groups               = 1
  replicas_per_node_group       = 1
  automatic_failover_enabled    = true
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true
}

# --- object storage (Cloudflare R2 alternative: aws_s3_bucket) ---
resource "aws_s3_bucket" "media" {
  bucket = "pcn-${var.env}-media"
  force_destroy = false
}

# --- DNS ---
resource "cloudflare_record" "api" {
  zone_id = var.domain
  name    = "api"
  type    = "A"
  ttl     = 1
  proxied = true
  value   = "PLACEHOLDER"
}
