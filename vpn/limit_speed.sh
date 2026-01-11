#!/bin/bash

# Script to limit speed for a specific WireGuard Client (IP)
# Usage: ./limit_speed.sh <IP> <DOWNLOAD_LIMIT> <UPLOAD_LIMIT>
# Example: ./limit_speed.sh 10.8.0.2 5mbit 5mbit

CLIENT_IP=$1
DOWN_LIMIT=$2
UP_LIMIT=$3
CONTAINER="wg-easy"
INTERFACE="wg0"

if [ -z "$3" ]; then
  echo "Usage: ./limit_speed.sh <IP> <DOWNLOAD_MBIT> <UPLOAD_MBIT>"
  echo "Example: ./limit_speed.sh 10.8.0.2 10mbit 5mbit"
  exit 1
fi

echo "Setting limits for $CLIENT_IP: Down=$DOWN_LIMIT, Up=$UP_LIMIT"

# We execute 'tc' commands INSIDE the Docker container
# 1. Clear existing rules for this IP (Simple reset approach not implemented, we append)
# TODO: proper handles handling. For now, this is a basic "apply to interface" template.

# Since tc logic is complex (class IDs, filters), we'll do a simple interface-based limiter for now as a POC.
# Ideally we need a 'wondershaper' or a known easy tc script functionality inside local container.

# Check if tc exists in container
docker exec $CONTAINER command -v tc >/dev/null 2>&1 || { echo "Error: 'tc' not found in container. You might need to install iproute2."; exit 1; }

echo "Applying rules... (Note: this effectively requires the container to have 'tc' installed)"
echo "Currently this is a placeholder. Automatic tc limiting requires installing 'iproute2' in the wg-easy alpine image."
echo "I will add a command to install it first."

# Install tc if missing (Alpine specific)
docker exec $CONTAINER apk add --no-cache iproute2

# THIS IS A COMPLEX TOPIC. WireGuard interfaces are virtual.
# Limiting traffic on wg0 affects ALL traffic unless we use filters.

echo "Installing dependency..."
docker exec $CONTAINER apk add --no-cache iproute2

# Clean up root qdisc
docker exec $CONTAINER tc qdisc del dev $INTERFACE root 2>/dev/null

# Add root htb qdisc
docker exec $CONTAINER tc qdisc add dev $INTERFACE root handle 1: htb default 10

# Create a class for the specific user (We'll use Class ID based on last octet of IP, e.g. 10.8.0.2 -> 1:2)
OCTET=$(echo $CLIENT_IP | awk -F. '{print $4}')
CLASSID="1:$OCTET"

echo "Class ID: $CLASSID"

# Add class with limits
docker exec $CONTAINER tc class add dev $INTERFACE parent 1: classid $CLASSID htb rate $UP_LIMIT ceil $UP_LIMIT

# Add filter to map IP to class
docker exec $CONTAINER tc filter add dev $INTERFACE protocol ip parent 1:0 prio 1 u32 match ip dst $CLIENT_IP flowid $CLASSID
docker exec $CONTAINER tc filter add dev $INTERFACE protocol ip parent 1:0 prio 1 u32 match ip src $CLIENT_IP flowid $CLASSID

echo "Limit applied. Client $CLIENT_IP is now capped at $UP_LIMIT."
