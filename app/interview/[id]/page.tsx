"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  AgentState,
  DisconnectButton,
} from "@livekit/components-react"
import { Mic, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useState } from "react"
import { MediaDeviceFailure } from "livekit-client"
import type { ConnectionDetails } from "@/app/api/connection-details/route"
import { NoAgentNotification } from "@/components/NoAgentNotification"
import { CloseIcon } from "@/components/CloseIcon"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CodeEditor } from "@/components/code-editor"


export default function Page({
  params,
}: {
  params: { id: string }
}) {
  const id = params.id
  console.log(id)

    
  const [connectionDetails, updateConnectionDetails] = useState<
    ConnectionDetails | undefined
  >(undefined)
  const [agentState, setAgentState] = useState<AgentState>("disconnected")

  const onConnectButtonClicked = useCallback(async () => {
    const url = new URL(
      process.env.NEXT_PUBLIC_CONN_DETAILS_ENDPOINT ?? "/api/connection-details",
      window.location.origin
    )
    const response = await fetch(url.toString())
    const connectionDetailsData = await response.json()
    updateConnectionDetails(connectionDetailsData)
  }, [])

  if (!connectionDetails) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--lk-bg)] p-4" data-lk-theme="default">
        <Card className="max-w-lg w-full rounded-lg border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Welcome to AI Interview Assistant</CardTitle>
            <CardDescription>Before you begin:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                <p>Please ensure your microphone is connected and working</p>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                <p>Check that your speakers or headphones are working</p>
              </div>
            </div>
            <Button 
              className="w-full"
              size="lg"
              onClick={onConnectButtonClicked}
            >
              Start Interview
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full">
      <main
        data-lk-theme="default"
        className="h-full bg-[var(--lk-bg)] flex flex-col"
      >

        <LiveKitRoom
          token={connectionDetails?.participantToken}
          serverUrl={connectionDetails?.serverUrl}
          connect={connectionDetails !== undefined}
          audio={true}
          video={false}
          onMediaDeviceFailure={onDeviceFailure}
          onDisconnected={() => {
            updateConnectionDetails(undefined)
          }}
          className="flex-1 grid grid-cols-[1fr_2fr] grid-rows-[1fr_auto] gap-4 p-4"
        >
          {/* Top left visualizer */}
          <Card className="p-6 rounded-lg border-0">
            <SimpleVoiceAssistant onStateChange={setAgentState} />
          </Card>

          {/* Right side code editor */}
          <Card className="col-span-1 rounded-lg border-0">
            <CodeEditor 
              onRun={(code) => {
                console.log("Running code:", code)
                // Add your code execution logic here
              }}
              onSubmit={(code) => {
                console.log("Submitting code:", code)
                // Add your submission logic here
              }}
            />
          </Card>

          {/* Bottom controls spanning full width */}
          <Card className="col-span-2 rounded-lg border-0">
            <ControlBar
              onConnectButtonClicked={onConnectButtonClicked}
              agentState={agentState}
            />
          </Card>

          <RoomAudioRenderer />
          <NoAgentNotification state={agentState} />
        </LiveKitRoom>
      </main>
    </div>
  )
}

function SimpleVoiceAssistant(props: {
  onStateChange: (state: AgentState) => void
}) {
  const { state, audioTrack } = useVoiceAssistant()
  useEffect(() => {
    props.onStateChange(state)
  }, [props, state])
  return (
    <Card className="h-[200px] w-full rounded-lg border-none shadow-none">
      <BarVisualizer
        state={state}
        barCount={5}
        trackRef={audioTrack}
        className="agent-visualizer bg-transparent"
        options={{ minHeight: 16 }}
      />
    </Card>
  )
}

function ControlBar(props: {
  onConnectButtonClicked: () => void
  agentState: AgentState
}) {
  return (
    <div className="relative h-16 flex items-center justify-center bg-[var(--lk-bg)] border-white/0.2 border-t-1">
      <AnimatePresence>
        {props.agentState === "disconnected" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Button
              size="lg"
              onClick={() => props.onConnectButtonClicked()}
            >
              Start a conversation
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {props.agentState !== "disconnected" &&
          props.agentState !== "connecting" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex h-8 justify-center items-center gap-2"
            >
              <VoiceAssistantControlBar controls={{ leave: false }} />
              <DisconnectButton>
                <CloseIcon />
              </DisconnectButton>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  )
}

function onDeviceFailure(error?: MediaDeviceFailure) {
  console.error(error)
  alert(
    "Error acquiring camera or microphone permissions. Please make sure you grant the necessary permissions in your browser and reload the tab"
  )
}

