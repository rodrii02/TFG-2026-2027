export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';
export interface LocalImage {
  readonly url: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly format: ImageFormat;
  readonly source: 'file' | 'camera' | 'gallery' | 'example';
  readonly preparation?: { readonly originalWidth: number; readonly originalHeight: number; readonly resized: boolean };
}
export interface QualityCheck {
  readonly id: 'format' | 'dimensions' | 'focus' | 'lighting' | 'framing' | 'python';
  readonly label: string;
  readonly status: 'checked' | 'pending' | 'failed';
  readonly detail: string;
}
export interface QualityReport {
  readonly outcome: 'valid' | 'invalid' | 'indeterminate';
  readonly technicallyReadable: boolean;
  readonly scope: 'technical-file';
  readonly validator?: 'python-pillow-opencv-v1';
  readonly message?: string;
  readonly checks: readonly QualityCheck[];
}
export interface LocalizationResult {
  readonly status: 'pending-calibration';
  readonly matrix: null;
  readonly points: readonly never[];
}
export interface AnalysisResult {
  readonly status: 'pending-calibration';
  readonly controls: readonly never[];
  readonly signals: readonly never[];
  readonly localization: LocalizationResult;
  readonly concentration: null;
  readonly foodSafety: 'not-assessed';
}
