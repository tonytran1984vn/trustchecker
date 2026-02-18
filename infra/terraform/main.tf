# ═══════════════════════════════════════════════════════════════════
# TrustChecker v9.5 — Terraform Infrastructure as Code
# ═══════════════════════════════════════════════════════════════════
# AWS ECS Fargate + RDS PostgreSQL + ElastiCache Redis + ALB + WAF
# Designed for multi-region deployment capability.
#
# Usage:
#   terraform init
#   terraform plan -var-file="environments/production.tfvars"
#   terraform apply -var-file="environments/production.tfvars"
# ═══════════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "trustchecker-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "trustchecker-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TrustChecker"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Version     = "9.5"
    }
  }
}

# ═══════════════════════════════════════════════════════════════════
# NETWORKING — VPC, Subnets, Security Groups
# ═══════════════════════════════════════════════════════════════════

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "trustchecker-${var.environment}-vpc" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = { Name = "tc-${var.environment}-public-${count.index}" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "tc-${var.environment}-private-${count.index}" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "tc-${var.environment}-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "tc-${var.environment}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

data "aws_availability_zones" "available" {
  state = "available"
}

# ═══════════════════════════════════════════════════════════════════
# SECURITY GROUPS
# ═══════════════════════════════════════════════════════════════════

resource "aws_security_group" "alb" {
  name_prefix = "tc-${var.environment}-alb-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP (redirect to HTTPS)"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "tc-${var.environment}-alb-sg" }
}

resource "aws_security_group" "ecs" {
  name_prefix = "tc-${var.environment}-ecs-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "ALB to ECS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "tc-${var.environment}-ecs-sg" }
}

resource "aws_security_group" "rds" {
  name_prefix = "tc-${var.environment}-rds-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
    description     = "ECS to PostgreSQL"
  }

  tags = { Name = "tc-${var.environment}-rds-sg" }
}

resource "aws_security_group" "redis" {
  name_prefix = "tc-${var.environment}-redis-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
    description     = "ECS to Redis"
  }

  tags = { Name = "tc-${var.environment}-redis-sg" }
}

# ═══════════════════════════════════════════════════════════════════
# RDS POSTGRESQL (Multi-AZ)
# ═══════════════════════════════════════════════════════════════════

resource "aws_db_subnet_group" "main" {
  name       = "tc-${var.environment}-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = { Name = "tc-${var.environment}-db-subnet-group" }
}

resource "aws_db_instance" "primary" {
  identifier     = "tc-${var.environment}-primary"
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_encrypted     = true  # Encryption at rest

  db_name  = "trustchecker"
  username = var.db_username
  password = var.db_password

  multi_az                = var.environment == "production" ? true : false
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]

  backup_retention_period = var.environment == "production" ? 30 : 7
  deletion_protection     = var.environment == "production" ? true : false
  skip_final_snapshot     = var.environment != "production"

  performance_insights_enabled = true
  monitoring_interval          = 60

  tags = { Name = "tc-${var.environment}-postgresql" }
}

# Read Replica (production only)
resource "aws_db_instance" "replica" {
  count = var.environment == "production" ? var.db_read_replicas : 0

  identifier          = "tc-${var.environment}-replica-${count.index}"
  replicate_source_db = aws_db_instance.primary.identifier
  instance_class      = var.db_replica_instance_class
  storage_encrypted   = true

  performance_insights_enabled = true

  tags = { Name = "tc-${var.environment}-replica-${count.index}" }
}

# ═══════════════════════════════════════════════════════════════════
# ELASTICACHE REDIS
# ═══════════════════════════════════════════════════════════════════

resource "aws_elasticache_subnet_group" "main" {
  name       = "tc-${var.environment}-redis-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "tc-${var.environment}-redis"
  description          = "TrustChecker Redis cluster"

  node_type            = var.redis_node_type
  num_cache_clusters   = var.environment == "production" ? 2 : 1
  port                 = 6379

  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  automatic_failover_enabled = var.environment == "production" ? true : false

  tags = { Name = "tc-${var.environment}-redis" }
}

