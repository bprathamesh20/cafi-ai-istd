"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Editor from "@monaco-editor/react"
import { Code2, ChevronDown, Play, Send } from "lucide-react"
import { useState } from "react"
import * as monaco from 'monaco-editor'

declare global {
  interface Window {
    monaco: typeof monaco;
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

  const handleRun = () => {
    const editor = window.monaco?.editor.getModels()[0]
    if (editor && onRun) {
      onRun(editor.getValue())
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
          height="100%"
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
      </div>
      <div className="flex justify-end gap-2 p-2 border-t">
        <Button 
          variant="outline" 
          onClick={handleRun}
          className="gap-2"
        >
          <Play className="h-4 w-4" />
          Run
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