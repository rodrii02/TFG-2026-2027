import { describe, expect, it } from 'vitest';
import { LfaReader } from './lfa-reader';
import { LocalImage } from './models';
const image: LocalImage = { url:'blob:sample', name:'synthetic.png', width:1200, height:800, bytes:3000, format:'image/png', source:'example' };
describe('Uncalibrated LFA pipeline', () => {
  it('never creates signals, concentrations, analytes or a food safety verdict', async () => {
    const result = await new LfaReader().analyze(image);
    expect(result.status).toBe('pending-calibration');
    expect(result.localization).toEqual({status:'pending-calibration',matrix:null,points:[]});
    expect(result.concentration).toBeNull();
    expect(result.foodSafety).toBe('not-assessed');
    expect(result.controls).toEqual([]); expect(result.signals).toEqual([]);
  });
  it('does not derive different scientific outcomes from different image metadata', async () => {
    const reader = new LfaReader();
    expect(await reader.analyze(image)).toEqual(await reader.analyze({ ...image, source:'camera', width:4000, name:'real-photo.jpg' }));
  });
});
