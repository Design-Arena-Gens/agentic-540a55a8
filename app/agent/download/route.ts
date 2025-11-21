import { NextResponse } from 'next/server'

const AGENT_SCRIPT = `#!/usr/bin/env python3
"""
Desktop Agent - Local software control agent
Connects to the web dashboard and executes commands
"""

import os
import sys
import json
import time
import socket
import platform
import subprocess
import urllib.request
import urllib.error
from uuid import uuid4

# Configuration
SERVER_URL = "https://agentic-540a55a8.vercel.app"
AGENT_ID = str(uuid4())
HOSTNAME = socket.gethostname()
PLATFORM = platform.system()

def send_request(endpoint, data):
    """Send HTTP request to server"""
    try:
        url = f"{SERVER_URL}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        data_bytes = json.dumps(data).encode('utf-8')
        req = urllib.request.Request(url, data=data_bytes, headers=headers, method='POST')

        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Request error: {e}")
        return None

def execute_command(command):
    """Execute shell command and return output"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )

        output = result.stdout if result.stdout else result.stderr
        return {
            'success': result.returncode == 0,
            'output': output,
            'returncode': result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'output': 'Command timeout (30s)',
            'returncode': -1
        }
    except Exception as e:
        return {
            'success': False,
            'output': str(e),
            'returncode': -1
        }

def register_agent():
    """Register this agent with the server"""
    print(f"Registering agent {AGENT_ID}...")
    result = send_request('agents', {
        'type': 'register',
        'id': AGENT_ID,
        'hostname': HOSTNAME,
        'platform': PLATFORM
    })

    if result and result.get('success'):
        print(f"✓ Agent registered successfully")
        print(f"  Hostname: {HOSTNAME}")
        print(f"  Platform: {PLATFORM}")
        print(f"  Agent ID: {AGENT_ID}")
        return True

    print("✗ Failed to register agent")
    return False

def main_loop():
    """Main agent loop"""
    print(f"\\nAgent is running. Press Ctrl+C to stop.\\n")

    while True:
        try:
            # Send heartbeat and check for commands
            result = send_request('agents', {
                'type': 'heartbeat',
                'id': AGENT_ID
            })

            if result and result.get('commands'):
                for cmd in result['commands']:
                    print(f"Executing: {cmd['command']}")

                    # Execute the command
                    exec_result = execute_command(cmd['command'])

                    # Report result
                    send_request('agents', {
                        'type': 'command_result',
                        'commandId': cmd['id'],
                        'status': 'success' if exec_result['success'] else 'error',
                        'output': exec_result['output']
                    })

                    print(f"Output: {exec_result['output'][:100]}...")

            time.sleep(2)  # Poll every 2 seconds

        except KeyboardInterrupt:
            print("\\n\\nAgent stopped by user")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)

if __name__ == '__main__':
    print("=" * 60)
    print("Desktop Agent - Starting...")
    print("=" * 60)

    if register_agent():
        main_loop()
    else:
        print("Failed to start agent. Please check your connection.")
        sys.exit(1)
`

export async function GET() {
  return new NextResponse(AGENT_SCRIPT, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="desktop-agent.py"',
    },
  })
}
