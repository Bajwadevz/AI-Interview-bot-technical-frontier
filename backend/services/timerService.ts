import { useState, useEffect, useRef, useCallback } from 'react';

interface UseInterviewTimerProps {
  questionTimeLimitSec: number;
  sessionTimeLimitSec: number;
  onQuestionExpired: () => void;
  onSessionExpired: () => void;
}

export const useInterviewTimer = ({
  questionTimeLimitSec,
  sessionTimeLimitSec,
  onQuestionExpired,
  onSessionExpired
}: UseInterviewTimerProps) => {
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(questionTimeLimitSec);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(sessionTimeLimitSec);
  const [isRunning, setIsRunning] = useState(false);

  const onQuestionExpiredRef = useRef(onQuestionExpired);
  const onSessionExpiredRef = useRef(onSessionExpired);

  useEffect(() => {
    onQuestionExpiredRef.current = onQuestionExpired;
    onSessionExpiredRef.current = onSessionExpired;
  }, [onQuestionExpired, onSessionExpired]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRunning) {
      intervalId = setInterval(() => {
        setSessionTimeRemaining(prevSession => {
          if (prevSession <= 1) {
            setIsRunning(false);
            onSessionExpiredRef.current();
            return 0;
          }
          return prevSession - 1;
        });

        setQuestionTimeRemaining(prevQuestion => {
          if (prevQuestion <= 1) {
            onQuestionExpiredRef.current();
            return 0; // The component should reset the question timer by calling resetQuestionTimer
          }
          return prevQuestion - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning]);

  const startTimer = useCallback(() => setIsRunning(true), []);
  const pauseTimer = useCallback(() => setIsRunning(false), []);
  const resetQuestionTimer = useCallback(() => setQuestionTimeRemaining(questionTimeLimitSec), [questionTimeLimitSec]);

  return {
    questionTimeRemaining,
    sessionTimeRemaining,
    isRunning,
    startTimer,
    pauseTimer,
    resetQuestionTimer
  };
};
