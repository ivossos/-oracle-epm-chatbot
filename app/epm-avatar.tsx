'use client';

import { useState } from 'react';
import {
  AvatarCall,
  AvatarVideo,
  ControlBar,
  useAvatarStatus,
  useTranscript,
} from '@runwayml/avatars-react';

type Phase = 'idle' | 'in-call' | 'ended' | 'error';

export function EpmAvatar() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  // Session credentials are single-use; bumping the key mounts a fresh call (and a new session).
  const [callKey, setCallKey] = useState(0);

  const start = () => {
    setError(null);
    setCallKey((k) => k + 1);
    setPhase('in-call');
  };

  if (phase !== 'in-call') {
    return (
      <div className="stage">
        <div className="center">
          {phase === 'ended' && <p>Call ended.</p>}
          {phase === 'error' && <p role="alert">Something went wrong: {error}</p>}
          <p className="muted">Your browser will ask for microphone access.</p>
          <button className="primary" onClick={start}>
            {phase === 'idle' ? 'Start talking' : 'Start a new call'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AvatarCall
        key={callKey}
        className="stage"
        // The server decides which Character to use; this value is only a label.
        avatarId="epm-assistant"
        connectUrl="/api/avatar/connect"
        video={false}
        onEnd={() => setPhase('ended')}
        onError={(err) => {
          setError(err.message);
          setPhase('error');
        }}
      >
        <CallBody />
      </AvatarCall>
    </>
  );
}

function CallBody() {
  const avatar = useAvatarStatus();
  const transcript = useTranscript();

  return (
    <>
      <AvatarVideo>
        {(status) =>
          status.status === 'ready' ? null : (
            <div className="center">
              {status.status === 'connecting' ? 'Connecting to your EPM assistant…' : 'Waiting for video…'}
            </div>
          )
        }
      </AvatarVideo>
      {avatar.status === 'error' && <p role="alert">{avatar.error.message}</p>}
      <ControlBar showCamera={false} showScreenShare={false} />
      {transcript.length > 0 && (
        <ul className="transcript" aria-live="polite">
          {transcript.map((t) => (
            <li key={t.id}>{t.text}</li>
          ))}
        </ul>
      )}
    </>
  );
}
