const MODERATION_SERVICE_URL = 'http://localhost:8084';

export interface TestScenario {
  title: string;
  body: string;
  author: string;
  karma: number;
  accountAge: number;
  domain: string;
  flair: string;
}

export interface TestPlaygroundRequest {
  subredditName: string;
  ruleYaml: string;
  scenario: TestScenario;
}

export interface TestPlaygroundResponse {
  triggered: boolean;
  action: string | null;
  message: string | null;
  error: string | null;
}

export async function testCustomRule(
  token: string,
  request: TestPlaygroundRequest
): Promise<TestPlaygroundResponse> {
  const response = await fetch(`${MODERATION_SERVICE_URL}/api/moderation/tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });

  const data = await response.json();

  if (!response.ok) {
    // Backend returns TestPlaygroundResponse with error field on 400
    if (data.error) {
      return data as TestPlaygroundResponse;
    }
    throw new Error(data.message || `Server error: ${response.status}`);
  }

  return data as TestPlaygroundResponse;
}
