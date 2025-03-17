import { NextResponse } from 'next/server'

interface ExecuteRequestBody {
  language: string
  code: string
}

interface PistonResponse {
  run: {
    stdout: string
    stderr: string
    output: string
    code: number
  }
}

export async function POST(request: Request) {
  try {
    const body: ExecuteRequestBody = await request.json()
    const { language, code } = body

    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language,
        version: '*',
        files: [
          {
            content: code,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to execute code')
    }

    const result: PistonResponse = await response.json()

    return NextResponse.json({
      stdout: result.run.stdout,
      stderr: result.run.stderr,
      output: result.run.output,
      exitCode: result.run.code,
    })
  } catch (error) {
    console.error('Code execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute code' },
      { status: 500 }
    )
  }
} 