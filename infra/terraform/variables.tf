# ═══════════════════════════════════════════════════════════════════
# TrustChecker v9.5 — Terraform Variables
# ═══════════════════════════════════════════════════════════════════

# ─── Environment ──────────────────────────────────────────────

variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-southeast-1"  # Singapore — closest to Vietnam
}

# ─── Networking ───────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# ─── Application ─────────────────────────────────────────────

variable "app_port" {
  description = "Application container port"
  type        = number
  default     = 3000
}

variable "app_version" {
  description = "Application version tag for Docker image"
  type        = string
  default     = "9.5.0"
}

variable "ecr_repository" {
  description = "ECR repository URI for Docker images"
  type        = string
  default     = "123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/trustchecker"
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS on ALB"
  type        = string
  default     = ""
}

# ─── ECS Fargate ──────────────────────────────────────────────

variable "ecs_cpu" {
  description = "Fargate task CPU units (1 vCPU = 1024)"
  type        = number
  default     = 512
}

variable "ecs_memory" {
  description = "Fargate task memory in MiB"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Number of ECS tasks to run"
  type        = number
  default     = 2
}

# ─── RDS PostgreSQL ───────────────────────────────────────────

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.4"
}

variable "db_instance_class" {
  description = "RDS instance class for primary"
  type        = string
  default     = "db.t3.medium"
}

variable "db_replica_instance_class" {
  description = "RDS instance class for read replicas"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Initial storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum auto-scaled storage in GB"
  type        = number
  default     = 100
}

variable "db_read_replicas" {
  description = "Number of read replicas (production only)"
  type        = number
  default     = 1
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "tc_admin"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password"
  type        = string
  sensitive   = true
}

# ─── ElastiCache Redis ────────────────────────────────────────

variable "redis_node_type" {
  description = "Redis node type"
  type        = string
  default     = "cache.t3.small"
}

# ─── Observability ────────────────────────────────────────────

variable "otel_endpoint" {
  description = "OpenTelemetry collector endpoint"
  type        = string
  default     = ""
}

# ─── Feature Flags ────────────────────────────────────────────

variable "enable_waf" {
  description = "Enable AWS WAF on ALB"
  type        = bool
  default     = true
}

variable "enable_read_replicas" {
  description = "Enable RDS read replicas"
  type        = bool
  default     = false
}
