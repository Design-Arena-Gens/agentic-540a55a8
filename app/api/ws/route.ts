import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  // WebSocket upgrade handling
  // Note: Vercel doesn't support WebSockets, so we'll use a polling approach
  // This endpoint will be used by the frontend to check connection status

  return new Response(JSON.stringify({
    status: 'WebSocket endpoint',
    message: 'Use polling endpoints for production deployment'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  })
}
