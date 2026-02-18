# ═══════════════════════════════════════════════════════════════════
# TrustChecker v9.5 — Terraform Outputs
# ═══════════════════════════════════════════════════════════════════

output "alb_dns_name" {
  description = "ALB DNS name (CNAME to your domain)"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "ALB hosted zone ID (for Route53 alias)"
  value       = aws_lb.main.zone_id
}

output "rds_endpoint" {
  description = "RDS PostgreSQL primary endpoint"
  value       = aws_db_instance.primary.endpoint
}

output "rds_replica_endpoints" {
  description = "RDS read replica endpoints"
  value       = aws_db_instance.replica[*].endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.api.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for API"
  value       = aws_cloudwatch_log_group.api.name
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "connection_info" {
  description = "Summary of connection endpoints"
  value = {
    alb        = "https://${aws_lb.main.dns_name}"
    database   = aws_db_instance.primary.endpoint
    redis      = aws_elasticache_replication_group.main.primary_endpoint_address
    logs       = aws_cloudwatch_log_group.api.name
    ecs        = "${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  }
}
