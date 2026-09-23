const axios = require('axios');

const DEFAULT_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';
const DEFAULT_MODEL = 'jev-latest';
const DEFAULT_TIMEOUT_MS = 2500;

function getApiKey() {
    return process.env.TYPESAFE_API_KEY || process.env.TYPE_SAFE_API_KEY || '';
}

function isEnabled() {
    return Boolean(getApiKey());
}

function extractAnswer(data, questionId) {
    if (!data || typeof data !== 'object') return null;
    const containers = [data.answers, data.results, data.output, data];

    for (const container of containers) {
        if (!container || typeof container !== 'object') continue;
        if (container[questionId]) return container[questionId];
    }

    return null;
}

function normalizeChoiceAnswer(answer) {
    if (!answer || typeof answer !== 'object') return null;

    const choice = answer.choice || answer.value || answer.answer || answer.selected;
    if (!choice || typeof choice !== 'string') return null;

    const probabilities = answer.probabilities || answer.probs || {};
    const probability = typeof probabilities[choice] === 'number'
        ? probabilities[choice]
        : null;
    const confidence = typeof answer.confidence === 'number'
        ? answer.confidence
        : probability;

    return {
        choice,
        probabilities,
        confidence: typeof confidence === 'number' ? confidence : null,
    };
}

async function askChoice(questionId, state, instructions, criteria) {
    if (!isEnabled()) {
        return { enabled: false };
    }

    const endpoint = process.env.TYPESAFE_SYSTEM_ONE_URL || DEFAULT_ENDPOINT;
    const model = process.env.TYPESAFE_MODEL || DEFAULT_MODEL;
    const timeout = Number(process.env.TYPESAFE_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);

    const response = await axios.post(
        endpoint,
        {
            model,
            state,
            questions: {
                [questionId]: {
                    type: 'choice',
                    instructions,
                    criteria,
                },
            },
        },
        {
            timeout,
            headers: {
                Authorization: `Bearer ${getApiKey()}`,
                'Content-Type': 'application/json',
            },
        }
    );

    const normalized = normalizeChoiceAnswer(extractAnswer(response.data, questionId));
    if (!normalized) {
        throw new Error('TypeSafe System One choice answer was missing or malformed');
    }

    return {
        enabled: true,
        ...normalized,
        usage: response.data?.usage || null,
    };
}

module.exports = {
    askChoice,
    isEnabled,
    _private: {
        extractAnswer,
        normalizeChoiceAnswer,
    },
};
