'use client'

import { useState, useEffect } from 'react'

interface Agent {
  id: string
  hostname: string
  platform: string
  connected: boolean
  lastSeen: string
}

interface CommandHistory {
  id: string
  command: string
  timestamp: string
  status: 'success' | 'error' | 'pending'
  output?: string
}

interface TerminalLine {
  type: 'command' | 'output' | 'error' | 'info'
  text: string
  timestamp: string
}

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [command, setCommand] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [terminal, setTerminal] = useState<TerminalLine[]>([])
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    // Add initial welcome message
    addToTerminal('info', 'Desktop Agent Control System initialized')
    addToTerminal('info', 'Waiting for agents to connect...')

    // Connect to WebSocket
    connectWebSocket()

    return () => {
      if (ws) {
        ws.close()
      }
    }
  }, [])

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/ws`
      const websocket = new WebSocket(wsUrl)

      websocket.onopen = () => {
        addToTerminal('info', 'Connected to command server')
      }

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      websocket.onerror = () => {
        addToTerminal('error', 'WebSocket connection error')
      }

      websocket.onclose = () => {
        addToTerminal('info', 'Disconnected from command server')
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000)
      }

      setWs(websocket)
    } catch (e) {
      console.error('WebSocket connection failed:', e)
    }
  }

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'agent_connected':
        addToTerminal('info', `Agent connected: ${data.agent.hostname} (${data.agent.platform})`)
        setAgents(prev => [...prev.filter(a => a.id !== data.agent.id), data.agent])
        break

      case 'agent_disconnected':
        addToTerminal('info', `Agent disconnected: ${data.agentId}`)
        setAgents(prev => prev.map(a =>
          a.id === data.agentId ? { ...a, connected: false } : a
        ))
        break

      case 'command_output':
        addToTerminal('output', data.output)
        updateCommandHistory(data.commandId, 'success', data.output)
        break

      case 'command_error':
        addToTerminal('error', data.error)
        updateCommandHistory(data.commandId, 'error', data.error)
        break
    }
  }

  const addToTerminal = (type: TerminalLine['type'], text: string) => {
    setTerminal(prev => [...prev, {
      type,
      text,
      timestamp: new Date().toLocaleTimeString()
    }])
  }

  const updateCommandHistory = (id: string, status: CommandHistory['status'], output?: string) => {
    setCommandHistory(prev => prev.map(cmd =>
      cmd.id === id ? { ...cmd, status, output } : cmd
    ))
  }

  const sendCommand = (cmd: string) => {
    if (!cmd.trim() || !selectedAgent) {
      addToTerminal('error', 'Please select an agent and enter a command')
      return
    }

    const commandId = Date.now().toString()

    addToTerminal('command', `$ ${cmd}`)

    const historyItem: CommandHistory = {
      id: commandId,
      command: cmd,
      timestamp: new Date().toLocaleTimeString(),
      status: 'pending'
    }

    setCommandHistory(prev => [historyItem, ...prev])

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'command',
        agentId: selectedAgent,
        command: cmd,
        commandId
      }))
    } else {
      addToTerminal('error', 'Not connected to server')
      updateCommandHistory(commandId, 'error', 'Not connected')
    }

    setCommand('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendCommand(command)
  }

  const quickActions = [
    { label: 'Open Chrome', command: 'google-chrome || open -a "Google Chrome" || start chrome' },
    { label: 'Open VSCode', command: 'code . || open -a "Visual Studio Code"' },
    { label: 'Open Terminal', command: 'gnome-terminal || open -a Terminal || start cmd' },
    { label: 'System Info', command: 'uname -a || systeminfo' },
    { label: 'List Processes', command: 'ps aux || tasklist' },
    { label: 'Disk Usage', command: 'df -h || wmic logicaldisk get size,freespace,caption' },
  ]

  return (
    <div className="container">
      <div className="header">
        <h1>🤖 Desktop Agent Control</h1>
        <p>Command and control your desktop applications remotely</p>
      </div>

      <div className="main-grid">
        <div className="card">
          <h2>Connected Agents</h2>
          <div className="agent-list">
            {agents.length === 0 ? (
              <div className="setup-instructions">
                <h3>⚠️ No Agents Connected</h3>
                <p>Download and run the desktop agent:</p>
                <ol>
                  <li>Download: <code>curl https://agentic-540a55a8.vercel.app/agent/download -o agent.py</code></li>
                  <li>Run: <code>python3 agent.py</code></li>
                </ol>
              </div>
            ) : (
              agents.map(agent => (
                <div
                  key={agent.id}
                  className={`agent-item ${selectedAgent === agent.id ? 'active' : ''}`}
                  onClick={() => setSelectedAgent(agent.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="agent-header">
                    <span className="agent-name">
                      <span className={`status-indicator ${agent.connected ? 'connected' : 'disconnected'}`} />
                      {agent.hostname}
                    </span>
                  </div>
                  <div className="agent-details">
                    Platform: {agent.platform} | Last seen: {agent.lastSeen}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h2>Command Center</h2>
          <form className="command-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                type="text"
                className="input"
                placeholder="Enter command to execute..."
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                disabled={!selectedAgent}
              />
              <button
                type="submit"
                className="button"
                disabled={!selectedAgent || !command.trim()}
              >
                Execute
              </button>
            </div>
          </form>

          <div>
            <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>Quick Actions</h3>
            <div className="quick-actions">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="quick-action-btn"
                  onClick={() => sendCommand(action.command)}
                  disabled={!selectedAgent}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Terminal Output</h2>
        <div className="terminal">
          {terminal.map((line, index) => (
            <div key={index} className={`terminal-line ${line.type}`}>
              <span style={{ opacity: 0.6 }}>[{line.timestamp}]</span> {line.text}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Command History</h2>
        <div className="command-history">
          {commandHistory.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
              No commands executed yet
            </p>
          ) : (
            commandHistory.map((item) => (
              <div key={item.id} className="history-item">
                <div className="history-command">{item.command}</div>
                <div className="history-time">
                  {item.timestamp} - Status: {item.status}
                </div>
                {item.output && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>
                    {item.output}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
