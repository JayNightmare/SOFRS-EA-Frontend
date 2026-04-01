/** The role selected on the Welcome screen. */
export type UserRole = 'employee' | 'visitor';

/** Face capture position during the scan flow. */
export type FaceCapturePosition = 'front' | 'left' | 'right' | 'up' | 'down';

/** Ordered list of all capture positions. */
export const FACE_POSITIONS: FaceCapturePosition[] = [
  'front',
  'left',
  'right',
  'up',
  'down',
];

/** Human-readable instructions for each scan position. */
export const POSITION_INSTRUCTIONS: Record<FaceCapturePosition, string> = {
  front: 'Look straight ahead',
  left: 'Turn your head to the left',
  right: 'Turn your head to the right',
  up: 'Tilt your head upward',
  down: 'Tilt your head downward',
};

/** Data collected during identity verification. */
export interface UserData {
  role: UserRole;
  fullName: string;
  idNumber: string;
  /** Visitor-only: name of the employee companion. */
  companionName?: string;
  /** Visitor-only: optional phone number. */
  phone?: string;
}

/** One captured face image produced by the mobile camera flow. */
export interface FaceCaptureAsset {
  uri?: string;
  base64?: string;
  simulated?: boolean;
}

/** Stores captured face images keyed by position. */
export type FaceScanResult = Partial<Record<FaceCapturePosition, FaceCaptureAsset>>;
