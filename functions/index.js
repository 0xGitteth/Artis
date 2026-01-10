import crypto from 'crypto';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { VertexAI } from '@google-cloud/vertexai';
import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';

const suggestThreshold = 0.45;
const forbiddenThreshold = 0.7;
const mediumLogThreshold = 0.55;

const likelihoodScores = {
  UNKNOWN: 0,
  VERY_UNLIKELY: 0.1,
  UNLIKELY: 0.25,
  POSSIBLE: 0.5,
  LIKELY: 0.7,
  VERY_LIKELY: 0.9,
};

const dataUrlPattern = /^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/;

const needlesKeywords = ['needle', 'syringe', 'injection', 'injections', 'hypodermic', 'vaccination'];
const spidersKeywords = ['spider', 'spiders', 'insect', 'insects', 'bug', 'bugs', 'beetle', 'mosquito', 'cockroach', 'ant', 'fly'];

const normalizeMakerTags = (makerTags) => {
  const raw = Array.isArray(makerTags)
    ? makerTags
    : typeof makerTags === 'string'
      ? makerTags.split(',')
      : [];
  const normalized = raw
    .map((tag) => String(tag).trim())
    .filter(Boolean)
    .map((tag) => tag.toLowerCase());
  return [...new Set(normalized)];
};

const scoreFromLikelihood = (likelihood) => likelihoodScores[likelihood] ?? 0;

const parseImageDataUrl = (image) => {
  if (typeof image !== 'string') {
    return { error: 'Image moet een base64 data-URL string zijn.' };
  }
  const match = image.match(dataUrlPattern);
  if (!match) {
    return { error: 'Image moet een geldige base64 data-URL zijn (png/jpg/webp).' };
  }
  const mimeType = `image/${match[1]}`;
  const buffer = Buffer.from(match[2], 'base64');
  return { buffer, mimeType };
};

const ensureJsonBody = (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return null;
    }
  }
  return null;
};

const buildFingerprint = (buffer) => {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  return { sha256: hash };
};

const extractLabelScore = (labels, keywords) => {
  if (!labels?.length) return 0;
  return labels.reduce((maxScore, label) => {
    const description = label.description?.toLowerCase() || '';
    if (keywords.some((keyword) => description.includes(keyword))) {
      return Math.max(maxScore, Number(label.score) || 0);
    }
    return maxScore;
  }, 0);
};

const buildTriggerRecord = (trigger, score, source) => ({ trigger, score, source });

const parseGeminiJson = (text) => {
  if (!text) return null;
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  try {
    return JSON.parse(text.slice(firstBrace, lastBrace + 1));
  } catch (error) {
    return null;
  }
};

const runGeminiClassifier = async ({ buffer, mimeType }) => {
  if (process.env.ENABLE_GEMINI_CLASSIFIER !== 'true') {
    return null;
  }
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
  if (!project) {
    logger.warn('Gemini classifier skipped: GOOGLE_CLOUD_PROJECT ontbreekt.');
    return null;
  }
  const vertex = new VertexAI({ project, location });
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash-002';
  const model = vertex.getGenerativeModel({ model: modelName });
  const prompt = [
    'You are a moderation classifier. Return ONLY valid JSON.',
    'Schema: {"triggers": [{"trigger": string, "confidence": number, "severity": "suggest"|"forbidden"}], "forbiddenReasons": [string]}',
    'Only include triggers that are NOT nudityErotic, explicit18, needlesInjections, spidersInsects.',
    'If nothing is detected, return {"triggers": [], "forbiddenReasons": []}.',
  ].join('\n');

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: buffer.toString('base64'), mimeType } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
    },
  });

  const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseGeminiJson(text);
};

