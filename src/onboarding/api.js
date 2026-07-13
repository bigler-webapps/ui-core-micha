import apiClient from '../auth/apiClient';

const STEP_CONFIG_URL = '/api/onboarding/step-config/';

export async function getOnboardingStepConfig() {
  const response = await apiClient.get(STEP_CONFIG_URL);
  return response.data;
}

export async function patchOnboardingStepConfig(payload) {
  const response = await apiClient.patch(STEP_CONFIG_URL, payload);
  return response.data;
}