# ═══════════════════════════════════════════════════════════════════
# ECS FARGATE — API Service
# ═══════════════════════════════════════════════════════════════════

resource "aws_ecs_cluster" "main" {
  name = "tc-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = { Name = "tc-${var.environment}-ecs-cluster" }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "tc-${var.environment}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_cpu
  memory                   = var.ecs_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "trustchecker-api"
    image = "${var.ecr_repository}:${var.app_version}"

    portMappings = [{
      containerPort = var.app_port
      hostPort      = var.app_port
      protocol      = "tcp"
    }]

    environment = [
      { name = "NODE_ENV",    value = var.environment },
      { name = "PORT",        value = tostring(var.app_port) },
      { name = "APP_VERSION", value = var.app_version },
      { name = "OTEL_EXPORTER_OTLP_ENDPOINT", value = var.otel_endpoint },
      { name = "OTEL_SERVICE_NAME",            value = "trustchecker-api" },
    ]

    secrets = [
      { name = "DATABASE_URL",  valueFrom = "${aws_secretsmanager_secret.db_url.arn}" },
      { name = "REDIS_URL",     valueFrom = "${aws_secretsmanager_secret.redis_url.arn}" },
      { name = "JWT_SECRET",    valueFrom = "${aws_secretsmanager_secret.jwt_secret.arn}" },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "api"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:${var.app_port}/api/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = { Name = "tc-${var.environment}-api-task" }
}

resource "aws_ecs_service" "api" {
  name            = "tc-${var.environment}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  deployment_controller {
    type = "ECS"  # Supports blue/green with CODE_DEPLOY
  }

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent         = 200

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "trustchecker-api"
    container_port   = var.app_port
  }

  tags = { Name = "tc-${var.environment}-api-service" }
}

# ═══════════════════════════════════════════════════════════════════
# ALB — Application Load Balancer
# ═══════════════════════════════════════════════════════════════════

resource "aws_lb" "main" {
  name               = "tc-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.environment == "production" ? true : false

  tags = { Name = "tc-${var.environment}-alb" }
}

resource "aws_lb_target_group" "api" {
  name        = "tc-${var.environment}-api-tg"
  port        = var.app_port
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    interval            = 30
    timeout             = 10
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = { Name = "tc-${var.environment}-api-tg" }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ═══════════════════════════════════════════════════════════════════
# CLOUDWATCH — Logging & Monitoring
# ═══════════════════════════════════════════════════════════════════

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/tc-${var.environment}-api"
  retention_in_days = var.environment == "production" ? 90 : 14

  tags = { Name = "tc-${var.environment}-api-logs" }
}

# ═══════════════════════════════════════════════════════════════════
# SECRETS MANAGER
# ═══════════════════════════════════════════════════════════════════

resource "aws_secretsmanager_secret" "db_url" {
  name = "tc/${var.environment}/database-url"
  tags = { Name = "tc-${var.environment}-db-url" }
}

resource "aws_secretsmanager_secret" "redis_url" {
  name = "tc/${var.environment}/redis-url"
  tags = { Name = "tc-${var.environment}-redis-url" }
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "tc/${var.environment}/jwt-secret"
  tags = { Name = "tc-${var.environment}-jwt-secret" }
}

# ═══════════════════════════════════════════════════════════════════
# IAM ROLES
# ═══════════════════════════════════════════════════════════════════

resource "aws_iam_role" "ecs_execution" {
  name = "tc-${var.environment}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_secrets" {
  name = "tc-${var.environment}-secrets-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = [
        aws_secretsmanager_secret.db_url.arn,
        aws_secretsmanager_secret.redis_url.arn,
        aws_secretsmanager_secret.jwt_secret.arn,
      ]
    }]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "tc-${var.environment}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}
