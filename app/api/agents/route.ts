import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for demo (use database in production)
let agents: any[] = []
let commands: any[] = []

export async function GET() {
  return NextResponse.json({
    agents: agents.filter(a => Date.now() - a.lastSeen < 30000),
    commands: commands.slice(0, 50)
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (body.type === 'register') {
    const agent = {
      id: body.id,
      hostname: body.hostname,
      platform: body.platform,
      connected: true,
      lastSeen: Date.now()
    }

    agents = agents.filter(a => a.id !== agent.id)
    agents.push(agent)

    return NextResponse.json({ success: true, agent })
  }

  if (body.type === 'heartbeat') {
    const agent = agents.find(a => a.id === body.id)
    if (agent) {
      agent.lastSeen = Date.now()
      agent.connected = true
    }

    const pendingCommands = commands.filter(
      c => c.agentId === body.id && c.status === 'pending'
    )

    return NextResponse.json({ success: true, commands: pendingCommands })
  }

  if (body.type === 'command_result') {
    const command = commands.find(c => c.id === body.commandId)
    if (command) {
      command.status = body.status
      command.output = body.output
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
