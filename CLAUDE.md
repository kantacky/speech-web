# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with Turbopack (recommended)
- `pnpm build` - Build production version
- `pnpm start` - Start production server  
- `pnpm lint` - Run ESLint checks

## Architecture Overview

This is a Next.js 15 application built with React 19, TypeScript, and Tailwind CSS that provides real-time speech-to-text functionality.

### Core Structure

- **Frontend**: React client component at `/speech-to-text` route
- **Backend**: Next.js API route at `/api/speech-to-text` for fallback processing
- **Speech Recognition**: Primarily uses Web Speech API with server-side fallback

### Speech-to-Text Implementation

The main functionality is implemented in `src/app/speech-to-text/page.tsx` with the following key features:

**State Management Pattern**:
- `RecognitionStatus` type manages five states: `idle`, `listening`, `processing`, `success`, `error`
- Dual transcript system: `transcript` (confirmed text) and `interimTranscript` (real-time preview)
- Auto-restart mechanism controlled by `shouldRestart` flag
- Transcript replacement logic via `isTranscriptCompleted` flag

**Web Speech API Integration**:
- Continuous recognition with `recognition.continuous = true`
- Interim results enabled for real-time feedback
- Auto-restart on `no-speech` errors to maintain session
- 100ms delay between restarts for optimal performance

**UI State Synchronization**:
- Status-dependent background colors and icons
- Real-time visual feedback during recognition phases
- Automatic state transitions (success → listening after 500ms)

### Key Behavioral Logic

1. **Recognition Flow**: When recording starts, the system enters `listening` state and automatically restarts recognition when it naturally ends, maintaining continuous operation.

2. **Transcript Handling**: New speech after completion replaces previous results rather than appending, creating a "latest utterance" behavior.

3. **Error Recovery**: `no-speech` errors are treated as normal pauses and trigger automatic restart rather than error states.

The fallback API route exists for browsers without Web Speech API support but currently returns placeholder responses.