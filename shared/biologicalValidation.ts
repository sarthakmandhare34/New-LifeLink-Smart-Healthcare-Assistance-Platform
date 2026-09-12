const FEMALE_EXCLUSIVE_PATTERNS = [
  /\bpregnan(?:cy|t)\b/i,
  /\b(?:missed|late|heavy|irregular|delayed|skipped|painful|no|first)?\s*periods?\b/i,
  /\bperiods?\s*(?:missed|late|delay|pain|cramp|flow|cycle|spotting)?\b/i,
  /\bmenstrua(?:tion|l)?\b/i,
  /\bamenorrhea\b/i,
  /\bovar(?:y|ies|ian)\b/i,
  /\buter(?:us|ine)\b/i,
  /\bcervi(?:x|cal)\b/i,
  /\bmiscarriage|abortion\b/i,
  /\bmenopaus(?:e|al)\b/i,
  /\bvagin(?:a|al)\b/i,
  /\bvulv(?:a|al)\b/i,
  /\bfallopian\b/i,
  /\bendometriosis\b/i,
  /\bpcos\b|polycystic(?:\s+ovary)?/i,
  /\bbreastfeeding|lactating\b/i,
  /\bmorning sickness\b/i,
  /\bgynecolog(?:y|ist|ical)\b/i,
];

const MALE_EXCLUSIVE_PATTERNS = [
  /\bprostat(?:e|ic)\b/i,
  /\btestic(?:le|les|ular)\b/i,
  /\bpen(?:is|ile)\b/i,
  /\bscrot(?:um|al)\b/i,
  /\bforeskin\b/i,
  /\bcircumci(?:sion|sed)\b/i,
  /\bsemen|seminal\b/i,
  /\bepididymis\b/i,
  /\berectile dysfunction\b/i,
  /\berection\b/i
];

export function checkBiologicalImpossibility(symptoms: string, gender: string): string | null {
  if (!symptoms || !gender) return null;
  const text = symptoms.trim();
  
  if (gender.toLowerCase() === 'male' || gender.toLowerCase() === 'man') {
    // Valid male medical conditions (male breast, hormonal, fertility, or urological)
    if (/\b(?:gynecomast\w*|male\s+breast\w*|galactorrhea|andropause|hypogonadism|male\s+infertility|prostat\w*|testic\w*|scrot\w*|penis|penile|erectile\s+dysfunction)\b/i.test(text)) {
      return null;
    }
    if (FEMALE_EXCLUSIVE_PATTERNS.some(p => p.test(text))) {
      return `The symptoms described contain female-specific biological references which are inconsistent with the selected '${gender}' gender. Please correct your inputs.`;
    }
  }

  if (gender.toLowerCase() === 'female' || gender.toLowerCase() === 'woman') {
    if (MALE_EXCLUSIVE_PATTERNS.some(p => p.test(text))) {
      return `The symptoms described contain male-specific biological references which are inconsistent with the selected '${gender}' gender. Please correct your inputs.`;
    }
  }

  return null;
}
