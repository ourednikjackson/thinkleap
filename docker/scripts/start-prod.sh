#!/bin/bash
docker compose -f docker/docker-compose.base.yml -f docker/prod/docker-compose.yml up --build -d