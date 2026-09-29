import { AnalysisResult, LocalImage, LocalizationResult } from './models';
export interface MatrixLocator { locate(image: LocalImage): Promise<LocalizationResult> }
export interface ResultInterpreter { interpret(localization: LocalizationResult): AnalysisResult }
// Extension boundary: replace only after an assay-specific calibration and validation protocol exists.
export class UncalibratedLocator implements MatrixLocator {
  async locate(_image: LocalImage): Promise<LocalizationResult> {
    return { status: 'pending-calibration', matrix: null, points: [] };
  }
}
export class UncalibratedInterpreter implements ResultInterpreter {
  interpret(localization: LocalizationResult): AnalysisResult {
    return {
      status: 'pending-calibration', localization,
      // No point count, geometry, control map or analytes have been confirmed.
      controls: [], signals: [],
      concentration: null, foodSafety: 'not-assessed',
    };
  }
}
export class LfaReader {
  constructor(private readonly locator: MatrixLocator = new UncalibratedLocator(), private readonly interpreter: ResultInterpreter = new UncalibratedInterpreter()) {}
  async analyze(image: LocalImage): Promise<AnalysisResult> {
    return this.interpreter.interpret(await this.locator.locate(image));
  }
}
