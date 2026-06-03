import { useAgentOS } from '../context/AgentOSContext';

/**
 * Convenience hook that exposes the OS mode toggle and current mode
 * state from the AgentOS context.
 *
 * Usage:
 *   const { isOSMode, toggleOSMode } = useAgentOSMode();
 */
export function useAgentOSMode() {
  const { state, toggleOSMode } = useAgentOS();
  return {
    isOSMode: state.isOSMode,
    toggleOSMode,
  } as const;
}

export default useAgentOSMode;
