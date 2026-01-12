from datetime import time
import json
import time
import os
import requests
import subprocess
import logging

# Configuration
CONFIG_PATH = "/etc/wireguard/limits.json"
WG_CONFIG_PATH = "/etc/wireguard/wg0.conf" # To map Names to IPs if needed, or query API
PROMETHEUS_URL = "http://vpn-prometheus:9090/api/v1/query"
WG_CONTAINER = "wg-easy"

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_prometheus_metric(query):
    try:
        response = requests.get(PROMETHEUS_URL, params={'query': query})
        data = response.json()
        if data['status'] == 'success':
            return data['data']['result']
    except Exception as e:
        logging.error(f"Prometheus query failed: {e}")
    return []

def get_client_ip(client_name):
    # Quick hack: Parse wg0.conf or use wg-easy API. 
    # Since we are sidecar, we might share volume.
    # Parsing wg0.conf implies we know the structure.
    # wg-easy adds comments: ### Client Name
    # [Peer] ... AllowedIPs = 10.8.0.2/32
    try:
        with open(WG_CONFIG_PATH, 'r') as f:
            content = f.read()
        
        # Simple parsing logic
        # Find "### client_name" then look for AllowedIPs
        lines = content.split('\n')
        found_client = False
        for i, line in enumerate(lines):
            if f"### {client_name}" in line:
                found_client = True
            if found_client and "AllowedIPs" in line:
                # AllowedIPs = 10.8.0.2/32
                parts = line.split('=')
                if len(parts) > 1:
                    return parts[1].strip().split('/')[0]
                found_client = False
    except Exception as e:
        logging.error(f"Error reading wg0.conf: {e}")
    return None

def apply_limits():
    if not os.path.exists(CONFIG_PATH):
        logging.info("No limits file found.")
        return

    try:
        with open(CONFIG_PATH, 'r') as f:
            limits = json.load(f)
    except Exception as e:
        logging.error(f"Failed to load limits: {e}")
        return

    # 1. Traffic Limits
    # Query total sent/received by IP
    # wireguard_sent_bytes_total + wireguard_received_bytes_total
    
    # 2. Speed Limits
    # Apply via tc
    
    for client_id, config in limits.items():
        # Config should have: id, name, speed_limit (mbps), traffic_limit (gb), enabled
        name = config.get('name')
        if not name: continue
        
        ip = get_client_ip(name)
        if not ip:
            logging.warning(f"Could not find IP for client {name}")
            continue

        # Traffic Check
        traffic_limit_gb = config.get('traffic_limit', 0)
        if traffic_limit_gb > 0:
            bytes_limit = traffic_limit_gb * 1024 * 1024 * 1024
            # Query Prometheus (sum of rx+tx for this ip)
            # Note: Prometheus IPs might be "10.8.0.2"
            q = f'wireguard_sent_bytes_total{{allowed_ips="{ip}/32"}} + wireguard_received_bytes_total{{allowed_ips="{ip}/32"}}'
            results = get_prometheus_metric(q)
            if results:
                total_bytes = float(results[0]['value'][1])
                if total_bytes > bytes_limit:
                    logging.info(f"Client {name} ({ip}) exceeded traffic limit. Disabling...")
                    # Disable client command
                    subprocess.run(["docker", "exec", WG_CONTAINER, "wg", "set", "wg0", "peer", "TODO_GET_PUBLIC_KEY", "remove"]) 
                    # Actually valid way to disable in wg-easy is via API (toggle disable).
                    # But we are script. 
                    # Maybe just use `iptables -I FORWARD -s 10.8.0.2 -j DROP`
                    subprocess.run(["docker", "exec", WG_CONTAINER, "iptables", "-D", "FORWARD", "-s", ip, "-j", "DROP"], stderr=subprocess.DEVNULL) # clear old
                    subprocess.run(["docker", "exec", WG_CONTAINER, "iptables", "-I", "FORWARD", "-s", ip, "-j", "DROP"])

        # Speed Check
        # Call the existing shell script or run tc directly
        # For POC, let's just log
        speed_mbps = config.get('speed_limit', 0)
        if speed_mbps > 0:
             # Run tc logic.
             # We rely on limit_speed.sh being present in the container or we pass the command
             # Easier: Copy limit_speed.sh into wg-easy container on startup?
             # Or just running the raw commands here using docker exec.
             pass

if __name__ == "__main__":
    logging.info("Starting VPN Monitor...")
    while True:
        apply_limits()
        time.sleep(30)
