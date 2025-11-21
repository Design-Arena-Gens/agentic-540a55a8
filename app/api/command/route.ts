import { NextRequest, NextResponse } from 'next/server'

// Import commands array from agents route (in production, use shared storage)
let commands: any[] = []

export async function POST(request: NextRequest) {
  const body = await request.json()

  const command = {
    id: body.commandId || Date.now().toString(),
    agentId: body.agentId,
    command: body.command,
    status: 'pending',
    timestamp: Date.now()
  }

  commands.push(command)

  return NextResponse.json({ success: true, commandId: command.id })
}

export async function GET(request: NextRequest) {
  const commandId = request.nextUrl.searchParams.get('id')

  if (commandId) {
    const command = commands.find(c => c.id === commandId)
    return NextResponse.json({ command })
  }

  return NextResponse.json({ commands: commands.slice(0, 50) })
}
