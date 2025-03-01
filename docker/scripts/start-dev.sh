#!/bin/bash
docker compose -f docker/docker-compose.base.yml -f docker/dev/docker-compose.yml up --build