export const moderateImage = onRequest({ cors: true }, async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Gebruik POST.' });
    return;
  }

  const body = ensureJsonBody(req);
  if (!body) {
    res.status(400).json({ error: 'Ongeldige JSON body.' });
    return;
  }

  const { image, makerTags } = body;
  const parsed = parseImageDataUrl(image);
  if (parsed.error) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const normalizedMakerTags = normalizeMakerTags(makerTags);
  const appliedTriggers = normalizedMakerTags.map((tag) => buildTriggerRecord(tag, 1, 'makerTag'));
  const suggestedTriggers = [];
  const forbiddenReasons = [];

  const imageAnnotator = new ImageAnnotatorClient();
  let labels = [];
  let safeSearch = null;

  try {
    const [safeSearchResult] = await imageAnnotator.safeSearchDetection({
      image: { content: parsed.buffer },
    });
    safeSearch = safeSearchResult.safeSearchAnnotation || null;
  } catch (error) {
    logger.error('SafeSearch detectie mislukt.', error);
  }

  try {
    const [labelResult] = await imageAnnotator.labelDetection({
      image: { content: parsed.buffer },
      maxResults: 15,
    });
    labels = labelResult.labelAnnotations || [];
  } catch (error) {
    logger.error('Label detectie mislukt.', error);
  }

  if (safeSearch) {
    const nudityScore = scoreFromLikelihood(safeSearch.racy);
    const explicitScore = scoreFromLikelihood(safeSearch.adult);

    if (nudityScore >= forbiddenThreshold) {
      appliedTriggers.push(buildTriggerRecord('nudityErotic', nudityScore, 'safeSearch'));
      forbiddenReasons.push({ trigger: 'nudityErotic', reason: 'SafeSearch racy', score: nudityScore });
    } else if (nudityScore >= suggestThreshold) {
      suggestedTriggers.push(buildTriggerRecord('nudityErotic', nudityScore, 'safeSearch'));
    }

    if (explicitScore >= forbiddenThreshold) {
      appliedTriggers.push(buildTriggerRecord('explicit18', explicitScore, 'safeSearch'));
      forbiddenReasons.push({ trigger: 'explicit18', reason: 'SafeSearch adult', score: explicitScore });
    } else if (explicitScore >= suggestThreshold) {
      suggestedTriggers.push(buildTriggerRecord('explicit18', explicitScore, 'safeSearch'));
    }

    if (nudityScore >= mediumLogThreshold || explicitScore >= mediumLogThreshold) {
      logger.info('Medium log threshold bereikt.', { nudityScore, explicitScore });
    }
  }

  const needlesScore = extractLabelScore(labels, needlesKeywords);
  const spidersScore = extractLabelScore(labels, spidersKeywords);

  if (needlesScore >= forbiddenThreshold) {
    appliedTriggers.push(buildTriggerRecord('needlesInjections', needlesScore, 'labelDetection'));
    forbiddenReasons.push({ trigger: 'needlesInjections', reason: 'Vision labels', score: needlesScore });
  } else if (needlesScore >= suggestThreshold) {
    suggestedTriggers.push(buildTriggerRecord('needlesInjections', needlesScore, 'labelDetection'));
  }

  if (spidersScore >= forbiddenThreshold) {
    appliedTriggers.push(buildTriggerRecord('spidersInsects', spidersScore, 'labelDetection'));
    forbiddenReasons.push({ trigger: 'spidersInsects', reason: 'Vision labels', score: spidersScore });
  } else if (spidersScore >= suggestThreshold) {
    suggestedTriggers.push(buildTriggerRecord('spidersInsects', spidersScore, 'labelDetection'));
  }

  if (needlesScore >= mediumLogThreshold || spidersScore >= mediumLogThreshold) {
    logger.info('Medium log threshold labels bereikt.', { needlesScore, spidersScore });
  }

  try {
    const geminiResult = await runGeminiClassifier(parsed);
    if (geminiResult?.triggers?.length) {
      geminiResult.triggers.forEach((item) => {
        const trigger = String(item.trigger || '').trim();
        const confidence = Number(item.confidence) || 0;
        if (!trigger) return;
        if (item.severity === 'forbidden' && confidence >= suggestThreshold) {
          appliedTriggers.push(buildTriggerRecord(trigger, confidence, 'gemini'));
          forbiddenReasons.push({ trigger, reason: 'Gemini classifier', score: confidence });
        } else if (confidence >= suggestThreshold) {
          suggestedTriggers.push(buildTriggerRecord(trigger, confidence, 'gemini'));
        }
      });
    }
    if (geminiResult?.forbiddenReasons?.length) {
      geminiResult.forbiddenReasons.forEach((reason) => {
        if (typeof reason === 'string' && reason.trim()) {
          forbiddenReasons.push({ trigger: 'gemini', reason: reason.trim(), score: 1 });
        }
      });
    }
  } catch (error) {
    logger.error('Gemini classifier fout.', error);
  }

  const outcome = forbiddenReasons.length
    ? 'forbidden'
    : suggestedTriggers.length
      ? 'suggested'
      : 'allowed';

  const response = {
    outcome,
    appliedTriggers,
    suggestedTriggers,
    forbiddenReasons,
    showSuggestionUI: suggestedTriggers.length > 0,
    canRequestReview: outcome === 'forbidden',
    reviewCaseId: null,
    fingerprints: buildFingerprint(parsed.buffer),
    legacy: {
      labels: labels.map((label) => label.description).filter(Boolean),
      isSensitive: outcome !== 'allowed',
    },
  };

  res.status(200).json(response);
});

export const config = {
  runtime: 'nodejs18',
};
