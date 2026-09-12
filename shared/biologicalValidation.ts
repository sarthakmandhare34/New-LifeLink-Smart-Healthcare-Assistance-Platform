// --- Cluster: Female-Exclusive Biological Terms ---
// Keywords and conditions that exclusively pertain to biological female anatomy.
const FEMALE_EXCLUSIVE_PATTERNS = [
  /\bpregnan(?:cy|t)\b/i,                                        // Pregnancy keywords
  /\b(?:missed|late|heavy|irregular|delayed|skipped|painful|no|first)?\s*periods?\b/i, // Menstrual cycle references
  /\bperiods?\s*(?:missed|late|delay|pain|cramp|flow|cycle|spotting)?\b/i, // Menstrual period indicators
  /\bmenstrua(?:tion|l)?\b/i,                                    // Menstruation keywords
  /\bamenorrhea\b/i,                                             // Absence of menstruation
  /\bovar(?:y|ies|ian)\b/i,                                      // Ovarian anatomy / conditions
  /\buter(?:us|ine)\b/i,                                         // Uterine anatomy / fibroids
  /\bcervi(?:x|cal)\b/i,                                         // Cervix / cervical health
  /\bmiscarriage|abortion\b/i,                                   // Pregnancy loss / termination
  /\bmenopaus(?:e|al)\b/i,                                       // Menopause indicators
  /\bvagin(?:a|al)\b/i,                                          // Vaginal anatomy
  /\bvulv(?:a|al)\b/i,                                           // Vulvar anatomy
  /\bfallopian\b/i,                                              // Fallopian tube conditions
  /\bendometriosis\b/i,                                          // Endometriosis tissue disorder
  /\bpcos\b|polycystic(?:\s+ovary)?/i,                           // Polycystic Ovary Syndrome
  /\bbreastfeeding|lactating\b/i,                                 // Lactation references
  /\bmorning sickness\b/i,                                       // Early pregnancy nausea symptom
  /\bgynecolog(?:y|ist|ical)\b/i,                                // Gynecology specialty terms
];

// --- Cluster: Male-Exclusive Biological Terms ---
// Keywords and conditions that exclusively pertain to biological male anatomy.
const MALE_EXCLUSIVE_PATTERNS = [
  /\bprostat(?:e|ic)\b/i,                                        // Prostate gland conditions (BPH, prostatitis)
  /\btestic(?:le|les|ular)\b/i,                                  // Testicles / testicular health
  /\bpen(?:is|ile)\b/i,                                          // Penile anatomy
  /\bscrot(?:um|al)\b/i,                                         // Scrotal anatomy
  /\bforeskin\b/i,                                               // Foreskin references
  /\bcircumci(?:sion|sed)\b/i,                                   // Circumcision references
  /\bsemen|seminal\b/i,                                          // Semen / seminal fluid
  /\bepididymis\b/i,                                             // Epididymitis / epididymal tube
  /\berectile dysfunction\b/i,                                   // Male erectile dysfunction (ED)
  /\berection\b/i                                                // Erection references
];

// --- Cluster: Biological Consistency Validator ---
// Prevents biologically impossible symptom assignments before calling Gemini AI.
// Returns an error message if symptoms contradict stated biological gender, or null if valid.
export function checkBiologicalImpossibility(symptoms: string, gender: string): string | null {
  if (!symptoms || !gender) return null;                         // Skip validation if input is empty
  const text = symptoms.trim();                                  // Clean input whitespace
  
  if (gender.toLowerCase() === 'male' || gender.toLowerCase() === 'man') {
    // Exemption: Male breast tissue enlargement (Gynecomastia) & male hormone issues are valid for males!
    if (/\b(?:gynecomast\w*|male\s+breast\w*|galactorrhea|andropause|hypogonadism|male\s+infertility|prostat\w*|testic\w*|scrot\w*|penis|penile|erectile\s+dysfunction)\b/i.test(text)) {
      return null;                                               // Legitimate male condition, allow evaluation
    }
    // Flag biologically impossible female conditions for male users (e.g. male pregnancy)
    if (FEMALE_EXCLUSIVE_PATTERNS.some(p => p.test(text))) {
      return `The symptoms described contain female-specific biological references which are inconsistent with the selected '${gender}' gender. Please correct your inputs.`;
    }
  }

  if (gender.toLowerCase() === 'female' || gender.toLowerCase() === 'woman') {
    // Flag biologically impossible male conditions for female users (e.g. female prostate pain)
    if (MALE_EXCLUSIVE_PATTERNS.some(p => p.test(text))) {
      return `The symptoms described contain male-specific biological references which are inconsistent with the selected '${gender}' gender. Please correct your inputs.`;
    }
  }

  return null;                                                   // Symptoms are biologically consistent
}
