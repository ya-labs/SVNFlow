import { validateEnvironmentState, type EnvironmentStateInput } from './environment';

export interface InitialFlowGateResult {
  canAdvance: boolean;
  message: string;
}

export function checkInitialFlowGate(input: EnvironmentStateInput): InitialFlowGateResult {
  const state = validateEnvironmentState(input);

  if (state.status === 'ready') {
    return {
      canAdvance: true,
      message: state.message
    };
  }

  return {
    canAdvance: false,
    message: state.message
  };
}
