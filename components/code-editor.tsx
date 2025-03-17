"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Editor, { Monaco } from "@monaco-editor/react"
import { Code2, ChevronDown, Play, Send, Loader2 } from "lucide-react"
import { useState } from "react"

declare global {
  interface Window {
    monaco: Monaco;
  }
}

const LANGUAGES = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C++", value: "cpp" },
] as const

type Language = (typeof LANGUAGES)[number]

interface CodeEditorProps {
  onRun?: (code: string) => void
  onSubmit?: (code: string) => void
}

export function CodeEditor({ onRun, onSubmit }: CodeEditorProps) {
  const [language, setLanguage] = useState<Language>(LANGUAGES[0])
  const [isExecuting, setIsExecuting] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    const editor = window.monaco?.editor.getModels()[0]
    if (!editor) return

    setIsExecuting(true)
    setOutput(null)
    setError(null)

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: language.value,
          code: editor.getValue(),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to execute code')
      }

      setOutput(data.output || data.stdout)
      if (data.stderr) {
        setError(data.stderr)
      }

      if (onRun) {
        onRun(editor.getValue())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsExecuting(false)
    }
  }

  const handleSubmit = () => {
    const editor = window.monaco?.editor.getModels()[0]
    if (editor && onSubmit) {
      onSubmit(editor.getValue())
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Code2 className="h-4 w-4" />
              {language.label}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.value}
                onClick={() => setLanguage(lang)}
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="60%"
          defaultLanguage={language.value}
          defaultValue={`// Write your ${language.label} code here`}
          language={language.value}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
          }}
        />
        <div className="h-40 p-4 bg-black text-white font-mono text-sm overflow-auto">
          {isExecuting && <p>Executing code...</p>}
          {output && <pre className="text-green-400">{output}</pre>}
          {error && <pre className="text-red-400">{error}</pre>}
        </div>
      </div>
      <div className="flex justify-end gap-2 p-2 border-t">
        <Button 
          variant="outline" 
          onClick={handleRun}
          className="gap-2"
          disabled={isExecuting}
        >
          {isExecuting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Run
            </>
          )}
        </Button>
        <Button 
          onClick={handleSubmit}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Submit
        </Button>
      </div>
    </Card>
  )
} 