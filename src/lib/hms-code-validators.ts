// HMS Code Validators - Clinical code format validators.
// Provides validation + formatting + (where applicable) description for the
// standard clinical coding systems used across the HMS modules:
//   - ICD-10  (diagnoses)
//   - CPT     (procedures / billing)
//   - NDC     (National Drug Code)
//   - LOINC   (lab tests / observations)

export interface ValidationResult {
  valid: boolean;
  formatted?: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// ICD-10
// ---------------------------------------------------------------------------

/**
 * Common ICD-10 codes mapped to short human descriptions. This is a tiny
 * lookup so the validator can return a helpful description for the most
 * frequently entered codes; unknown-but-well-formed codes still validate OK.
 */
const ICD10_DESCRIPTIONS: Record<string, string> = {
  // Circulatory
  I10: 'Essential (primary) hypertension',
  I11: 'Hypertensive heart disease',
  I119: 'Hypertensive heart disease without heart failure',
  I20: 'Angina pectoris',
  I21: 'Acute myocardial infarction',
  I219: 'Acute myocardial infarction, unspecified',
  I25: 'Chronic ischemic heart disease',
  I251: 'Atherosclerotic heart disease',
  I2510: 'Atherosclerotic heart disease of native coronary artery without angina pectoris',
  I50: 'Heart failure',
  I509: 'Heart failure, unspecified',
  I48: 'Atrial fibrillation and flutter',
  I4891: 'Unspecified atrial fibrillation',
  // Endocrine
  E10: 'Type 1 diabetes mellitus',
  E11: 'Type 2 diabetes mellitus',
  E119: 'Type 2 diabetes mellitus without complications',
  E03: 'Other hypothyroidism',
  E039: 'Hypothyroidism, unspecified',
  E66: 'Overweight and obesity',
  E669: 'Obesity, unspecified',
  E78: 'Disorders of lipoprotein metabolism and other lipidemias',
  E785: 'Hyperlipidemia, unspecified',
  // Respiratory
  J00: 'Acute nasopharyngitis [common cold]',
  J01: 'Acute sinusitis',
  J019: 'Acute sinusitis, unspecified',
  J02: 'Acute pharyngitis',
  J029: 'Acute pharyngitis, unspecified',
  J03: 'Acute tonsillitis',
  J06: 'Acute upper respiratory infections of multiple and unspecified sites',
  J069: 'Acute upper respiratory infection, unspecified',
  J09: 'Influenza due to certain identified influenza viruses',
  J11: 'Influenza due to unidentified influenza virus',
  J111: 'Influenza with other respiratory manifestations',
  J20: 'Acute bronchitis',
  J209: 'Acute bronchitis, unspecified',
  J44: 'Other chronic obstructive pulmonary disease',
  J449: 'Chronic obstructive pulmonary disease, unspecified',
  J45: 'Asthma',
  J459: 'Asthma, unspecified',
  J4590: 'Unspecified asthma, uncomplicated',
  // Digestive
  K21: 'Gastro-esophageal reflux disease',
  K219: 'Gastro-esophageal reflux disease without esophagitis',
  K29: 'Gastritis and duodenitis',
  K297: 'Gastritis, unspecified',
  K35: 'Acute appendicitis',
  K359: 'Acute appendicitis, unspecified',
  // Nervous
  G43: 'Migraine',
  G439: 'Migraine, unspecified',
  G44: 'Other headache syndromes',
  G45: 'Transient cerebral ischemic attacks and related syndromes',
  R51: 'Headache',
  // Mental
  F32: 'Major depressive disorder, single episode',
  F329: 'Major depressive disorder, single episode, unspecified',
  F33: 'Major depressive disorder, recurrent',
  F339: 'Major depressive disorder, recurrent, unspecified',
  F41: 'Other anxiety disorders',
  F411: 'Generalized anxiety disorder',
  F419: 'Anxiety disorder, unspecified',
  F90: 'Attention-deficit hyperactivity disorders',
  F909: 'Attention-deficit hyperactivity disorder, unspecified type',
  // Musculoskeletal
  M54: 'Back pain',
  M545: 'Low back pain',
  M549: 'Backache, unspecified',
  M25: 'Other joint disorder, not elsewhere classified',
  M2550: 'Pain in unspecified joint',
  // Skin
  L20: 'Atopic dermatitis',
  L209: 'Atopic dermatitis, unspecified',
  L23: 'Allergic contact dermatitis',
  L24: 'Irritant contact dermatitis',
  L25: 'Unspecified contact dermatitis',
  L259: 'Unspecified contact dermatitis, unspecified cause',
  // Genitourinary
  N18: 'Chronic kidney disease (CKD)',
  N189: 'Chronic kidney disease, unspecified',
  N39: 'Other disorders of urinary system',
  N390: 'Urinary tract infection, site not specified',
  // Infections / parasitic
  A09: 'Infectious gastroenteritis and colitis, unspecified',
  B34: 'Viral infection of unspecified site',
  B349: 'Viral infection, unspecified',
  // Symptoms / signs
  R10: 'Abdominal pain',
  R104: 'Other and unspecified abdominal pain',
  R11: 'Nausea and vomiting',
  R112: 'Nausea with vomiting, unspecified',
  R05: 'Cough',
  R06: 'Abnormalities of breathing',
  R069: 'Unspecified abnormalities of breathing',
  R07: 'Pain in throat and chest',
  R079: 'Chest pain, unspecified',
  R50: 'Fever of other and unknown origin',
  R509: 'Fever, unspecified',
  R42: 'Dizziness and giddiness',
  // Injury
  S00: 'Superficial injury of head',
  S01: 'Open wound of head',
  S06: 'Intracranial injury',
  S72: 'Fracture of femur',
  S828: 'Fracture of other and unspecified parts of lower leg',
  // Factors influencing health
  Z00: 'Encounter for general examination without complaint, suspected or reported diagnosis',
  Z001: 'Encounter for general adult medical examination',
  Z0011: 'Encounter for routine child health examination',
  Z23: 'Encounter for immunization',
  Z79: 'Long term (current) drug therapy',
  Z794: 'Long term (current) use of insulin',
  Z79899: 'Other long term (current) drug therapy'
};

/**
 * Validate an ICD-10 code.
 * Format: letter A-Z, two digits, optional dot followed by 1-4 alphanumeric chars.
 * Examples: "I10", "E11.9", "E119", "J45.90", "Z00.11".
 *
 * Returns { valid, formatted, description }.
 * `formatted` normalizes the upper/lowercase and trailing dot:
 *   - "i10"      -> "I10"
 *   - "e11.9"    -> "E11.9"
 *   - "e119"     -> "E11.9"  (auto-inserts the conventional dot for well-known shapes)
 *   - "J45.901"  -> "J45.901"
 */
export function validateICD10(code: string): ValidationResult {
  if (!code || typeof code !== 'string') {
    return { valid: false };
  }
  const trimmed = code.trim().toUpperCase();

  // Strict regex per spec.
  const STRICT = /^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/;
  // Loose regex that allows the user to omit the dot (e.g. "E119").
  const LOOSE = /^([A-Z][0-9]{2})([0-9A-Z]{1,4})?$/;

  let formatted: string | undefined;
  let description: string | undefined;

  if (STRICT.test(trimmed)) {
    formatted = trimmed;
  } else if (LOOSE.test(trimmed)) {
    const m = LOOSE.exec(trimmed);
    if (m) {
      // Special case: when the loose match is exactly 4 chars (e.g. "E119"),
      // conventionally interpret as "E11.9".
      if (trimmed.length === 4) {
        formatted = `${m[1]}.${m[2]}`;
      } else if (trimmed.length > 4 && m[2]) {
        formatted = `${m[1]}.${m[2]}`;
      } else {
        formatted = m[1];
      }
    }
  }

  if (!formatted || !STRICT.test(formatted)) {
    return { valid: false };
  }

  // Description lookup: try the formatted code, then the trimmed code (covers
  // cases where the source map key uses the dotless form).
  description = ICD10_DESCRIPTIONS[formatted] || ICD10_DESCRIPTIONS[trimmed];

  return { valid: true, formatted, description };
}

// ---------------------------------------------------------------------------
// CPT
// ---------------------------------------------------------------------------

/**
 * Validate a CPT (Current Procedural Terminology) code.
 * CPT codes are 5 characters long. The vast majority are 5-digit numeric
 * strings (e.g. "99213"). Category III codes are 4 digits followed by a
 * letter (e.g. "0211T"). Modifier codes (2-char) are NOT validated here.
 */
export function validateCPT(code: string): ValidationResult {
  if (!code || typeof code !== 'string') {
    return { valid: false };
  }
  const trimmed = code.trim().toUpperCase();

  // Standard Category I: 5 digits.
  // Category III: 4 digits + 1 letter (typically T).
  const CPT_RE = /^[0-9]{5}$|^[0-9]{4}[A-Z]$/;
  if (!CPT_RE.test(trimmed)) {
    return { valid: false };
  }
  return { valid: true, formatted: trimmed };
}

// ---------------------------------------------------------------------------
// NDC (National Drug Code)
// ---------------------------------------------------------------------------

/**
 * Validate an NDC (National Drug Code).
 * NDCs are 10 or 11 digits and are commonly displayed in one of these
 * segment forms:
 *   - 5-4-2  (11 digits, e.g. "00310-0701-30")
 *   - 5-4-1  (10 digits, e.g. "00310-0701-3")
 *   - 5-3-2  (10 digits, e.g. "50090-017-20")
 *   - 4-4-2  (10 digits, e.g. "0299-3821-20")
 *   - 3-4-2  ( 9 digits, rare legacy, still accepted)
 *
 * The FDA moved to a uniform 11-digit (5-4-2) representation; the validator
 * accepts any of the common dash-separated forms and also an unsegmented
 * 10- or 11-digit string. The `formatted` field returns the canonical
 * 5-4-2 (11-digit) representation when possible.
 */
export function validateNDC(code: string): ValidationResult {
  if (!code || typeof code !== 'string') {
    return { valid: false };
  }
  const trimmed = code.trim();

  // Accept either:
  //   1) three numeric segments separated by dashes, OR
  //   2) a single unsegmented numeric string of 9, 10, or 11 digits.
  const SEGMENTED = /^([0-9]{1,5})-([0-9]{1,4})-([0-9]{1,2})$/;
  const PLAIN = /^([0-9]{9,11})$/;

  let labeler = '';
  let product = '';
  let packageCode = '';

  const seg = SEGMENTED.exec(trimmed);
  if (seg) {
    labeler = seg[1];
    product = seg[2];
    packageCode = seg[3];
  } else {
    const plain = PLAIN.exec(trimmed);
    if (!plain) {
      return { valid: false };
    }
    const digits = plain[1];
    // Distribute digits according to the most common 5-4-2 / 5-4-1 / 5-3-2 layouts.
    if (digits.length === 11) {
      labeler = digits.slice(0, 5);
      product = digits.slice(5, 9);
      packageCode = digits.slice(9, 11);
    } else if (digits.length === 10) {
      labeler = digits.slice(0, 5);
      product = digits.slice(5, 8); // 3
      packageCode = digits.slice(8, 10); // 2 (5-3-2 layout)
    } else {
      // 9-digit legacy: assume 5-3-1
      labeler = digits.slice(0, 5);
      product = digits.slice(5, 8);
      packageCode = digits.slice(8, 9);
    }
  }

  // Sanity: each segment must fit within its FDA bounds.
  if (labeler.length < 1 || labeler.length > 5) return { valid: false };
  if (product.length < 1 || product.length > 4) return { valid: false };
  if (packageCode.length < 1 || packageCode.length > 2) return { valid: false };

  // Canonical 5-4-2 form: zero-pad each segment.
  const formatted = `${labeler.padStart(5, '0')}-${product.padStart(4, '0')}-${packageCode.padStart(2, '0')}`;

  const description = `Labeler ${labeler.padStart(5, '0')} • Product ${product.padStart(4, '0')} • Package ${packageCode.padStart(2, '0')}`;

  return { valid: true, formatted, description };
}

// ---------------------------------------------------------------------------
// LOINC
// ---------------------------------------------------------------------------

/**
 * Validate a LOINC (Logical Observation Identifiers Names and Codes) code.
 * LOINC codes have the form `nnnn-n` where the prefix is 1-7 digits and the
 * suffix is a single check digit (0-9). Examples: "2339-0", "3094-0",
 * "2951-2", "33762-9".
 *
 * Note: LOINC publishes check digits alongside each code, but the official
 * computation algorithm is not consistently documented in the public spec.
 * Several variants exist (Luhn, ISO 6346, Verhoeff) and the registry
 * ultimately treats the suffix as authoritative. This validator therefore
 * only checks the SHAPE of the code; consumers should rely on the LOINC
 * database itself for canonical correctness.
 */
export function validateLOINC(code: string): ValidationResult {
  if (!code || typeof code !== 'string') {
    return { valid: false };
  }
  const trimmed = code.trim().toUpperCase();

  // Strip a leading "LOINC:" prefix if present.
  const cleaned = trimmed.replace(/^LOINC\s*:\s*/, '');
  const LOINC_RE = /^[0-9]{1,7}-[0-9]$/;
  if (!LOINC_RE.test(cleaned)) {
    return { valid: false };
  }

  return { valid: true, formatted: cleaned };
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export const CodeValidators = {
  validateICD10,
  validateCPT,
  validateNDC,
  validateLOINC
};

export default CodeValidators;
